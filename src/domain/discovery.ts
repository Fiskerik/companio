import {
  canSeeAvailability,
  compatibleChildren,
  distanceKm,
  householdName,
  matchingHouseholds,
} from './rules';
import type { AppState, Availability, ChildMode, Gathering, HouseholdKind, Locale } from './types';

export const LANGUAGES = {
  sv: 'Svenska',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  uk: 'Українська',
  fi: 'Suomi',
};
// Practice languages are voluntary interest tags, stored by the existing profile API.
// Spoken languages remain in household.languages; the two must not be confused.
export const practiceTag = (language: string) => `practice_${language}`;
export const practiceLanguages = (interests: string[]) =>
  Object.keys(LANGUAGES).filter((l) => interests.includes(practiceTag(l)));
export const languageName = (code: string) => LANGUAGES[code as keyof typeof LANGUAGES] || code;
export const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function inPeriod(start: string, end: string, period: string, now: number) {
  if (Date.parse(end) <= now) return false;
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const weekEnd = new Date(tomorrow);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return (
    period === 'all' || Date.parse(start) < (period === 'today' ? tomorrow.getTime() : weekEnd.getTime())
  );
}
export type PeopleFilters = {
  search: string;
  radius: number;
  kind: HouseholdKind | 'all';
  childMode: ChildMode | 'all';
  activity: string;
  energy: string;
  language: string;
  practiceLanguage: string;
  childAge: string;
  when: string;
  sharedTime: boolean;
  sort: 'recommended' | 'distance';
};
export const initialPeopleFilters = (radius: number): PeopleFilters => ({
  search: '',
  radius,
  kind: 'all',
  childMode: 'all',
  activity: 'all',
  energy: 'all',
  language: 'all',
  practiceLanguage: 'all',
  childAge: 'all',
  when: 'all',
  sharedTime: false,
  sort: 'recommended',
});
export function filterPeople(state: AppState, filters: PeopleFilters, now = Date.now()) {
  const result = matchingHouseholds(state, now).filter((m) => {
    const h = m.household;
    return (
      `${householdName(h)} ${h.area}`
        .toLocaleLowerCase()
        .includes(filters.search.trim().toLocaleLowerCase()) &&
      m.distance <= filters.radius &&
      (filters.kind === 'all' || h.kind === filters.kind) &&
      (filters.childMode === 'all' || compatibleChildren(h.child_mode, filters.childMode)) &&
      (filters.activity === 'all' || h.interests.includes(filters.activity)) &&
      (filters.energy === 'all' || h.energy === filters.energy) &&
      (filters.language === 'all' || h.languages.includes(filters.language)) &&
      (filters.practiceLanguage === 'all' ||
        (h.interests.includes('language_learning') &&
          (h.languages.includes(filters.practiceLanguage) ||
            practiceLanguages(h.interests).includes(filters.practiceLanguage)))) &&
      (filters.childAge === 'all' || h.child_ages.includes(filters.childAge)) &&
      (!filters.sharedTime || m.sharedTime) &&
      (filters.when === 'all' ||
        state.availability.some(
          (a) =>
            a.household_id === h.id &&
            canSeeAvailability(state, a, now) &&
            inPeriod(a.starts_at, a.ends_at, filters.when, now) &&
            (filters.childMode === 'all' || compatibleChildren(a.child_mode, filters.childMode)) &&
            (filters.activity === 'all' || a.activity === filters.activity),
        ))
    );
  });
  return filters.sort === 'distance'
    ? result.sort((a, b) => a.distance - b.distance || a.household.id.localeCompare(b.household.id))
    : result;
}
export type TimelineItem = { id: string; start: string; end: string; mine: boolean } & (
  { kind: 'event'; event: Gathering } | { kind: 'availability'; slot: Availability }
);
export function timelineDays(
  state: AppState,
  filters: { when: string; mode: string; scope: string },
  now = Date.now(),
) {
  const me = state.households.find((h) => h.id === state.household_id);
  if (!me) return [];
  const items: TimelineItem[] = [];
  for (const e of state.events) {
    const attending = state.attendance.some(
      (a) => a.event_id === e.id && a.household_id === me.id && a.status === 'accepted',
    );
    const mine = e.host_household === me.id || attending;
    if (
      e.status !== 'active' ||
      state.blocked_ids.includes(e.host_household) ||
      (e.visibility !== 'public' && !mine) ||
      (!mine && distanceKm(me, e) > me.radius_km)
    )
      continue;
    if (filters.scope === 'mine' && !mine) continue;
    if (filters.mode !== 'all' && !compatibleChildren(e.child_mode, filters.mode as ChildMode)) continue;
    if (inPeriod(e.starts_at, e.ends_at, filters.when, now))
      items.push({ id: `event-${e.id}`, kind: 'event', event: e, start: e.starts_at, end: e.ends_at, mine });
  }
  for (const a of state.availability) {
    const mine = a.household_id === me.id;
    const h = state.households.find((h) => h.id === a.household_id);
    if (!h || !canSeeAvailability(state, a, now) || (!mine && distanceKm(me, h) > me.radius_km)) continue;
    if (filters.scope === 'mine' && !mine) continue;
    if (filters.mode !== 'all' && !compatibleChildren(a.child_mode, filters.mode as ChildMode)) continue;
    if (inPeriod(a.starts_at, a.ends_at, filters.when, now))
      items.push({
        id: `slot-${a.id}`,
        kind: 'availability',
        slot: a,
        start: a.starts_at,
        end: a.ends_at,
        mine,
      });
  }
  const days = new Map<string, TimelineItem[]>();
  for (const item of items.sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start) || a.id.localeCompare(b.id),
  )) {
    // An ongoing activity stays visible under today, including across midnight.
    const day = localDay(new Date(Math.max(Date.parse(item.start), now)));
    days.set(day, [...(days.get(day) || []), item]);
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => ({ day, items }));
}

