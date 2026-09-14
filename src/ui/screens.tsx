import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApp } from '../data/AppProvider';
import { supabase } from '../data/client';
import { pickAndUploadImage, registerPush } from '../data/media';
import {
  canSeeAvailability,
  distanceKm,
  householdName,
  isMatch,
  seatsAvailable,
  validateParty,
} from '../domain/rules';
import type {
  AttendanceStatus,
  Availability,
  Community,
  Conversation,
  EventJoinResult,
  Gathering,
  Household,
  Message,
} from '../domain/types';
import { filterPeople, initialPeopleFilters, languageName, practiceLanguages } from '../domain/discovery';
import { PeopleFilterSheet } from './PeopleFilters';
import { formatDate } from '../i18n';
import {
  Art,
  AsyncButton,
  Avatar,
  Button,
  Chip,
  Empty,
  Field,
  Icon,
  IconButton,
  MediaImage,
  Sheet,
  Toggle,
} from './components';
import { C, S, serif } from './theme';
import type { EditorKind, EditorProps } from './Forms';
import { errorMessage } from './Forms';
export interface Navigation {
  openEditor: (kind: EditorKind, options?: Partial<EditorProps>) => void;
  openHousehold: (id: string) => void;
  openEvent: (id: string) => void;
  openGroup: (id: string) => void;
  openChat: (id: string, draft?: string) => void;
  go: (tab: string) => void;
}
const icons: Record<string, React.ComponentProps<typeof Icon>['name']> = {
  coffee: 'cafe-outline',
  games: 'dice-outline',
  walks: 'footsteps-outline',
  outdoors: 'leaf-outline',
  food: 'restaurant-outline',
  culture: 'color-palette-outline',
  playground: 'sunny-outline',
  exercise: 'bicycle-outline',
  language_learning: 'language-outline',
};
const safely = (p: Promise<unknown>) => void p.catch(() => {});

