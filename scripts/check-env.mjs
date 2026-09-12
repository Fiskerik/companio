const release = process.argv.includes('--release');
const demo = process.env.EXPO_PUBLIC_DEMO_ENABLED !== 'false';
const required =
  release || !demo
    ? [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_SUPPORT_EMAIL',
        'EXPO_PUBLIC_PRIVACY_URL',
      ]
    : [];
if (release) required.push('BUNDLE_ID', 'APP_STORE_APPLE_ID');
const missing = required.filter((k) => !process.env[k]);
if (release && demo) missing.push('EXPO_PUBLIC_DEMO_ENABLED=false');
if (missing.length) {
  console.error(`Configuration needed: ${missing.join(', ')}`);
  process.exit(1);
}
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (key?.startsWith('sb_secret_'))
  throw Error('Never expose a Supabase secret key in EXPO_PUBLIC variables.');
if (key?.split('.').length === 3) {
  try {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    if (claims.role === 'service_role') throw Error('Server key detected');
  } catch (e) {
    console.error('Invalid or privileged public key. Use the publishable/anon key.');
    process.exit(1);
  }
}
if (
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(process.env.EXPO_PUBLIC_SUPABASE_URL)
)
  throw Error('Use the project HTTPS Supabase URL. Update the CSP explicitly before using a custom domain.');
if ((release || !demo) && !process.env.EXPO_PUBLIC_PRIVACY_URL?.startsWith('https://'))
  throw Error('A published HTTPS privacy policy is required.');
console.log(
  demo
    ? 'Demo build: example data is explicitly labeled.'
    : 'Connected build: public configuration is present.',
);
