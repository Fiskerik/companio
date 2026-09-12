import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const apple = { BUNDLE_ID: 'com.fiskerik.companio', APP_STORE_APPLE_ID: '123456789' };
const connected = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_example',
  EXPO_PUBLIC_SUPPORT_EMAIL: 'support@example.com',
  EXPO_PUBLIC_PRIVACY_URL: 'https://example.com/privacy',
};
function validate(mode: string, values: Record<string, string>) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith('EXPO_PUBLIC_') && !Object.hasOwn(apple, key),
    ),
  );
  return execFileSync(process.execPath, ['scripts/check-env.mjs', mode], {
    env: { ...env, NODE_ENV: 'test', ...values },
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

describe('TestFlight login configuration', () => {
  it('ships the temporary skip-login option with the TestFlight validator', () => {
    const workflow = parse(readFileSync('codemagic.yaml', 'utf8')).workflows['ios-testflight'];
    expect(workflow.environment.vars.EXPO_PUBLIC_DEMO_ENABLED).toBe('true');
    expect(
      workflow.scripts.some(
        (step: { script: string }) => step.script === 'node scripts/check-env.mjs --testflight',
      ),
    ).toBe(true);
  });
  it('allows local TestFlight previews without backend credentials', () => {
    expect(validate('--testflight', { ...apple, EXPO_PUBLIC_DEMO_ENABLED: 'true' })).toContain('Demo build');
  });
  it('still requires Apple configuration for a local TestFlight preview', () => {
    expect(() => validate('--testflight', { EXPO_PUBLIC_DEMO_ENABLED: 'true' })).toThrow();
  });
  it('requires backend configuration when login is re-enabled', () => {
    expect(() => validate('--testflight', { ...apple, EXPO_PUBLIC_DEMO_ENABLED: 'false' })).toThrow();
    expect(validate('--testflight', { ...apple, ...connected, EXPO_PUBLIC_DEMO_ENABLED: 'false' })).toContain(
      'Connected build',
    );
  });
  it('keeps local demo disabled for public releases', () => {
    expect(() =>
      validate('--release', { ...apple, ...connected, EXPO_PUBLIC_DEMO_ENABLED: 'true' }),
    ).toThrow();
    expect(validate('--release', { ...apple, ...connected, EXPO_PUBLIC_DEMO_ENABLED: 'false' })).toContain(
      'Connected build',
    );
  });
});
