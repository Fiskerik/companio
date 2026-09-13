import { describe, expect, it } from 'vitest';
import { createDemo, upgradeDemo } from '../src/data/demo';
import { filterPeople, initialPeopleFilters, localDay, timelineDays } from '../src/domain/discovery';
import { localInput, parseLocalInput } from '../src/i18n';

const now = new Date(2026, 8, 13, 9).getTime();
const setup = () => createDemo(new Date(now));
const defaultTimeline = { when: 'all', mode: 'all', scope: 'all' };
describe('discovery filters and daily agenda', () => {
  it('combines language practice, household type and spoken language without confusing them', () => {
    const s = setup(),
      base = initialPeopleFilters(30);
    expect(
      filterPeople(s, { ...base, practiceLanguage: 'sv', kind: 'family' }, now).map((x) => x.household.id),
    ).toEqual(['h5']);
    expect(filterPeople(s, { ...base, practiceLanguage: 'sv', kind: 'family', language: 'sv' }, now)).toEqual(
      [],
    );
    expect(filterPeople(s, { ...base, practiceLanguage: 'es' }, now).map((x) => x.household.id)).toEqual([
      'h4',
    ]);
  });
  it('never infers private availability from favorite or time filters', () => {
    const s = setup();
    s.favorites.push({ household_id: 'me', target_id: 'h3', notify: false });
    expect(filterPeople(s, { ...initialPeopleFilters(30), search: 'Lina', when: 'week' }, now)).toEqual([]);
    expect(
      timelineDays(s, defaultTimeline, now)
        .flatMap((d) => d.items)
        .some((i) => i.id === 'slot-a3'),
    ).toBe(false);
    s.blocked_ids.push('h2');
    expect(
      timelineDays(s, defaultTimeline, now)
        .flatMap((d) => d.items)
        .some((i) => i.id === 'slot-a2' || i.id === 'event-e2'),
    ).toBe(false);
  });
  it('respects profile requirements even with a wider search filter and sorts by proximity', () => {
    const s = setup();
    s.households[0].radius_km = 2;
    s.households[0].preferred_kinds = ['couple'];
    const matches = filterPeople(s, { ...initialPeopleFilters(100), sort: 'distance' }, now);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.distance <= 2 && m.household.kind === 'couple')).toBe(true);
    expect(matches.map((m) => m.distance)).toEqual(matches.map((m) => m.distance).sort((a, b) => a - b));
  });
  it('includes your plans outside the search area but not unrelated private events', () => {
    const s = setup();
    const own = s.events.find((e) => e.host_household === 'me')!;
    own.latitude = 55;
    own.visibility = 'private';
    s.events[0].visibility = 'private';
    const ids = timelineDays(s, defaultTimeline, now).flatMap((d) => d.items.map((i) => i.id));
    expect(ids).toContain(`event-${own.id}`);
    expect(ids).not.toContain('event-e1');
    expect(
      timelineDays(s, { ...defaultTimeline, scope: 'mine' }, now)
        .flatMap((d) => d.items)
        .every((i) => i.mine),
    ).toBe(true);
  });
  it('keeps an ongoing overnight activity under today and removes it at its end', () => {
    const s = setup(),
      event = s.events[0];
    event.starts_at = new Date(now - 12 * 3600000).toISOString();
    event.ends_at = new Date(now + 3600000).toISOString();
    const day = timelineDays(s, { ...defaultTimeline, when: 'today' }, now)[0];
    expect(day.day).toBe(localDay(new Date(now)));
    expect(day.items.some((i) => i.id === 'event-e1')).toBe(true);
    expect(
      timelineDays(s, defaultTimeline, Date.parse(event.ends_at))
        .flatMap((d) => d.items)
        .some((i) => i.id === 'event-e1'),
    ).toBe(false);
  });
  it('adds examples to a saved demo without losing conversations or duplicating items', () => {
    const old = setup();
    delete old.demo_revision;
    old.events = old.events.slice(0, 4);
    old.groups = old.groups.slice(0, 2);
    old.messages[1].body = 'My saved message';
    const upgraded = upgradeDemo(old, new Date(now));
    expect(upgraded.groups).toHaveLength(8);
    expect(upgraded.events).toHaveLength(10);
    expect(upgraded.messages[1].body).toBe('My saved message');
    expect(upgradeDemo(upgraded)).toEqual(upgraded);
  });
  it('round-trips calendar selections across month/year boundaries in local time', () => {
    for (const date of [
      new Date(2028, 1, 29, 23, 55),
      new Date(2026, 11, 31, 23, 55),
      new Date(2027, 0, 1, 0, 5),
    ]) {
      expect(parseLocalInput(localInput(date))).toBe(date.toISOString());
    }
    expect(parseLocalInput('2026-02-30 10:00')).toBe('');
  });
});
