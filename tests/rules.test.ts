import { describe, it, expect } from 'vitest';
import { createDemo, demoCommand } from '../src/data/demo';
import {
  canSeeAvailability,
  compatibleChildren,
  distanceKm,
  matchingHouseholds,
  seatsAvailable,
  validateParty,
  validateWindow,
} from '../src/domain/rules';
import { parseLocalInput, localInput, dictionary } from '../src/i18n';
describe('household discovery and privacy', () => {
  it('a favorite does not reveal availability without a match', () => {
    const s = createDemo();
    const slot = s.availability.find((x) => x.household_id === 'h3')!;
    s.favorites.push({ household_id: 'me', target_id: 'h3', notify: false });
    expect(canSeeAvailability(s, slot)).toBe(false);
  });
  it('expires availability and respects blocking even after matching', () => {
    const s = createDemo();
    const slot = s.availability.find((x) => x.household_id === 'h2')!;
    expect(canSeeAvailability(s, slot)).toBe(true);
    expect(canSeeAvailability(s, slot, Date.parse(slot.ends_at))).toBe(false);
    s.blocked_ids.push('h2');
    expect(canSeeAvailability(s, slot)).toBe(false);
  });
  it('separates family composition from attending without children', () => {
    const s = createDemo();
    s.households[0].child_mode = 'without';
    expect(matchingHouseholds(s).some((m) => m.household.kind === 'family')).toBe(true);
    expect(compatibleChildren('with', 'without')).toBe(false);
    expect(compatibleChildren('either', 'without')).toBe(true);
  });
  it('never silently widens distance or household preferences', () => {
    const s = createDemo();
    s.households[0].radius_km = 1;
    s.households[0].preferred_kinds = ['couple'];
    expect(matchingHouseholds(s).every((m) => m.distance <= 1 && m.household.kind === 'couple')).toBe(true);
  });
  it('excludes solo adults from household matching', () => {
    const s = createDemo();
    s.households[0].kind = 'solo';
    expect(matchingHouseholds(s)).toEqual([]);
  });
  it('only compares availability the viewer can access', () => {
    const s = createDemo();
    const slot = s.availability.find((x) => x.household_id === 'h3')!;
    const mine = s.availability.find((x) => x.household_id === 'me')!;
    mine.starts_at = slot.starts_at;
    mine.ends_at = slot.ends_at;
    expect(matchingHouseholds(s).find((m) => m.household.id === 'h3')?.sharedTime).toBe(false);
  });
  it('counts all people and validates whole-number parties', () => {
    expect(
      seatsAvailable(8, [
        { adults: 2, children: 3, status: 'accepted' },
        { adults: 2, children: 1, status: 'waitlist' },
      ]),
    ).toBe(3);
    expect(validateParty(1.5, 0)).toBe(false);
    expect(validateParty(0, 2)).toBe(false);
    expect(validateParty(1, 2)).toBe(true);
  });
  it('rejects malformed dates and expired windows', () => {
    expect(parseLocalInput('2026-02-30 12:00')).toBe('');
    expect(parseLocalInput('2026-09-11 25:00')).toBe('');
    expect(validateWindow('bad', 'bad')).toBe(false);
    expect(validateWindow(new Date(0).toISOString(), new Date(3600000).toISOString())).toBe(false);
    const date = new Date(2030, 2, 22, 15, 30);
    expect(parseLocalInput(localInput(date))).toBe(date.toISOString());
  });
  it('makes demo joins idempotent and counts capacity', () => {
    let s = createDemo();
    s.events[0].capacity = 4;
    s = demoCommand(s, 'event_join', { event_id: 'e1', adults: 2, children: 1 }).state;
    expect(s.attendance.find((x) => x.household_id === 'me' && x.event_id === 'e1')?.status).toBe('waitlist');
    s = demoCommand(s, 'event_join', { event_id: 'e1', adults: 2, children: 1 }).state;
    expect(s.attendance.filter((x) => x.household_id === 'me' && x.event_id === 'e1')).toHaveLength(1);
  });
  it('has both languages for every interface key', () => {
    for (const pair of Object.values(dictionary)) {
      expect(pair).toHaveLength(2);
      expect(pair.every((v) => v.length > 0)).toBe(true);
    }
  });
});
