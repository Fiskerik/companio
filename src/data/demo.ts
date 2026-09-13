import {
  EMPTY_STATE,
  type AppState,
  type Command,
  type Payload,
  type Household,
  type Gathering,
} from '../domain/types';
import { seatsAvailable, validateParty, validateWindow, isMatch } from '../domain/rules';
import { COMMUNITY_TEMPLATES } from '../domain/discovery';

const id = () => `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function createDemo(now = new Date()): AppState {
  const at = (days: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const makeHousehold = (
    key: string,
    names: string[],
    kind: Household['kind'],
    bio: string,
    interests: string[],
    lat: number,
    lon: number,
    area: string,
  ): Household => ({
    id: key,
    kind,
    area,
    latitude: lat,
    longitude: lon,
    bio,
    interests,
    languages: ['sv', 'en'],
    child_ages: kind === 'family' || kind === 'single_parent' ? ['4–6'] : [],
    child_mode: 'either',
    radius_km: 30,
    preferred_kinds: [],
    energy: 'balanced',
    members: names.map((name, i) => ({ id: `${key}-${i}`, name, locale: 'sv' })),
    created_at: now.toISOString(),
  });
  const households = [
    makeHousehold(
      'me',
      ['Alex'],
      'family',
      'Vi gillar långfrukostar, skogsstigar och middagar som får ta tid. Nyfikna på att lära känna fler i kvarteret.',
      ['coffee', 'walks', 'food', 'games'],
      59.31,
      18.07,
      'Södermalm, Stockholm',
    ),
    makeHousehold(
      'h1',
      ['Emma', 'Johan'],
      'family',
      'En kaffe i solen, barn som leker och inget som behöver vara perfekt. Vi ses gärna i helgen!',
      ['coffee', 'playground', 'outdoors'],
      59.32,
      18.05,
      'Hornstull, Stockholm',
    ),
    makeHousehold(
      'h2',
      ['Sara', 'David'],
      'couple',
      'Vi lagar lite för mycket mat och har en växande samling brädspel. Saknar bara några till runt bordet.',
      ['food', 'games', 'culture'],
      59.31,
      18.08,
      'Skanstull, Stockholm',
    ),
    makeHousehold(
      'h3',
      ['Lina'],
      'single_parent',
      'Ny i stan med en sexåring. Hänger gärna på en promenad, lekplats eller en enkel utflykt.',
      ['walks', 'coffee', 'playground'],
      59.33,
      18.06,
      'Kungsholmen, Stockholm',
    ),
    makeHousehold(
      'h4',
      ['Noah', 'Elias'],
      'couple',
      'Söndagspromenader, nya restauranger och spontana biokvällar. Alltid plats för nya vänner.',
      ['walks', 'food', 'culture', 'language_learning', 'practice_es'],
      59.3,
      18.04,
      'Årsta, Stockholm',
    ),
    makeHousehold(
      'h5',
      ['Maja', 'Ali'],
      'family',
      'Utflykter med matsäck och väldigt opretentiös matlagning. Vi lär gärna känna andra familjer.',
      ['outdoors', 'food', 'games', 'language_learning', 'practice_sv'],
      59.29,
      18.09,
      'Hammarbyhöjden, Stockholm',
    ),
  ];
  households[4].languages = ['sv', 'en', 'de'];
  households[4].energy = 'quiet';
  households[5].languages = ['en', 'ar'];
  households[5].energy = 'lively';
  households[5].child_ages = ['2–3', '7–10'];
  const event = (
    key: string,
    host: string,
    title: string,
    activity: string,
    days: number,
    hour: number,
    place: string,
    children: Gathering['child_mode'],
    capacity: number,
    description: string,
  ): Gathering => ({
    id: key,
    host_household: host,
    title,
    activity,
    starts_at: at(days, hour),
    ends_at: at(days, hour + 2),
    area: 'Stockholm',
    latitude: 59.31,
    longitude: 18.07,
    location: place,
    visibility: 'public',
    child_mode: children,
    capacity,
    approval: false,
    cost: '',
    practical: 'Vi möts vid entrén. Barnvagn går fint att ta med.',
    description,
    status: 'active',
  });
  const events = [
    event(
      'e1',
      'h1',
      'Fika & små äventyr i parken',
      'coffee',
      1,
      10,
      'Tantolunden · vid lekplatsen',
      'with',
      12,
      'Vi tar med en filt och lite kaffe. Kom som ni är, stanna så länge ni vill. Barnen kan leka medan vi lär känna varandra.',
    ),
    event(
      'e2',
      'h2',
      'En kväll med brädspel',
      'games',
      2,
      18,
      'Spelcaféet · Södermalm',
      'without',
      8,
      'Ta med ert favoritspel eller lär er något nytt. Vi börjar med något enkelt och beställer något gott.',
    ),
    event(
      'e3',
      'h4',
      'Söndag i promenadtakt',
      'walks',
      3,
      11,
      'Årstaviken · vid bryggan',
      'either',
      10,
      'En lugn runda längs vattnet. Vi stannar för kaffe längs vägen. Alla tempon är välkomna.',
    ),
    event(
      'e4',
      'h5',
      'Matsäck & skogsluft',
      'outdoors',
      5,
      10,
      'Nackareservatet · huvudentrén',
      'with',
      16,
      'En kort tur till sjön med en lång paus för matsäck. Perfekt för små ben och stora samtal.',
    ),
  ];
  events.push(
    ...[
      {
        ...event(
          'e5',
          'h5',
          'Språkfika – öva svenska tillsammans',
          'language_learning',
          1,
          15,
          'Bibliotekets café',
          'either',
          10,
          'Vi pratar enkel svenska och hjälps åt. Engelska och arabiska går också bra. Alla nivåer är välkomna.',
        ),
        group_id: 'g3',
      },
      {
        ...event(
          'e6',
          'h4',
          'Hola! En promenad på spanska',
          'language_learning',
          1,
          17,
          'Årstavikens promenadstråk',
          'without',
          8,
          'Vi övar spanska i lugn takt. Du får gärna hjälpa till på svenska eller tyska också.',
        ),
        group_id: 'g3',
      },
      {
        ...event(
          'e7',
          'me',
          'Vår fikastund vid vattnet',
          'coffee',
          2,
          14,
          'Kafé vid Årstaviken',
          'either',
          6,
          'Vi har plats för fler runt bordet.',
        ),
        group_id: 'g1',
      },
      {
        ...event(
          'e8',
          'h2',
          'Middag & nya bekantskaper',
          'food',
          4,
          18,
          'Restaurang på Södermalm',
          'without',
          8,
          'Vi bokar ett bord, var och en betalar sin mat.',
        ),
        group_id: 'g4',
        cost: 'Mat betalas på plats',
      },
      {
        ...event(
          'e9',
          'h3',
          'Ny i stan? Ta en promenad',
          'walks',
          6,
          11,
          'Medborgarplatsen',
          'either',
          12,
          'En enkel runda för dig som vill hitta nya vardagsvänner.',
        ),
        group_id: 'g5',
      },
      {
        ...event(
          'e10',
          'h4',
          'Bokprat på biblioteket',
          'culture',
          8,
          16,
          'Bibliotekets entré',
          'without',
          10,
          'Berätta om en bok du tyckt om. Ingen gemensam läsläxa.',
        ),
        group_id: 'g7',
      },
    ],
  );
  events[0].group_id = 'g1';
  events[1].group_id = 'g2';
  events[3].group_id = 'g6';
  return {
    ...EMPTY_STATE,
    blocked_ids: [],
    reports: [],
    conversation_preferences: [],
    demo_revision: 2,
    adult: households[0].members[0],
    household_id: 'me',
    households,
    events,
    availability: [
      {
        id: 'a1',
        household_id: 'h1',
        activity: 'coffee',
        starts_at: at(1, 10),
        ends_at: at(1, 14),
        visibility: 'nearby',
        child_mode: 'with',
        adults: 2,
      },
      {
        id: 'a2',
        household_id: 'h2',
        activity: 'games',
        starts_at: at(2, 17),
        ends_at: at(2, 21),
        visibility: 'matches',
        child_mode: 'without',
        adults: 2,
      },
      {
        id: 'a3',
        household_id: 'h3',
        activity: 'walks',
        starts_at: at(3, 10),
        ends_at: at(3, 14),
        visibility: 'matches',
        child_mode: 'with',
        adults: 1,
      },
      {
        id: 'a4',
        household_id: 'me',
        activity: 'coffee',
        starts_at: at(1, 10),
        ends_at: at(1, 13),
        visibility: 'matches',
        child_mode: 'either',
        adults: 1,
      },
    ],
    contacts: [
      {
        id: 'c1',
        from_household: 'h2',
        to_household: 'me',
        greeting: 'Hej! Ska vi spela något tillsammans snart?',
        status: 'accepted',
        created_at: now.toISOString(),
      },
      {
        id: 'c2',
        from_household: 'h3',
        to_household: 'me',
        greeting: 'Hej Alex! Såg att ni också gillar promenader. Ska vi ta en fika någon dag?',
        status: 'pending',
        created_at: now.toISOString(),
      },
    ],
    favorites: [
      { household_id: 'me', target_id: 'h2', notify: false },
      { household_id: 'me', target_id: 'h1', notify: false },
    ],
    conversations: [{ id: 'chat1', kind: 'household', title: '', household_a: 'me', household_b: 'h2' }],
    messages: [
      {
        id: 'm1',
        conversation_id: 'chat1',
        author_id: null,
        body: 'connected',
        system: true,
        created_at: new Date(now.getTime() - 86400000).toISOString(),
        reactions: {},
      },
      {
        id: 'm2',
        conversation_id: 'chat1',
        author_id: 'h2-0',
        body: 'Hej Alex! Vad kul att hitta fler som gillar brädspel 😊 Har ni något favoritspel?',
        system: false,
        created_at: new Date(now.getTime() - 3600000).toISOString(),
        reactions: {},
      },
      {
        id: 'm3',
        conversation_id: 'chat1',
        author_id: 'me-0',
        body: 'Hej! Vi har fastnat för Ticket to Ride. Ses gärna på en spelkväll!',
        system: false,
        created_at: new Date(now.getTime() - 1800000).toISOString(),
        reactions: { '❤️': ['h2-0'] },
      },
    ],
    attendance: events.map((e) => ({
      id: `b-${e.id}`,
      event_id: e.id,
      household_id: e.host_household,
      adults: 2,
      children: e.child_mode === 'with' ? 1 : 0,
      status: 'accepted',
      created_at: now.toISOString(),
    })),
    groups: [
      {
        id: 'g1',
        owner_household: 'h1',
        name: 'Småbarn & stora kaffekoppar',
        description: 'För oss som gärna delar en fika medan barnen hittar på något.',
        area: 'Södermalm',
        approval: false,
      },
      {
        id: 'g2',
        owner_household: 'h2',
        name: 'En till vid spelbordet',
        description: 'Brädspel, skratt och nya bekantskaper. Alla erfarenhetsnivåer välkomna.',
        area: 'Stockholm',
        approval: false,
      },
      ...COMMUNITY_TEMPLATES.slice(2).map((template, i) => ({
        id: `g${i + 3}`,
        owner_household: i === 0 ? 'h5' : 'h4',
        name: template.name[0],
        description: template.description[0],
        area: 'Stockholm',
        approval: i === 1,
      })),
    ],
    group_members: [
      { group_id: 'g1', household_id: 'h1', status: 'accepted' },
      { group_id: 'g2', household_id: 'h2', status: 'accepted' },
      ...COMMUNITY_TEMPLATES.slice(2).map((_, i) => ({
        group_id: `g${i + 3}`,
        household_id: i === 0 ? 'h5' : 'h4',
        status: 'accepted' as const,
      })),
    ],
  };
}

// Preserve saved conversations, profiles and user-created plans when adding new examples.
export function upgradeDemo(saved: AppState, now = new Date()): AppState {
  if ((saved.demo_revision || 0) >= 2) return saved;
  const fresh = createDemo(now);
  return {
    ...saved,
    demo_revision: 2,
    events: [
      ...saved.events,
      ...fresh.events.filter(
        (e) => /^e(?:[5-9]|10)$/.test(e.id) && !saved.events.some((old) => old.id === e.id),
      ),
    ],
    groups: [...saved.groups, ...fresh.groups.filter((g) => !saved.groups.some((old) => old.id === g.id))],
    attendance: [
      ...saved.attendance,
      ...fresh.attendance.filter(
        (a) =>
          !saved.events.some((e) => e.id === a.event_id) && !saved.attendance.some((old) => old.id === a.id),
      ),
    ],
    group_members: [
      ...saved.group_members,
      ...fresh.group_members.filter((m) => !saved.groups.some((g) => g.id === m.group_id)),
    ],
    households: saved.households.map((h) => {
      const updated = fresh.households.find((n) => n.id === h.id);
      return (h.id === 'h4' || h.id === 'h5') && updated
        ? {
            ...h,
            languages: updated.languages,
            interests: [...new Set([...h.interests, ...updated.interests])],
          }
        : h;
    }),
  };
}

// Local interactive demonstration only. Live access control is enforced in PostgreSQL.
export function demoCommand(
  input: AppState,
  action: Command,
  p: Payload,
): { state: AppState; result: Record<string, unknown> } {
  const s: AppState = structuredClone(input);
  const h = s.household_id!,
    uid = s.adult!.id;
  const now = new Date().toISOString();
  let result: Record<string, unknown> = { ok: true };
  const requireHost = (e: Gathering | undefined) => {
    if (!e || e.host_household !== h) throw Error('HOST_REQUIRED');
    return e;
  };
  const addConversation = (kind: 'group' | 'event', target: string, title: string) => {
    let c = s.conversations.find((x) => x[`${kind}_id`] === target);
    if (!c) {
      c = { id: id(), kind, title, [`${kind}_id`]: target };
      s.conversations.push(c);
    }
    return c;
  };
  if (action === 'favorite_toggle') {
    const i = s.favorites.findIndex((f) => f.household_id === h && f.target_id === p.target_id);
    if (i < 0) s.favorites.push({ household_id: h, target_id: String(p.target_id), notify: false });
    else s.favorites.splice(i, 1);
  } else if (action === 'favorite_notify') {
    if (p.notify && !isMatch(s, h, String(p.target_id))) throw Error('MATCH_REQUIRED');
    s.favorites.forEach((f) => {
      if (f.target_id === p.target_id) f.notify = Boolean(p.notify);
    });
  } else if (action === 'contact_request') {
    if (!s.contacts.some((c) => [c.from_household, c.to_household].includes(String(p.target_id))))
      s.contacts.push({
        id: id(),
        from_household: h,
        to_household: String(p.target_id),
        greeting: String(p.greeting),
        status: 'pending',
        created_at: now,
      });
  } else if (action === 'contact_respond') {
    const c = s.contacts.find((c) => c.id === p.id && c.to_household === h);
    if (!c) throw Error('NOT_AVAILABLE');
    c.status = p.accept ? 'accepted' : 'declined';
    if (p.accept) {
      const cid = id();
      s.conversations.push({
        id: cid,
        kind: 'household',
        title: '',
        household_a: h,
        household_b: c.from_household,
      });
      s.messages.push({
        id: id(),
        conversation_id: cid,
        author_id: null,
        body: 'connected',
        system: true,
        created_at: now,
        reactions: {},
      });
      result.conversation_id = cid;
    }
  } else if (action === 'availability_create') {
    if (!validateWindow(String(p.starts_at), String(p.ends_at))) throw Error('INVALID_TIME');
    s.availability.push({
      id: id(),
      household_id: h,
      activity: String(p.activity),
      starts_at: String(p.starts_at),
      ends_at: String(p.ends_at),
      visibility: p.visibility as 'matches' | 'nearby',
      child_mode: p.child_mode as 'with',
      adults: Number(p.adults) || 1,
    });
  } else if (action === 'availability_delete')
    s.availability = s.availability.filter((a) => !(a.id === p.id && a.household_id === h));
  else if (action === 'message_send') {
    if (!s.conversations.some((c) => c.id === p.conversation_id)) throw Error('NOT_AVAILABLE');
    s.messages.push({
      id: id(),
      conversation_id: String(p.conversation_id),
      author_id: uid,
      body: String(p.body || ''),
      image_path: p.image_path as string,
      event_id: p.event_id as string,
      reply_to: p.reply_to as string,
      created_at: now,
      system: false,
      reactions: {},
    });
  } else if (action === 'message_react') {
    const m = s.messages.find((m) => m.id === p.message_id);
    if (m) {
      const e = String(p.emoji),
        r = m.reactions[e] || [];
      m.reactions[e] = r.includes(uid) ? r.filter((x) => x !== uid) : [...r, uid];
    }
  } else if (action === 'conversation_preference') {
    let c = s.conversation_preferences.find((c) => c.conversation_id === p.conversation_id);
    if (!c) {
      c = { conversation_id: String(p.conversation_id), muted: false, archived: false, read_at: now };
      s.conversation_preferences.push(c);
    }
    if ('muted' in p) c.muted = Boolean(p.muted);
    if ('archived' in p) c.archived = Boolean(p.archived);
    if (p.read) c.read_at = now;
  } else if (action === 'profile_update') {
    const me = s.households.find((x) => x.id === h)!;
    Object.assign(me, p);
    if (p.name) {
      s.adult!.name = String(p.name);
      me.members.find((x) => x.id === uid)!.name = String(p.name);
    }
    if (p.locale) s.adult!.locale = p.locale as 'sv';
  } else if (action === 'event_create') {
    if (!validateWindow(String(p.starts_at), String(p.ends_at))) throw Error('INVALID_TIME');
    const me = s.households.find((x) => x.id === h)!;
    const eid = id();
    s.events.push({
      ...p,
      id: eid,
      host_household: h,
      area: me.area,
      latitude: me.latitude,
      longitude: me.longitude,
      status: 'active',
    } as Gathering);
    if (
      !validateParty(Number(p.adults), Number(p.children)) ||
      Number(p.adults) + Number(p.children) > Number(p.capacity)
    )
      throw Error('INVALID_PARTY');
    s.attendance.push({
      id: id(),
      event_id: eid,
      household_id: h,
      adults: Number(p.adults),
      children: Number(p.children),
      status: 'accepted',
      created_at: now,
    });
    addConversation('event', eid, String(p.title));
    result.id = eid;
  } else if (action === 'event_update') {
    const e = requireHost(s.events.find((x) => x.id === p.id));
    if (!validateWindow(String(p.starts_at), String(p.ends_at))) throw Error('INVALID_TIME');
    Object.assign(e, p);
  } else if (action === 'event_join') {
    const e = s.events.find((x) => x.id === p.event_id);
    if (!e || e.status !== 'active' || new Date(e.starts_at).getTime() < Date.now())
      throw Error('EVENT_CLOSED');
    const a = Number(p.adults),
      k = Number(p.children);
    if (!validateParty(a, k) || (e.child_mode === 'without' && k > 0)) throw Error('INVALID_PARTY');
    if (s.attendance.some((x) => x.event_id === e.id && x.household_id === h && x.status !== 'cancelled'))
      return { state: s, result };
    const free = seatsAvailable(
      e.capacity,
      s.attendance.filter((a) => a.event_id === e.id),
    );
    const status = e.approval ? 'pending' : a + k > free ? 'waitlist' : 'accepted';
    s.attendance = s.attendance.filter((x) => !(x.event_id === e.id && x.household_id === h));
    s.attendance.push({
      id: id(),
      event_id: e.id,
      household_id: h,
      adults: a,
      children: k,
      status,
      created_at: now,
    });
    if (status === 'accepted') addConversation('event', e.id, e.title);
  } else if (action === 'event_cancel_attendance') {
    s.attendance.forEach((a) => {
      if (a.event_id === p.event_id && a.household_id === h) a.status = 'cancelled';
    });
    s.conversations = s.conversations.filter((c) => c.event_id !== p.event_id);
  } else if (action === 'event_cancel') {
    requireHost(s.events.find((x) => x.id === p.event_id)).status = 'cancelled';
  } else if (action === 'event_respond') {
    const e = requireHost(s.events.find((x) => x.id === p.event_id));
    const a = s.attendance.find((a) => a.event_id === e.id && a.household_id === p.household_id);
    if (a)
      a.status = !p.accept
        ? 'cancelled'
        : a.adults + a.children >
            seatsAvailable(
              e.capacity,
              s.attendance.filter((b) => b.event_id === e.id),
            )
          ? 'waitlist'
          : 'accepted';
  } else if (action === 'group_create') {
    const gid = id();
    s.groups.push({
      id: gid,
      owner_household: h,
      name: String(p.name),
      description: String(p.description),
      area: s.households.find((x) => x.id === h)!.area,
      approval: Boolean(p.approval),
    });
    s.group_members.push({ group_id: gid, household_id: h, status: 'accepted' });
    addConversation('group', gid, String(p.name));
    result.id = gid;
  } else if (action === 'group_join') {
    const g = s.groups.find((x) => x.id === p.group_id)!;
    if (!s.group_members.some((x) => x.group_id === g.id && x.household_id === h))
      s.group_members.push({ group_id: g.id, household_id: h, status: g.approval ? 'pending' : 'accepted' });
    if (!g.approval) addConversation('group', g.id, g.name);
  } else if (action === 'group_leave') {
    s.group_members = s.group_members.filter((x) => !(x.group_id === p.group_id && x.household_id === h));
    s.conversations = s.conversations.filter((x) => x.group_id !== p.group_id);
  } else if (action === 'group_respond' || action === 'group_remove') {
    const g = s.groups.find((x) => x.id === p.group_id);
    if (g?.owner_household !== h) throw Error('HOST_REQUIRED');
    s.group_members = s.group_members.filter(
      (x) =>
        !(
          x.group_id === p.group_id &&
          x.household_id === p.household_id &&
          (!p.accept || action === 'group_remove')
        ),
    );
    s.group_members.forEach((x) => {
      if (x.group_id === p.group_id && x.household_id === p.household_id && p.accept) x.status = 'accepted';
    });
  } else if (action === 'report') {
    s.reports.push({
      id: id(),
      target_type: p.target_type as 'household',
      target_id: String(p.target_id),
      reason: String(p.reason),
      status: 'open',
      created_at: now,
    });
  } else if (action === 'block') {
    const target = String(p.target_id);
    s.blocked_ids.push(target);
    s.favorites = s.favorites.filter((f) => f.target_id !== target);
    s.availability = s.availability.filter((a) => a.household_id !== target);
    s.contacts = s.contacts.filter((c) => c.from_household !== target && c.to_household !== target);
    s.conversations = s.conversations.filter((c) => c.household_a !== target && c.household_b !== target);
  } else if (action === 'partner_invite') result = { token: 'DEMO-INVITATION-NOT-VALID-ON-SERVER' };
  else if (action === 'avatar_set') {
    s.adult!.avatar_path = String(p.path);
    s.households.find((x) => x.id === h)!.members.find((x) => x.id === uid)!.avatar_path = String(p.path);
  } else if (action === 'event_feedback' || action === 'event_invite') result = { ok: true };
  else if (action === 'account_delete' || action === 'household_leave')
    return { state: { ...EMPTY_STATE }, result };
  else throw Error('DEMO_ONLY');
  return { state: s, result };
}
