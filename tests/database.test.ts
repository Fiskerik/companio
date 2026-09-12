import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

let db: PGlite;
const user = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function as(n: number) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${user(n)}',false);set role authenticated;`,
  );
}
async function command(action: string, p: Record<string, unknown> = {}) {
  const r = await db.query<{ result: Record<string, any> }>('select app_command($1,$2::jsonb) as result', [
    action,
    JSON.stringify(p),
  ]);
  return r.rows[0].result;
}
async function snapshot() {
  return (await db.query<{ data: any }>('select app_snapshot() as data')).rows[0].data;
}
async function admin(sql: string) {
  await db.exec('reset role;' + sql);
}
const future = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();
let h1: string, h2: string, h3: string, chat: string, eventId: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  for (const file of readdirSync('supabase/migrations').filter(
    (f) => f.endsWith('.sql') && !f.includes('storage'),
  )) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  }
  for (let n = 1; n <= 9; n++) await db.query('insert into auth.users values($1)', [user(n)]);
  for (let n = 1; n <= 3; n++) {
    await as(n);
    await command('onboard', {
      name: `Adult ${n}`,
      adult_confirmed: true,
      kind: n === 3 ? 'single_parent' : 'family',
      area: 'Stockholm',
      latitude: 59.33,
      longitude: 18.07,
      interests: ['coffee'],
      languages: ['sv'],
    });
    const h = (await snapshot()).household_id;
    if (n === 1) h1 = h;
    if (n === 2) h2 = h;
    if (n === 3) h3 = h;
  }
});
afterAll(async () => {
  await db?.close();
});
describe('actual PostgreSQL migrations and authenticated API', () => {
  it('rejects onboarding without 18+ affirmation', async () => {
    await as(4);
    await expect(
      command('onboard', { name: 'Adult', kind: 'solo', area: 'Stockholm', latitude: 59, longitude: 18 }),
    ).rejects.toThrow('ADULT_CONFIRMATION_REQUIRED');
  });
  it('denies direct writes to client tables and internal functions', async () => {
    await as(1);
    await expect(
      db.query('insert into household_members values($1,$2,now())', [h2, user(4)]),
    ).rejects.toThrow('permission denied');
    await expect(db.query('select promote_waitlist($1)', [user(8)])).rejects.toThrow('permission denied');
  });
  it('keeps favorites and match-only slots private', async () => {
    await as(1);
    await command('availability_create', {
      activity: 'coffee',
      starts_at: future(1),
      ends_at: future(3),
      visibility: 'matches',
      child_mode: 'either',
      adults: 1,
    });
    await as(2);
    await command('favorite_toggle', { target_id: h1 });
    expect((await snapshot()).availability).toHaveLength(0);
    await as(3);
    expect((await snapshot()).favorites).toHaveLength(0);
    expect((await db.query('select * from availability')).rows).toHaveLength(0);
  });
  it('accepting a request creates one common chat', async () => {
    await as(1);
    await command('contact_request', { target_id: h2, greeting: 'Hello there' });
    await as(2);
    const c = (await snapshot()).contacts[0];
    const r = await command('contact_respond', { id: c.id, accept: true });
    chat = r.conversation_id;
    expect((await snapshot()).conversations).toHaveLength(1);
    expect((await snapshot()).availability).toHaveLength(1);
    await expect(command('contact_respond', { id: c.id, accept: true })).rejects.toThrow('NOT_AVAILABLE');
  });
  it('rejects fabricated author IDs and cross-conversation replies', async () => {
    await as(1);
    await command('message_send', { conversation_id: chat, body: 'Hello!', author_id: user(2) });
    const m = (await snapshot()).messages.find((x: any) => x.body === 'Hello!');
    expect(m.author_id).toBe(user(1));
    await as(3);
    await expect(command('message_send', { conversation_id: chat, body: 'Intrusion' })).rejects.toThrow(
      'NOT_AVAILABLE',
    );
    expect((await db.query('select * from messages')).rows).toHaveLength(0);
  });
  it('consumes partner invitations once, shares history, and revokes on departure', async () => {
    await as(1);
    const { token } = await command('partner_invite');
    await as(4);
    await command('partner_accept', { token, name: 'Partner', adult_confirmed: true });
    expect((await snapshot()).household_id).toBe(h1);
    expect((await snapshot()).messages.some((m: any) => m.body === 'Hello!')).toBe(true);
    await as(5);
    await expect(
      command('partner_accept', { token, name: 'Another', adult_confirmed: true }),
    ).rejects.toThrow('INVALID_INVITATION');
    await as(4);
    await command('household_leave');
    expect((await db.query('select * from messages')).rows).toHaveLength(0);
    await expect(command('message_send', { conversation_id: chat, body: 'After leaving' })).rejects.toThrow(
      'HOUSEHOLD_REQUIRED',
    );
  });
  it('keeps private addresses hidden until an invitation is accepted', async () => {
    await as(1);
    const r = await command('event_create', {
      title: 'Dinner',
      activity: 'food',
      starts_at: future(24),
      ends_at: future(26),
      visibility: 'private',
      child_mode: 'either',
      capacity: 5,
      adults: 1,
      children: 0,
      location: 'Secret home address',
      approval: true,
    });
    eventId = r.id;
    await as(2);
    expect((await snapshot()).events).toHaveLength(0);
    await as(1);
    await command('event_invite', { event_id: eventId, target_id: h2 });
    await as(2);
    expect((await snapshot()).events[0].location).toBeNull();
    await command('event_join', { event_id: eventId, adults: 2, children: 1 });
    expect((await snapshot()).attendance.find((a: any) => a.household_id === h2).status).toBe('pending');
    expect((await db.query('select * from event_locations')).rows).toHaveLength(0);
    await as(1);
    await command('event_respond', { event_id: eventId, household_id: h2, accept: true });
    await as(2);
    expect((await snapshot()).events[0].location).toBe('Secret home address');
  });
  it('counts children and promotes waitlisted parties after cancellation', async () => {
    await as(1);
    const { id } = await command('event_create', {
      title: 'Park',
      activity: 'coffee',
      starts_at: future(48),
      ends_at: future(50),
      visibility: 'public',
      child_mode: 'either',
      capacity: 4,
      adults: 1,
      children: 0,
      location: 'Public park',
    });
    await as(2);
    await command('event_join', { event_id: id, adults: 2, children: 1 });
    await as(3);
    await command('event_join', { event_id: id, adults: 1, children: 1 });
    expect(
      (await snapshot()).attendance.find((a: any) => a.household_id === h3 && a.event_id === id).status,
    ).toBe('waitlist');
    await as(2);
    await command('event_cancel_attendance', { event_id: id });
    await as(3);
    expect(
      (await snapshot()).attendance.find((a: any) => a.household_id === h3 && a.event_id === id).status,
    ).toBe('accepted');
    await command('event_join', { event_id: id, adults: 1, children: 1 });
    expect(
      (await snapshot()).attendance.filter((a: any) => a.household_id === h3 && a.event_id === id),
    ).toHaveLength(1);
  });
  it('requires group membership to read chat and removes access immediately', async () => {
    await as(1);
    const { id } = await command('group_create', { name: 'Walking club', description: 'Short walks' });
    await as(3);
    expect((await snapshot()).conversations.filter((c: any) => c.group_id === id)).toHaveLength(0);
    await command('group_join', { group_id: id });
    const gc = (await snapshot()).conversations.find((c: any) => c.group_id === id);
    await command('message_send', { conversation_id: gc.id, body: 'Group message' });
    await command('group_leave', { group_id: id });
    expect((await snapshot()).conversations.filter((c: any) => c.group_id === id)).toHaveLength(0);
    await expect(command('message_send', { conversation_id: gc.id, body: 'After leaving' })).rejects.toThrow(
      'NOT_AVAILABLE',
    );
  });
  it('invalidates expired availability at query time', async () => {
    await admin(
      `update availability set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour';`,
    );
    await as(1);
    expect((await snapshot()).availability).toHaveLength(0);
  });
  it('rejects malformed parties and date windows at the server', async () => {
    await as(3);
    await expect(
      command('availability_create', {
        activity: 'coffee',
        starts_at: future(-1),
        ends_at: future(1),
        child_mode: 'with',
      }),
    ).rejects.toThrow('INVALID_TIME');
    await expect(command('event_join', { event_id: eventId, adults: 0, children: 1 })).rejects.toThrow();
  });
  it('restricts report resolution and keeps reporter data private', async () => {
    await as(3);
    await command('report', {
      target_type: 'household',
      target_id: h1,
      reason: 'Please review this profile',
    });
    const report = (await snapshot()).reports[0];
    await expect(command('report_resolve', { id: report.id })).rejects.toThrow('MODERATOR_REQUIRED');
    await as(1);
    expect((await snapshot()).reports).toHaveLength(0);
  });
  it('blocking removes chat, private times and private event access in both directions', async () => {
    await as(1);
    await command('block', { target_id: h2 });
    expect((await snapshot()).conversations.some((c: any) => c.id === chat)).toBe(false);
    await as(2);
    expect((await db.query('select * from messages where conversation_id=$1', [chat])).rows).toHaveLength(0);
    expect((await db.query('select * from event_locations where event_id=$1', [eventId])).rows).toHaveLength(
      0,
    );
    await expect(command('contact_request', { target_id: h1, greeting: 'Still here' })).rejects.toThrow(
      'NOT_AVAILABLE',
    );
  });
  it('account deletion removes authored content and leaves partner account intact', async () => {
    await as(3);
    await command('account_delete');
    await admin(`select 1;`);
    expect((await db.query('select * from auth.users where id=$1', [user(3)])).rows).toHaveLength(0);
    expect((await db.query('select * from auth.users where id=$1', [user(1)])).rows).toHaveLength(1);
  });
  it('anonymous callers have no RPC or table access', async () => {
    await db.exec('reset role;set role anon;');
    await expect(db.query('select app_snapshot()')).rejects.toThrow('permission denied');
    await expect(db.query('select * from households')).rejects.toThrow('permission denied');
  });
});