export const COMMUNITY_TEMPLATES = [
  {
    id: 'coffee',
    icon: 'cafe-outline',
    name: ['Småbarn & stora kaffekoppar', 'Little ones & big coffees'],
    description: [
      'En fika medan barnen leker. Alla slags föräldrar är välkomna.',
      'Coffee while the children play. All parents welcome.',
    ],
  },
  {
    id: 'games',
    icon: 'dice-outline',
    name: ['En till vid spelbordet', 'Room at the game table'],
    description: [
      'Brädspel utan prestationskrav. Vi lär oss reglerna tillsammans.',
      'Board games without pressure. Learn the rules together.',
    ],
  },
  {
    id: 'language_learning',
    icon: 'language-outline',
    name: ['Språkfika – svenska & fler språk', 'Language café – Swedish & more'],
    description: [
      'Öva svenska, engelska eller ett annat språk över en fika. Berätta vad du vill öva och vad du kan hjälpa till med.',
      'Practise Swedish, English or another language over coffee. Share what you want to learn and what you can help with.',
    ],
  },
  {
    id: 'food',
    icon: 'restaurant-outline',
    name: ['Middag utan barn ibland', 'Grown-up dinner company'],
    description: [
      'För par och föräldrar som vill ses utan barn vid just detta tillfälle.',
      'For couples and parents who want to meet without children on this occasion.',
    ],
  },
  {
    id: 'walks',
    icon: 'footsteps-outline',
    name: ['Ny i stan – promenadkompisar', 'New in town – walking friends'],
    description: [
      'En enkel promenad och nya bekantskaper. Kom själv eller tillsammans.',
      'A simple walk and new connections. Come on your own or together.',
    ],
  },
  {
    id: 'outdoors',
    icon: 'leaf-outline',
    name: ['Helgutflykter med matsäck', 'Weekend picnic explorers'],
    description: [
      'Korta utflykter för små och stora. Vi bestämmer tempo och tillgänglighet inför varje träff.',
      'Short outings for all ages. Agree the pace and accessibility for each meetup.',
    ],
  },
  {
    id: 'culture',
    icon: 'book-outline',
    name: ['Bokprat & kultur', 'Books & culture club'],
    description: [
      'Dela en bok, upptäck ett museum eller prata om senaste filmen.',
      'Share a book, explore a museum or discuss a recent film.',
    ],
  },
  {
    id: 'exercise',
    icon: 'bicycle-outline',
    name: ['Rörelse i lagom takt', 'Move at your own pace'],
    description: [
      'Promenader, lätt träning och cykelturer. Sällskapet är viktigare än resultatet.',
      'Walks, gentle exercise and bike rides. Company matters more than performance.',
    ],
  },
] as const;
export const templateText = (values: readonly [string, string], locale: Locale) =>
  values[locale === 'sv' ? 0 : 1];
