import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw Error(`Missing ${key}`);
  return value;
};
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
async function appleToken() {
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: env('APNS_KEY_ID') })),
  );
  const claims = base64url(
    new TextEncoder().encode(
      JSON.stringify({ iss: env('APPLE_TEAM_ID'), iat: Math.floor(Date.now() / 1000) }),
    ),
  );
  const pem = env('APNS_PRIVATE_KEY')
    .replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
}
async function sameSecret(a: string, b: string) {
  const digest = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  const bx = new Uint8Array(x),
    by = new Uint8Array(y);
  return bx.reduce((n, v, i) => n | (v ^ by[i]), 0) === 0;
}
Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || !(await sameSecret(request.headers.get('Authorization') || '', `Bearer ${secret}`)))
    return new Response('Unauthorized', { status: 401 });
  try {
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
    // Delete storage files queued when an account or media record was deleted.
    const cleanup = await db.from('storage_deletion_queue').select('path').limit(100);
    if (cleanup.error) throw cleanup.error;
    for (const item of cleanup.data || []) {
      const r = await db.storage.from('media').remove([item.path]);
      if (!r.error) await db.from('storage_deletion_queue').delete().eq('path', item.path);
    }
    if (
      !Deno.env.get('APNS_PRIVATE_KEY') ||
      !Deno.env.get('APNS_KEY_ID') ||
      !Deno.env.get('APPLE_TEAM_ID') ||
      !Deno.env.get('BUNDLE_ID')
    )
      return Response.json({ cleanup: true, push: 'not configured' }, { status: 503 });
    const jwt = await appleToken();
    const batch = await db.rpc('push_batch');
    if (batch.error) throw batch.error;
    const endpoint =
      Deno.env.get('APNS_SANDBOX') === 'true'
        ? 'https://api.sandbox.push.apple.com'
        : 'https://api.push.apple.com';
    let sent = 0,
      failed = 0;
    for (const notification of batch.data || []) {
      let ok = true;
      for (const device of notification.tokens) {
        if (device.platform !== 'ios') continue;
        const response = await fetch(`${endpoint}/3/device/${encodeURIComponent(device.token)}`, {
          method: 'POST',
          headers: {
            Authorization: `bearer ${jwt}`,
            'apns-topic': env('BUNDLE_ID'),
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'apns-collapse-id': notification.id,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aps: {
              alert: {
                title: 'Companio',
                body: 'Du har en uppdatering i Companio. / You have an update in Companio.',
              },
              sound: 'default',
            },
            kind: notification.kind,
            reference_id: notification.reference_id,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (response.status === 410) {
          await db.from('device_tokens').delete().eq('token', device.token);
        } else if (!response.ok) ok = false;
      }
      if (ok) {
        const ack = await db.rpc('push_ack', { p_id: notification.id });
        if (ack.error) throw ack.error;
        sent++;
      } else failed++;
    }
    // Log only aggregate counts, never messages, names, addresses, or device tokens.
    return Response.json({ sent, failed });
  } catch {
    console.error('Notification worker failed; inspect configuration and provider health.');
    return Response.json({ error: 'Worker unavailable' }, { status: 503 });
  }
});
