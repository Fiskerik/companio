import type { AppState, Availability, ChildMode, Household } from './types';

export const INTERESTS = [
  'coffee',
  'walks',
  'food',
  'games',
  'outdoors',
  'culture',
  'playground',
  'exercise',
] as const;
export const CHILD_AGES = ['0–1', '2–3', '4–6', '7–10', '11–14', '15–17'];
export function distanceKm(
  a: Pick<Household, 'latitude' | 'longitude'>,
  b: Pick<Household, 'latitude' | 'longitude'>,
) {
  const rad = Math.PI / 180;
  const dlat = (b.latitude - a.latitude) * rad,
    dlon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function compatibleChildren(a: ChildMode, b: ChildMode) {
  return a === 'either' || b === 'either' || a === b;
}
export function isMatch(state: AppState, a: string, b: string) {
  return state.contacts.some(
    (c) =>
      c.status === 'accepted' &&
      ((c.from_household === a && c.to_household === b) || (c.from_household === b && c.to_household === a)),
  );
}
export function canSeeAvailability(state: AppState, slot: Availability, now = Date.now()) {
  if (
    !state.household_id ||
    new Date(slot.ends_at).getTime() <= now ||
    state.blocked_ids.includes(slot.household_id)
  )
    return false;
  return (
    slot.household_id === state.household_id ||
    slot.visibility === 'nearby' ||
    isMatch(state, state.household_id, slot.household_id)
  );
}
export function householdName(h?: Household) {
  return h?.members.map((m) => m.name).join(' & ') || '…';
}
export function matchingHouseholds(state: AppState, now = Date.now()) {
  const me = state.households.find((h) => h.id === state.household_id);
  if (!me || me.kind === 'solo') return [];
  const mine = state.availability.filter(
    (a) => a.household_id === me.id && new Date(a.ends_at).getTime() > now,
  );
  return state.households
    .filter(
      (h) =>
        h.id !== me.id &&
        h.kind !== 'solo' &&
        !state.blocked_ids.includes(h.id) &&
        distanceKm(me, h) <= me.radius_km &&
        (!me.preferred_kinds.length || me.preferred_kinds.includes(h.kind)) &&
        compatibleChildren(me.child_mode, h.child_mode),
    )
    .map((h) => {
      const sharedInterests = h.interests.filter((i) => me.interests.includes(i));
      const sharedTime = state.availability.some(
        (a) =>
          a.household_id === h.id &&
          canSeeAvailability(state, a, now) &&
          mine.some(
            (b) =>
              new Date(a.starts_at) < new Date(b.ends_at) &&
              new Date(b.starts_at) < new Date(a.ends_at) &&
              compatibleChildren(a.child_mode, b.child_mode),
          ),
      );
      const distance = distanceKm(me, h);
      return {
        household: h,
        sharedInterests,
        sharedTime,
        distance,
        score:
          (sharedTime ? 100 : 0) + sharedInterests.length * 10 - distance + (h.energy === me.energy ? 5 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.household.id.localeCompare(b.household.id));
}
export function validateWindow(start: string, end: string, now = Date.now()) {
  const s = Date.parse(start),
    e = Date.parse(end);
  return Number.isFinite(s) && Number.isFinite(e) && s >= now - 60_000 && e > s && e - s <= 24 * 60 * 60_000;
}
export function seatsAvailable(
  capacity: number,
  bookings: { adults: number; children: number; status: string }[],
) {
  return Math.max(
    0,
    capacity - bookings.filter((b) => b.status === 'accepted').reduce((s, b) => s + b.adults + b.children, 0),
  );
}
export function validateParty(adults: number, children: number) {
  return (
    Number.isInteger(adults) &&
    adults >= 1 &&
    adults <= 2 &&
    Number.isInteger(children) &&
    children >= 0 &&
    children <= 12
  );
}
