import { Client } from 'pg';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const connectionString = process.env.TEST_DATABASE_URL;
// Only the disposable GitHub Actions database is used. No cleanup/drop of existing databases.
describe.skipIf(!connectionString)('concurrent PostgreSQL bookings', () => {
  const admin = new Client({ connectionString });
  const clients: Client[] = [];
  const user = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const command = async (client: Client, action: string, payload: object) =>
    (await client.query('select app_command($1,$2::jsonb) as result', [action, JSON.stringify(payload)]))
      .rows[0].result;

  beforeAll(async () => {
    const url = new URL(connectionString!);
    if (!url.pathname.endsWith('_test') || !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname)) {
      throw Error('TEST_DATABASE_URL must point to a local disposable database ending in _test');
    }
    await admin.connect();
    if ((await admin.query("select to_regclass('public.households') as existing")).rows[0].existing) {
      throw Error('Use a fresh empty test database. This test never drops existing data.');
    }
    await admin.query(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    for (const file of readdirSync('supabase/migrations')
      .filter((f) => f.endsWith('.sql') && !f.includes('storage'))
      .sort()) {
      await admin.query(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    }
    for (let n = 1; n <= 3; n++) {
      await admin.query('insert into auth.users values($1)', [user(n)]);
      const client = new Client({ connectionString });
      await client.connect();
      clients.push(client);
      await client.query("select set_config('request.jwt.claim.sub',$1,false)", [user(n)]);
      await client.query('set role authenticated');
      await command(client, 'onboard', {
        name: `Adult ${n}`,
        adult_confirmed: true,
        kind: 'couple',
        area: 'Stockholm',
        latitude: 59.33,
        longitude: 18.07,
        interests: ['coffee'],
        languages: ['sv'],
      });
    }
  });
  afterAll(async () => {
    await Promise.all(clients.map((c) => c.end()));
    await admin.end();
  });

  it('serializes two transactions competing for one remaining seat', async () => {
    const { id } = await command(clients[0], 'event_create', {
      title: 'One remaining seat',
      activity: 'coffee',
      visibility: 'public',
      child_mode: 'without',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      capacity: 2,
      adults: 1,
      children: 0,
      location: 'Public café',
    });
    // Keep the first booking transaction open while the second is actively waiting for its row lock.
    await clients[1].query('begin');
    await command(clients[1], 'event_join', { event_id: id, adults: 1, children: 0 });
    const second = command(clients[2], 'event_join', { event_id: id, adults: 1, children: 0 });
    try {
      await clients[1].query('commit');
      await second;
    } catch (error) {
      await clients[1].query('rollback');
      throw error;
    }
    const { rows } = await admin.query(
      'select status, sum(adults+children)::int as people from attendance where event_id=$1 group by status',
      [id],
    );
    expect(rows.find((r) => r.status === 'accepted')?.people).toBe(2);
    expect(rows.find((r) => r.status === 'waitlist')?.people).toBe(1);
  });
});