export function AvailabilityCard({ slot, onPress }: { slot: Availability; onPress: () => void }) {
  const { state, text, locale } = useApp();
  const h = state.households.find((h) => h.id === slot.household_id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${householdName(h)} ${text('available')}`}
      onPress={onPress}
      style={[S.card, { padding: 16, gap: 12 }]}
    >
      <View style={S.row}>
        <Avatar name={h?.members[0]?.name || '?'} path={h?.members[0]?.avatar_path} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[S.title, { fontSize: 15 }]}>{householdName(h)}</Text>
          <Text style={[S.muted, { fontSize: 12 }]}>{h?.area}</Text>
        </View>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8DA777' }} />
      </View>
      <View style={S.row}>
        <Icon name={icons[slot.activity] || 'calendar-outline'} size={16} />
        <Text style={[S.body, { fontSize: 13 }]}>{text(slot.activity)}</Text>
      </View>
      <Text style={[S.muted, { fontSize: 12 }]}>
        {formatDate(slot.starts_at, locale)} · {text(slot.child_mode)}
      </Text>
    </Pressable>
  );
}
export function EventCard({ event, onPress }: { event: Gathering; onPress: () => void }) {
  const { state, text, locale } = useApp();
  const host = state.households.find((h) => h.id === event.host_household);
  const free = seatsAvailable(
    event.capacity,
    state.attendance.filter((a) => a.event_id === event.id),
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      style={({ pressed }) => [S.card, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View>
        <Art scene={event.activity} />
        <View
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            backgroundColor: 'rgba(255,255,255,.94)',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: C.green }}>{text(event.child_mode)}</Text>
        </View>
        {event.visibility === 'private' && (
          <View style={{ position: 'absolute', right: 14, top: 14 }}>
            <Icon name="lock-closed" size={18} />
          </View>
        )}
      </View>
      <View style={S.cardBody}>
        <Text style={[S.eyebrow, { fontSize: 10, color: C.coral, letterSpacing: 0.6 }]}>
          {formatDate(event.starts_at, locale).toUpperCase()}
        </Text>
        <Text style={S.title}>{event.title}</Text>
        <View style={S.row}>
          <Icon name="location-outline" color={C.muted} size={15} />
          <Text numberOfLines={1} style={[S.muted, { flex: 1, fontSize: 12 }]}>
            {event.location || event.area}
          </Text>
        </View>
        <View style={S.divider} />
        <View style={S.between}>
          <View style={S.row}>
            <Avatar name={host?.members[0]?.name || '?'} path={host?.members[0]?.avatar_path} size={29} />
            <Text style={[S.muted, { fontSize: 12 }]}>{householdName(host)}</Text>
          </View>
          <Text style={{ fontSize: 11, color: free ? C.green : C.coral, fontWeight: '600' }}>
            {free ? `${free} ${text('spots')}` : text('full')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
export { Discover } from './DiscoverScreen';
export function People({ nav }: { nav: Navigation }) {
  const { state, text, locale, command } = useApp();
  const me = state.households.find((h) => h.id === state.household_id)!;
  const [filters, setFilters] = useState(() => initialPeopleFilters(me.radius_km));
  const [showFilters, setShowFilters] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const matches = filterPeople(state, filters).filter((m) => !skipped.includes(m.household.id));
  const defaults = initialPeopleFilters(me.radius_km);
  const filterCount = Object.keys(defaults).filter(
    (k) => k !== 'search' && filters[k as keyof typeof filters] !== defaults[k as keyof typeof defaults],
  ).length;
  return (
    <View style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={[S.heading, { fontSize: 28, lineHeight: 34 }]}>
        {text('people')}
      </Text>
      <Text style={S.muted}>
        {locale === 'sv'
          ? 'Människor som passar er vardag. Börja med ett hej.'
          : 'People who fit your everyday life. Start with a hello.'}
      </Text>
      {me.kind === 'solo' ? (
        <Empty title={text('groups')} body={text('soloHint')}>
          <Button label={text('discover')} onPress={() => nav.go('discover')} />
        </Empty>
      ) : (
        <>
          <View style={[S.row, { alignItems: 'flex-end' }]}>
            <View style={{ flex: 1 }}>
              <Field
                label={text('search')}
                value={filters.search}
                onChangeText={(search) => setFilters({ ...filters, search })}
              />
            </View>
            <Button
              secondary
              icon="options-outline"
              label={`${text('filters')}${filterCount ? ` (${filterCount})` : ''}`}
              onPress={() => setShowFilters(true)}
            />
          </View>
          <Text style={[S.muted, { fontSize: 12 }]}>
            {matches.length} {locale === 'sv' ? 'hushåll inom dina val' : 'households within your choices'}
          </Text>
          {filterCount > 0 && (
            <Button
              small
              secondary
              label={text('clearFilters')}
              onPress={() => setFilters(initialPeopleFilters(me.radius_km))}
            />
          )}
          {showFilters && (
            <PeopleFilterSheet
              filters={filters}
              onChange={setFilters}
              count={matches.length}
              onClose={() => setShowFilters(false)}
              onProfile={() => {
                setShowFilters(false);
                nav.openEditor('profile');
              }}
            />
          )}
          {matches.map(({ household: h, sharedInterests, sharedTime, distance }) => {
            const favorite = state.favorites.some((f) => f.target_id === h.id);
            const matched = isMatch(state, me.id, h.id);
            const pending = state.contacts.some(
              (c) => c.status === 'pending' && [c.from_household, c.to_household].includes(h.id),
            );
            return (
              <View key={h.id} style={S.card}>
                <View style={[S.cardBody, { gap: 11, padding: 15 }]}>
                  <View style={S.between}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={householdName(h)}
                      onPress={() => nav.openHousehold(h.id)}
                      style={[S.row, { flex: 1 }]}
                    >
                      <View style={{ flexDirection: 'row' }}>
                        {h.members.map((m, i) => (
                          <View key={m.id} style={{ marginLeft: i ? -15 : 0 }}>
                            <Avatar name={m.name} path={m.avatar_path} size={44} />
                          </View>
                        ))}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={S.title}>{householdName(h)}</Text>
                        <Text style={S.muted}>
                          {Math.round(distance)} km · {h.area}
                        </Text>
                      </View>
                    </Pressable>
                    <IconButton
                      label={favorite ? text('saved') : text('save')}
                      name={favorite ? 'heart' : 'heart-outline'}
                      active={favorite}
                      onPress={() => safely(command('favorite_toggle', { target_id: h.id }))}
                    />
                  </View>
                  <Text numberOfLines={2} style={[S.body, { fontSize: 14, lineHeight: 20 }]}>
                    {h.bio}
                  </Text>
                  <View style={S.wrap}>
                    <Chip label={text(h.kind)} />
                    {h.interests.includes('language_learning') && (
                      <Chip label={text('language_learning')} icon="language-outline" />
                    )}
                    {sharedInterests
                      .filter((i) => !i.startsWith('practice_'))
                      .slice(0, 3)
                      .map((i) => (
                        <Chip key={i} label={`${text('shared')}: ${text(i)}`} icon={icons[i]} />
                      ))}
                    {sharedTime && <Chip label={text('sharedTime')} icon="calendar-outline" />}
                  </View>
                  {h.interests.includes('language_learning') && (
                    <Text style={[S.muted, { fontSize: 12 }]}>
                      {locale === 'sv' ? 'Pratar' : 'Speaks'}: {h.languages.map(languageName).join(', ')}
                      {practiceLanguages(h.interests).length
                        ? ` · ${locale === 'sv' ? 'Vill öva' : 'Practising'}: ${practiceLanguages(h.interests).map(languageName).join(', ')}`
                        : ''}
                    </Text>
                  )}
                  <View style={S.between}>
                    <Button
                      secondary
                      label={locale === 'sv' ? 'Hoppa över' : 'Skip'}
                      onPress={() => setSkipped([...skipped, h.id])}
                    />
                    <Button
                      label={matched ? text('matched') : pending ? text('pending') : text('contact')}
                      icon="chatbubble-outline"
                      onPress={() =>
                        matched
                          ? nav.openHousehold(h.id)
                          : pending
                            ? nav.go('inbox')
                            : nav.openEditor('contact', { targetId: h.id })
                      }
                    />
                  </View>
                </View>
              </View>
            );
          })}
          {!matches.length && (
            <Empty title={text('noResults')} body={text('emptyPeople')}>
              <Button secondary label={text('preferences')} onPress={() => nav.openEditor('profile')} />
              {skipped.length > 0 && (
                <Button secondary label={text('clearFilters')} onPress={() => setSkipped([])} />
              )}
            </Empty>
          )}
        </>
      )}
    </View>
  );
}
export function Favorites({ nav }: { nav: Navigation }) {
  const { state, text, command } = useApp();
  const favorites = state.favorites
    .map((f) => ({ f, h: state.households.find((h) => h.id === f.target_id) }))
    .filter((x) => x.h && !state.blocked_ids.includes(x.h.id));
  return (
    <View style={{ gap: 24 }}>
      <Text accessibilityRole="header" style={S.heading}>
        {text('favorites')}
      </Text>
      <Text style={S.muted}>{text('emptyFavorites')}</Text>
      {favorites.map(({ h, f }) => (
        <View key={f.target_id} style={S.card}>
          <View style={S.cardBody}>
            <View style={S.between}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={householdName(h)}
                onPress={() => nav.openHousehold(h!.id)}
                style={[S.row, { flex: 1 }]}
              >
                <Avatar name={h!.members[0]?.name || '?'} path={h!.members[0]?.avatar_path} />
                <View style={{ flex: 1 }}>
                  <Text style={S.title}>{householdName(h)}</Text>
                  <Text style={S.muted}>{h!.area}</Text>
                </View>
              </Pressable>
              <IconButton
                name="heart"
                active
                label={text('remove')}
                onPress={() => safely(command('favorite_toggle', { target_id: h!.id }))}
              />
            </View>
            {state.availability
              .filter((a) => a.household_id === h!.id && canSeeAvailability(state, a))
              .map((a) => (
                <AvailabilityCard key={a.id} slot={a} onPress={() => nav.openHousehold(h!.id)} />
              ))}
            {!state.availability.some((a) => a.household_id === h!.id && canSeeAvailability(state, a)) && (
              <Text style={S.muted}>{text('noAvailability')}</Text>
            )}
            {isMatch(state, state.household_id!, h!.id) && (
              <Toggle
                label={text('notifyFavorite')}
                value={f.notify}
                onChange={(notify) => safely(command('favorite_notify', { target_id: h!.id, notify }))}
              />
            )}
          </View>
        </View>
      ))}
      {!favorites.length && (
        <Empty title={text('favorites')} icon="heart-outline">
          <Button label={text('people')} onPress={() => nav.go('people')} />
        </Empty>
      )}
    </View>
  );
}
export function conversationTitle(c: Conversation, state: ReturnType<typeof useApp>['state']) {
  if (c.kind !== 'household') return c.title;
  const other = c.household_a === state.household_id ? c.household_b : c.household_a;
  return householdName(state.households.find((h) => h.id === other));
}
export function Inbox({
  nav,
  selected,
  onBack,
  draft,
}: {
  nav: Navigation;
  selected: string | null;
  onBack: () => void;
  draft?: string;
}) {
  const { state, text, locale, command } = useApp();
  const [search, setSearch] = useState(''),
    [archived, setArchived] = useState(false);
  const c = state.conversations.find((x) => x.id === selected);
  if (c) return <Chat conversation={c} nav={nav} onBack={onBack} draft={draft} />;
  const requests = state.contacts.filter(
    (c) => c.status === 'pending' && c.to_household === state.household_id,
  );
  const convs = state.conversations
    .filter(
      (c) =>
        Boolean(state.conversation_preferences.find((p) => p.conversation_id === c.id)?.archived) ===
          archived && conversationTitle(c, state).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const last = (id: string) =>
        state.messages
          .filter((m) => m.conversation_id === id)
          .sort((x, y) => y.created_at.localeCompare(x.created_at))[0]?.created_at || '';
      return last(b.id).localeCompare(last(a.id));
    });
  return (
    <View style={{ gap: 24 }}>
      <Text accessibilityRole="header" style={S.heading}>
        {text('inbox')}
      </Text>
      <Field label={text('search')} value={search} onChangeText={setSearch} />
      {requests.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={S.title}>{text('requests')}</Text>
          {requests.map((r) => (
            <View key={r.id} style={[S.card, S.cardBody]}>
              <Text style={S.title}>
                {householdName(state.households.find((h) => h.id === r.from_household))}
              </Text>
              <Text style={S.body}>{r.greeting}</Text>
              <View style={S.row}>
                <AsyncButton
                  label={text('accept')}
                  run={() => command('contact_respond', { id: r.id, accept: true })}
                />
                <AsyncButton
                  secondary
                  label={text('decline')}
                  run={() => command('contact_respond', { id: r.id, accept: false })}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={S.wrap}>
        <Chip label={text('inbox')} selected={!archived} onPress={() => setArchived(false)} />
        <Chip label={text('archived')} selected={archived} onPress={() => setArchived(true)} />
      </View>
      {convs.map((c) => {
        const messages = state.messages
          .filter((m) => m.conversation_id === c.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const last = messages[0],
          pref = state.conversation_preferences.find((p) => p.conversation_id === c.id);
        const unread = messages.some(
          (m) => m.author_id && m.author_id !== state.adult?.id && m.created_at > (pref?.read_at || ''),
        );
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={conversationTitle(c, state)}
            onPress={() => nav.openChat(c.id)}
            style={[S.card, S.row, { padding: 20 }]}
          >
            <Avatar name={conversationTitle(c, state)} size={54} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={S.between}>
                <Text style={[S.title, { fontSize: 16 }]}>{conversationTitle(c, state)}</Text>
                {unread && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.coral }} />
                )}
              </View>
              <Text style={S.muted} numberOfLines={1}>
                {last
                  ? last.system
                    ? systemMessage(last.body, locale)
                    : last.body || text('photo')
                  : text('contact')}
              </Text>
            </View>
            <Icon name="chevron-forward" color={C.muted} size={17} />
          </Pressable>
        );
      })}
      {!convs.length && <Empty title={text('inbox')} body={text('emptyInbox')} icon="chatbubbles-outline" />}
    </View>
  );
}
function systemMessage(body: string, locale: string) {
  if (body === 'connected')
    return locale === 'sv' ? 'Ni har matchat. Säg hej!' : 'You are connected. Say hello!';
  if (body.startsWith('partner_joined:'))
    return `${body.split(':').slice(1).join(':')} ${locale === 'sv' ? 'har anslutit och kan läsa hushållets historik.' : 'joined and can read household history.'}`;
  if (body.startsWith('partner_left:'))
    return `${body.split(':').slice(1).join(':')} ${locale === 'sv' ? 'har lämnat hushållet.' : 'left the household.'}`;
  return body === 'event_cancelled'
    ? locale === 'sv'
      ? 'Träffen har ställts in.'
      : 'The meetup has been cancelled.'
    : locale === 'sv'
      ? 'Träffen har uppdaterats. Kontrollera tid och plats.'
      : 'Meetup updated. Check the time and location.';
}
function Chat({
  conversation: c,
  nav,
  onBack,
  draft,
}: {
  conversation: Conversation;
  nav: Navigation;
  onBack: () => void;
  draft?: string;
}) {
  const { state, text, locale, command, demo } = useApp();
  const [body, setBody] = useState(draft || ''),
    [reply, setReply] = useState<Message | null>(null),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState(''),
    [share, setShare] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const messages = state.messages
    .filter((m) => m.conversation_id === c.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pref = state.conversation_preferences.find((p) => p.conversation_id === c.id);
  const other = c.household_a === state.household_id ? c.household_b : c.household_a;
  useEffect(() => {
    safely(command('conversation_preference', { conversation_id: c.id, read: true }));
  }, [c.id]);
  useEffect(() => {
    if (draft && !body) setBody(draft);
  }, [draft]);
  const send = async (image_path?: string, event_id?: string) => {
    if (!body.trim() && !image_path && !event_id) return;
    setBusy(true);
    try {
      await command('message_send', {
        conversation_id: c.id,
        body,
        image_path,
        event_id,
        reply_to: reply?.id,
      });
      setBody('');
      setReply(null);
    } finally {
      setBusy(false);
    }
  };
  const upload = async () => {
    setBusy(true);
    setLocalError('');
    try {
      const path = await pickAndUploadImage(command, demo);
      if (path) await send(path);
    } catch (e) {
      setLocalError(errorMessage(String(e), locale === 'en'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 15 }}>
      <View style={S.row}>
        <IconButton name="arrow-back" label={text('back')} onPress={onBack} />
        <Avatar name={conversationTitle(c, state)} />
        <View style={{ flex: 1 }}>
          <Text style={S.title}>{conversationTitle(c, state)}</Text>
          <Text style={[S.muted, { fontSize: 12 }]}>
            {locale === 'sv' ? 'Gemensam chatt' : 'Shared conversation'}
          </Text>
        </View>
      </View>
      <View style={S.wrap}>
        <Chip
          label={pref?.muted ? text('unmute') : text('mute')}
          onPress={() =>
            safely(command('conversation_preference', { conversation_id: c.id, muted: !pref?.muted }))
          }
        />
        <Chip
          label={pref?.archived ? text('unarchive') : text('archive')}
          onPress={() => {
            safely(command('conversation_preference', { conversation_id: c.id, archived: !pref?.archived }));
            onBack();
          }}
        />
        {other && (
          <Chip
            label={text('block')}
            onPress={() => {
              safely(command('block', { target_id: other }));
              onBack();
            }}
          />
        )}
      </View>
      <View style={[S.card, { minHeight: 340, maxHeight: 520 }]}>
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: 20, gap: 18 }}
        >
          {messages.map((m) => {
            if (m.system)
              return (
                <Text key={m.id} style={[S.muted, { textAlign: 'center', fontSize: 12 }]}>
                  {systemMessage(m.body, locale)}
                </Text>
              );
            const mine = m.author_id === state.adult?.id,
              author = state.households.flatMap((h) => h.members).find((p) => p.id === m.author_id);
            const quoted = messages.find((x) => x.id === m.reply_to);
            return (
              <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 5 }}>
                <Text style={{ fontSize: 11, color: C.muted }}>{author?.name || '…'}</Text>
                <View
                  style={{
                    maxWidth: '90%',
                    backgroundColor: mine ? C.green : C.pale,
                    padding: 14,
                    borderRadius: 17,
                    borderBottomRightRadius: mine ? 4 : 17,
                    borderBottomLeftRadius: mine ? 17 : 4,
                    gap: 8,
                  }}
                >
                  {quoted && (
                    <View
                      style={{
                        borderLeftWidth: 2,
                        borderLeftColor: mine ? '#BACDA9' : C.green,
                        paddingLeft: 8,
                      }}
                    >
                      <Text numberOfLines={2} style={{ fontSize: 12, color: mine ? '#D8E4CE' : C.muted }}>
                        {quoted.body}
                      </Text>
                    </View>
                  )}
                  {m.image_path && <MediaImage path={m.image_path} style={{ width: 220, height: 170 }} />}
                  {m.event_id && (
                    <Button
                      secondary
                      small
                      label={state.events.find((e) => e.id === m.event_id)?.title || text('details')}
                      onPress={() => nav.openEvent(m.event_id!)}
                    />
                  )}
                  <Text selectable style={[S.body, { color: mine ? 'white' : C.ink }]}>
                    {m.body ||
                      (!m.image_path && !m.event_id
                        ? locale === 'sv'
                          ? 'Bild väntar på granskning'
                          : 'Image awaiting review'
                        : '')}
                  </Text>
                </View>
                <View style={[S.row, { gap: 8 }]}>
                  <Text style={{ fontSize: 10, color: C.muted }}>
                    {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
                      new Date(m.created_at),
                    )}
                    {mine ? ` · ${text('delivered')}` : ''}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={text('reply')}
                    onPress={() => setReply(m)}
                  >
                    <Icon name="return-up-back-outline" size={15} color={C.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={locale === 'sv' ? 'Reagera med hjärta' : 'React with a heart'}
                    onPress={() =>
                      safely(
                        command('message_react', { conversation_id: c.id, message_id: m.id, emoji: '❤️' }),
                      )
                    }
                  >
                    <Text style={{ fontSize: 12 }}>♡ {m.reactions['❤️']?.length || ''}</Text>
                  </Pressable>
                  {!mine && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={text('report')}
                      onPress={() => nav.openEditor('report', { targetId: m.id, targetType: 'message' })}
                    >
                      <Icon name="flag-outline" size={13} color={C.muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
      {reply && (
        <View style={[S.between, { padding: 10, backgroundColor: C.lime, borderRadius: 12 }]}>
          <Text style={[S.muted, { flex: 1 }]} numberOfLines={1}>
            {text('reply')}: {reply.body}
          </Text>
          <IconButton name="close" label={text('cancel')} onPress={() => setReply(null)} />
        </View>
      )}
      {localError && <Text style={{ color: C.red }}>{localError}</Text>}
      <View style={[S.row, { alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}>
          <TextInput
            accessibilityLabel={text('message')}
            placeholder={text('message')}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={4000}
            style={[S.field, { maxHeight: 120 }]}
          />
        </View>
        <IconButton
          label={text('send')}
          name="arrow-up"
          onPress={() => {
            if (!busy) safely(send());
          }}
        />
      </View>
      <View style={S.row}>
        <Button
          small
          secondary
          label={text('photo')}
          icon="image-outline"
          disabled={busy}
          onPress={() => void upload()}
        />
        <Button
          small
          secondary
          label={text('shareEvent')}
          icon="calendar-outline"
          onPress={() => setShare(!share)}
        />
      </View>
      {share &&
        state.events
          .filter((e) => e.status === 'active')
          .map((e) => (
            <Button
              key={e.id}
              label={e.title}
              secondary
              onPress={() => {
                safely(send(undefined, e.id));
                setShare(false);
              }}
            />
          ))}
    </View>
  );
}

export function HouseholdDetail({
  household: h,
  nav,
  onClose,
}: {
  household: Household;
  nav: Navigation;
  onClose: () => void;
}) {
  const { state, text, locale, command } = useApp();
  const favorite = state.favorites.some((f) => f.target_id === h.id),
    matched = isMatch(state, state.household_id!, h.id);
  const chat = state.conversations.find(
    (c) => c.kind === 'household' && [c.household_a, c.household_b].includes(h.id),
  );
  const pending = state.contacts.some(
    (c) => c.status === 'pending' && [c.from_household, c.to_household].includes(h.id),
  );
  const slots = state.availability.filter((a) => a.household_id === h.id && canSeeAvailability(state, a));
  return (
    <Sheet title={householdName(h)} onClose={onClose}>
      <View style={[S.row, { justifyContent: 'center' }]}>
        {h.members.map((m) => (
          <Avatar key={m.id} name={m.name} path={m.avatar_path} size={78} />
        ))}
      </View>
      <Text style={[S.heading, { textAlign: 'center', fontSize: 27 }]}>{householdName(h)}</Text>
      <Text style={[S.muted, { textAlign: 'center' }]}>
        {h.area} · {text(h.kind)}
      </Text>
      <Text style={S.body}>{h.bio}</Text>
      <View style={S.wrap}>
        {h.interests
          .filter((i) => !i.startsWith('practice_'))
          .map((i) => (
            <Chip key={i} label={text(i)} icon={icons[i]} />
          ))}
        <Chip label={text(h.child_mode)} />
      </View>
      {h.child_ages.length > 0 && (
        <Text style={S.muted}>
          {text('children')}: {h.child_ages.join(', ')} {locale === 'sv' ? 'år' : 'years'}
        </Text>
      )}
      <Text style={S.muted}>
        {locale === 'sv' ? 'Pratar' : 'Speaks'}: {h.languages.map(languageName).join(', ')}
      </Text>
      {h.interests.includes('language_learning') && practiceLanguages(h.interests).length > 0 && (
        <Text style={S.muted}>
          {locale === 'sv' ? 'Vill öva' : 'Practising'}:{' '}
          {practiceLanguages(h.interests).map(languageName).join(', ')}
        </Text>
      )}
      <Button
        label={favorite ? text('saved') : text('save')}
        icon={favorite ? 'heart' : 'heart-outline'}
        secondary
        onPress={() => safely(command('favorite_toggle', { target_id: h.id }))}
      />
      {matched && chat ? (
        <Button
          label={text('inbox')}
          onPress={() => {
            onClose();
            nav.openChat(chat.id);
          }}
        />
      ) : (
        h.kind !== 'solo' && (
          <Button
            label={pending ? text('pending') : text('contact')}
            disabled={pending}
            onPress={() => {
              onClose();
              nav.openEditor('contact', { targetId: h.id });
            }}
          />
        )
      )}
      <Text style={S.title}>{text('available')}</Text>
      {slots.map((a) => (
        <AvailabilityCard
          key={a.id}
          slot={a}
          onPress={() => {
            if (chat) {
              onClose();
              nav.openChat(chat.id);
            } else {
              onClose();
              nav.openEditor('contact', { targetId: h.id });
            }
          }}
        />
      ))}
      {!slots.length && <Text style={S.muted}>{text('noAvailability')}</Text>}
      <View style={S.row}>
        <Button
          label={text('report')}
          secondary
          onPress={() => {
            onClose();
            nav.openEditor('report', { targetId: h.id });
          }}
        />
        <AsyncButton
          label={text('block')}
          secondary
          run={async () => {
            await command('block', { target_id: h.id });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

export function EventDetail({
  event: e,
  nav,
  onClose,
}: {
  event: Gathering;
  nav: Navigation;
  onClose: () => void;
}) {
  const { state, text, locale, command } = useApp();
  const [a, setA] = useState('1'),
    [k, setK] = useState('0'),
    [localError, setError] = useState(''),
    [submittedStatus, setSubmittedStatus] = useState<AttendanceStatus | null>(null),
    [again, setAgain] = useState(false),
    [feedback, setFeedback] = useState(false);
  const own = e.host_household === state.household_id;
  const booking = state.attendance.find(
    (a) => a.event_id === e.id && a.household_id === state.household_id && a.status !== 'cancelled',
  );
  const chat = state.conversations.find((c) => c.event_id === e.id);
  const ended = Date.parse(e.ends_at) < Date.now();
  const free = seatsAvailable(
    e.capacity,
    state.attendance.filter((a) => a.event_id === e.id),
  );
  const join = async () => {
    setError('');
    if (!validateParty(Number(a), Number(k))) {
      setError(errorMessage('INVALID_PARTY', locale === 'en'));
      return;
    }
    try {
      const result = (await command('event_join', {
        event_id: e.id,
        adults: Number(a),
        children: Number(k),
      })) as Partial<EventJoinResult>;
      if (
        result.attendance_status === 'accepted' ||
        result.attendance_status === 'pending' ||
        result.attendance_status === 'waitlist'
      )
        setSubmittedStatus(result.attendance_status);
    } catch (err) {
      setError(errorMessage(String(err), locale === 'en'));
    }
  };
  return (
    <Sheet title={e.title} onClose={onClose}>
      <View style={{ borderRadius: 17, overflow: 'hidden' }}>
        <Art scene={e.activity} height={190} />
      </View>
      <View style={S.wrap}>
        <Chip label={text(e.child_mode)} />
        <Chip
          label={text(e.visibility)}
          icon={e.visibility === 'private' ? 'lock-closed-outline' : 'earth-outline'}
        />
        {e.status === 'cancelled' && <Chip label={text('cancelled')} />}
      </View>
      <Text style={S.body}>{e.description}</Text>
      <View style={S.row}>
        <Icon name="calendar-outline" />
        <Text style={[S.body, { flex: 1 }]}>
          {formatDate(e.starts_at, locale)} –{' '}
          {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
            new Date(e.ends_at),
          )}
        </Text>
      </View>
      <View style={S.row}>
        <Icon name="location-outline" />
        <Text style={[S.body, { flex: 1 }]}>
          {e.location ||
            `${e.area} · ${locale === 'sv' ? 'Adress visas efter accepterad anmälan' : 'Address shown after accepted attendance'}`}
        </Text>
      </View>
      <Text style={S.muted}>
        {e.cost || text('free')} · {free} {text('spots')}
      </Text>
      {e.practical && (
        <>
          <Text style={S.label}>{text('practical')}</Text>
          <Text style={S.muted}>{e.practical}</Text>
        </>
      )}
      {(booking || submittedStatus) && (
        <Chip
          label={
            (booking?.status || submittedStatus) === 'pending'
              ? text('attendancePending')
              : text(booking?.status || submittedStatus!)
          }
        />
      )}
      {!own && !booking && !submittedStatus && !ended && e.status === 'active' && (
        <>
          <Field label={text('adults')} value={a} onChangeText={setA} keyboardType="number-pad" />
          {e.child_mode !== 'without' && (
            <Field label={text('children')} value={k} onChangeText={setK} keyboardType="number-pad" />
          )}
          <AsyncButton label={free ? text('join') : text('full')} run={join} />
        </>
      )}
      {localError && <Text style={{ color: C.red }}>{localError}</Text>}
      {(booking?.status || submittedStatus) === 'accepted' && chat && (
        <Button
          label={text('eventChat')}
          icon="chatbubbles-outline"
          onPress={() => {
            onClose();
            const draft =
              e.activity === 'language_learning'
                ? locale === 'sv'
                  ? 'Hej! Vi kommer gärna på språkfikan. Vi vill gärna öva svenska tillsammans.'
                  : 'Hi! We would love to join the language café and practise together.'
                : locale === 'sv'
                  ? 'Hej! Vi kommer gärna på träffen. Vi ser fram emot att ses.'
                  : 'Hi! We would love to join the meetup. Looking forward to meeting you.';
            nav.openChat(chat.id, draft);
          }}
        />
      )}
      {!own && booking && !ended && (
        <AsyncButton
          label={text('cancelAttendance')}
          secondary
          run={() => command('event_cancel_attendance', { event_id: e.id })}
        />
      )}
      <Text style={S.title}>{text('participants')}</Text>
      {state.attendance
        .filter((a) => a.event_id === e.id && a.status !== 'cancelled')
        .map((b) => (
          <View key={b.id} style={{ gap: 8 }}>
            <View style={S.between}>
              <Text style={[S.body, { flex: 1 }]}>
                {householdName(state.households.find((h) => h.id === b.household_id))} · {b.adults}{' '}
                {text('adults').toLowerCase()}{' '}
                {b.children ? `+ ${b.children} ${text('children').toLowerCase()}` : ''}
              </Text>
              <Chip label={text(b.status)} />
            </View>
            {own && b.status === 'pending' && (
              <View style={S.row}>
                <AsyncButton
                  label={text('accept')}
                  run={() =>
                    command('event_respond', { event_id: e.id, household_id: b.household_id, accept: true })
                  }
                />
                <AsyncButton
                  secondary
                  label={text('decline')}
                  run={() =>
                    command('event_respond', { event_id: e.id, household_id: b.household_id, accept: false })
                  }
                />
              </View>
            )}
          </View>
        ))}
      {own && e.visibility === 'private' && (
        <>
          <Text style={S.title}>{text('invite')}</Text>
          {state.households
            .filter((h) => isMatch(state, state.household_id!, h.id))
            .map((h) => (
              <AsyncButton
                key={h.id}
                secondary
                label={`${text('invite')} ${householdName(h)}`}
                run={() => command('event_invite', { event_id: e.id, target_id: h.id })}
              />
            ))}
        </>
      )}
      {own && !ended && e.status === 'active' && (
        <View style={S.stack}>
          <Button
            secondary
            label={text('edit')}
            onPress={() => {
              onClose();
              nav.openEditor('event', { event: e });
            }}
          />
          <AsyncButton
            secondary
            label={text('cancelEvent')}
            run={() => command('event_cancel', { event_id: e.id })}
          />
        </View>
      )}
      {ended && booking?.status === 'accepted' && !feedback && (
        <>
          <Text style={S.title}>{text('feedback')}</Text>
          <Toggle label={text('meetAgain')} value={again} onChange={setAgain} />
          <View style={S.row}>
            {[true, false].map((happened) => (
              <AsyncButton
                key={String(happened)}
                secondary
                label={text(happened ? 'yes' : 'no')}
                run={async () => {
                  await command('event_feedback', { event_id: e.id, happened, again });
                  setFeedback(true);
                }}
              />
            ))}
          </View>
        </>
      )}
      {ended && booking?.status === 'accepted' && (
        <Button
          label={text('again')}
          onPress={() => {
            onClose();
            nav.openEditor('event', {
              repeatFrom: e,
            });
          }}
        />
      )}
      {!own && (
        <Button
          secondary
          label={text('report')}
          onPress={() => {
            onClose();
            nav.openEditor('report', { targetId: e.id, targetType: 'event' });
          }}
        />
      )}
    </Sheet>
  );
}
export function GroupDetail({
  group: g,
  nav,
  onClose,
}: {
  group: Community;
  nav: Navigation;
  onClose: () => void;
}) {
  const { state, text, command } = useApp();
  const member = state.group_members.find(
    (m) => m.group_id === g.id && m.household_id === state.household_id,
  );
  const own = g.owner_household === state.household_id,
    chat = state.conversations.find((c) => c.group_id === g.id);
  return (
    <Sheet title={g.name} onClose={onClose}>
      <Art scene="coffee" height={140} />
      <Text style={S.body}>{g.description}</Text>
      <Text style={S.muted}>{g.area}</Text>
      {!member && (
        <AsyncButton label={text('groupJoin')} run={() => command('group_join', { group_id: g.id })} />
      )}{' '}
      {member?.status === 'pending' && <Chip label={text('pending')} />}{' '}
      {member?.status === 'accepted' && (
        <>
          <Button
            label={text('createEvent')}
            onPress={() => {
              onClose();
              nav.openEditor('event', { groupId: g.id });
            }}
          />
          {chat && (
            <Button
              label={text('groupChat')}
              secondary
              onPress={() => {
                onClose();
                nav.openChat(chat.id);
              }}
            />
          )}
        </>
      )}
      {state.group_members
        .filter((m) => m.group_id === g.id)
        .map((m) => (
          <View key={m.household_id} style={S.stack}>
            <Text style={S.body}>{householdName(state.households.find((h) => h.id === m.household_id))}</Text>
            {own && m.household_id !== state.household_id && (
              <View style={S.row}>
                {m.status === 'pending' && (
                  <AsyncButton
                    label={text('accept')}
                    run={() =>
                      command('group_respond', { group_id: g.id, household_id: m.household_id, accept: true })
                    }
                  />
                )}
                <AsyncButton
                  label={text('remove')}
                  secondary
                  run={() => command('group_remove', { group_id: g.id, household_id: m.household_id })}
                />
              </View>
            )}
          </View>
        ))}
      {state.events
        .filter((e) => e.group_id === g.id)
        .map((e) => (
          <Button
            key={e.id}
            label={e.title}
            secondary
            onPress={() => {
              onClose();
              nav.openEvent(e.id);
            }}
          />
        ))}
      {!own && member && (
        <AsyncButton
          label={text('groupLeave')}
          secondary
          run={async () => {
            await command('group_leave', { group_id: g.id });
            onClose();
          }}
        />
      )}
      {!own && (
        <Button
          secondary
          label={text('report')}
          onPress={() => {
            onClose();
            nav.openEditor('report', { targetId: g.id, targetType: 'group' });
          }}
        />
      )}
    </Sheet>
  );
}

export function Profile({ nav }: { nav: Navigation }) {
  const { state, text, locale, setLocale, command, signOut, demo } = useApp();
  const me = state.households.find((h) => h.id === state.household_id)!;
  const [notice, setNotice] = useState(''),
    [moderation, setModeration] = useState(false);
  const upload = async () => {
    try {
      const path = await pickAndUploadImage(command, demo);
      if (path) {
        await command('avatar_set', { path });
        setNotice(
          locale === 'sv'
            ? 'Bilden är inskickad. Nya bilder granskas innan andra ser dem.'
            : 'Photo submitted. New photos are reviewed before others see them.',
        );
      }
    } catch (e) {
      setNotice(errorMessage(String(e), locale === 'en'));
    }
  };
  const exportData = async () => {
    const data = demo ? state : (await supabase!.rpc('export_my_data')).data;
    if (!data) throw Error('EXPORT_FAILED');
    const content = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'companio-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const file = new File(Paths.cache, 'companio-export.json');
      file.write(content);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    }
  };
  return (
    <View style={{ gap: 25 }}>
      <View style={S.between}>
        <Text accessibilityRole="header" style={S.heading}>
          {text('profile')}
        </Text>
        <Button
          label={text('edit')}
          secondary
          icon="create-outline"
          onPress={() => nav.openEditor('profile')}
        />
      </View>
      <View style={[S.card, S.cardBody, { gap: 18 }]}>
        <View style={S.row}>
          {me.members.map((m) => (
            <Avatar key={m.id} name={m.name} path={m.avatar_path} size={70} />
          ))}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={S.title}>{householdName(me)}</Text>
            <Text style={S.muted}>{me.area}</Text>
          </View>
        </View>
        <View style={S.wrap}>
          <Chip label={text(me.kind)} />
          <Chip label={text(me.child_mode)} />
        </View>
        <Text style={S.body}>{me.bio || text('bio')}</Text>
        <View style={S.wrap}>
          {me.interests
            .filter((i) => !i.startsWith('practice_'))
            .map((i) => (
              <Chip key={i} label={text(i)} />
            ))}
        </View>
        <Text style={S.muted}>
          {locale === 'sv' ? 'Pratar' : 'Speaks'}: {me.languages.map(languageName).join(', ')}
        </Text>
        {me.interests.includes('language_learning') && practiceLanguages(me.interests).length > 0 && (
          <Text style={S.muted}>
            {locale === 'sv' ? 'Vill öva' : 'Practising'}:{' '}
            {practiceLanguages(me.interests).map(languageName).join(', ')}
          </Text>
        )}
        <AsyncButton secondary icon="image-outline" label={text('photo')} run={upload} />
        {me.members.length < 2 && ['couple', 'family'].includes(me.kind) && (
          <Button
            label={text('partner')}
            icon="person-add-outline"
            onPress={() => nav.openEditor('partner')}
          />
        )}
      </View>
      <View style={S.between}>
        <Text style={S.title}>{text('availability')}</Text>
        <IconButton label={text('availability')} name="add" onPress={() => nav.openEditor('availability')} />
      </View>
      {state.availability
        .filter((a) => a.household_id === me.id && canSeeAvailability(state, a))
        .map((a) => (
          <View key={a.id} style={[S.card, S.cardBody]}>
            <View style={S.between}>
              <Text style={S.body}>
                {text(a.activity)} · {text(a.child_mode)}
              </Text>
              <AsyncButton
                secondary
                label={text('remove')}
                run={() => command('availability_delete', { id: a.id })}
              />
            </View>
            <Text style={S.muted}>
              {formatDate(a.starts_at, locale)} · {text(a.visibility)}
            </Text>
          </View>
        ))}
      <Text style={S.title}>{locale === 'sv' ? 'Mina träffar' : 'My meetups'}</Text>
      {state.events
        .filter((e) =>
          state.attendance.some(
            (a) => a.event_id === e.id && a.household_id === me.id && a.status !== 'cancelled',
          ),
        )
        .map((e) => (
          <Button
            key={e.id}
            label={`${e.title} · ${formatDate(e.starts_at, locale, false)}`}
            secondary
            onPress={() => nav.openEvent(e.id)}
          />
        ))}
      <Text style={S.title}>{text('language')}</Text>
      <View style={S.wrap}>
        {(['sv', 'en'] as const).map((l) => (
          <Chip
            key={l}
            label={l === 'sv' ? 'Svenska' : 'English'}
            selected={locale === l}
            onPress={() => {
              setLocale(l);
              safely(command('profile_update', { locale: l }));
            }}
          />
        ))}
      </View>
      <AsyncButton
        label={text('enablePush')}
        icon="notifications-outline"
        secondary
        run={async () => {
          try {
            if (demo) throw Error('DEMO_ONLY');
            await registerPush(command);
            setNotice(text('completed'));
          } catch (e) {
            setNotice(errorMessage(String(e), locale === 'en'));
          }
        }}
      />
      {notice && (
        <Text accessibilityRole="alert" style={S.muted}>
          {notice}
        </Text>
      )}
      <Text style={S.title}>{text('safety')}</Text>
      <Text style={S.muted}>{text('communityRules')}</Text>
      <AsyncButton label={text('export')} secondary icon="download-outline" run={exportData} />
      {process.env.EXPO_PUBLIC_PRIVACY_URL && (
        <Button
          secondary
          label={text('privacy')}
          onPress={() => safely(Linking.openURL(process.env.EXPO_PUBLIC_PRIVACY_URL!))}
        />
      )}{' '}
      {process.env.EXPO_PUBLIC_SUPPORT_EMAIL && (
        <Button
          secondary
          label={text('support')}
          onPress={() => safely(Linking.openURL(`mailto:${process.env.EXPO_PUBLIC_SUPPORT_EMAIL}`))}
        />
      )}
      <Button secondary label={text('leaveHousehold')} onPress={() => nav.openEditor('leave')} />
      <Button danger label={text('delete')} onPress={() => nav.openEditor('delete')} />
      <Button secondary label={text(demo ? 'backToLogin' : 'signOut')} onPress={() => safely(signOut())} />
      {state.is_moderator && (
        <>
          <Button label={text('moderation')} onPress={() => setModeration(!moderation)} />
          {moderation && (
            <>
              {state.reports
                .filter((r) => r.status === 'open')
                .map((r) => (
                  <View key={r.id} style={[S.card, S.cardBody]}>
                    <Text style={S.label}>{r.target_type}</Text>
                    <Text style={S.body}>{r.reason}</Text>
                    <AsyncButton
                      label={text('resolve')}
                      run={() => command('report_resolve', { id: r.id })}
                    />
                  </View>
                ))}
              {state.media_queue?.map((m) => (
                <View key={m.id} style={[S.card, S.cardBody]}>
                  <MediaImage path={m.path} />
                  <View style={S.row}>
                    <AsyncButton
                      label={text('accept')}
                      run={() => command('media_review', { id: m.id, approve: true })}
                    />
                    <AsyncButton
                      label={text('decline')}
                      secondary
                      run={() => command('media_review', { id: m.id, approve: false })}
                    />
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
