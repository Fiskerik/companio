import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../data/AppProvider';
import {
  COMMUNITY_TEMPLATES,
  localDay,
  templateText,
  timelineDays,
  type TimelineItem,
} from '../domain/discovery';
import { householdName, seatsAvailable } from '../domain/rules';
import { Button, Chip, Empty, Icon, IconButton, type IconName } from './components';
import { Reveal } from './Motion';
import { C, S } from './theme';
import type { Navigation } from './screens';

export function Discover({ nav }: { nav: Navigation }) {
  const { state, text, locale, demo } = useApp();
  const [section, setSection] = useState('calendar');
  const [when, setWhen] = useState('all');
  const [mode, setMode] = useState('all');
  const [scope, setScope] = useState('all');
  const [showChildFilter, setShowChildFilter] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const me = state.households.find((h) => h.id === state.household_id)!;
  const days = timelineDays(state, { when, mode, scope });
  const groups = state.groups.filter((g) => !state.blocked_ids.includes(g.owner_household));
  const sv = locale === 'sv';
  const time = (value: string) =>
    new Date(value).toLocaleTimeString(sv ? 'sv-SE' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const row = (item: TimelineItem) => {
    const event = item.kind === 'event' ? item.event : null;
    const slot = item.kind === 'availability' ? item.slot : null;
    const h = state.households.find((h) => h.id === slot?.household_id);
    const title = event?.title || `${householdName(h)} · ${text(slot!.activity)}`;
    const places = event
      ? seatsAvailable(
          event.capacity,
          state.attendance.filter((a) => a.event_id === event.id),
        )
      : null;
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() =>
          event
            ? nav.openEvent(event.id)
            : item.mine
              ? nav.go('profile')
              : nav.openHousehold(slot!.household_id)
        }
        style={({ pressed }) => [
          S.row,
          { alignItems: 'flex-start', paddingVertical: 11, opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <View style={{ width: 43, paddingTop: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink }}>{time(item.start)}</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{time(item.end)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: C.ink }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: C.muted }}>
            {event?.area || h?.area} · {text(event?.child_mode || slot!.child_mode)}
          </Text>
          <Text style={{ fontSize: 11, color: item.mine ? C.green : C.coral, fontWeight: '500' }}>
            {item.mine
              ? event
                ? sv
                  ? 'I er kalender'
                  : 'In your calendar'
                : sv
                  ? 'Ni vill ses'
                  : 'You’re free'
              : event
                ? `${places ? `${places} ${text('spots')}` : text('full')}`
                : sv
                  ? 'Vill ses · tillgänglighet'
                  : 'Wants to meet · availability'}
          </Text>
        </View>
        <Icon name={event ? 'chevron-forward' : 'chatbubbles-outline'} size={16} color={C.muted} />
      </Pressable>
    );
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={S.between}>
        <View style={{ gap: 3, flex: 1 }}>
          <Text accessibilityRole="header" style={[S.heading, { fontSize: 25, lineHeight: 30 }]}>
            {sv ? 'Lite mer sällskap.' : 'A little more company.'}
          </Text>
          <Text style={[S.muted, { fontSize: 12 }]}>
            {me.area} · {me.radius_km} km
          </Text>
        </View>
        <IconButton
          label={sv ? 'När kan ni ses?' : 'When are you free?'}
          name="time-outline"
          onPress={() => nav.openEditor('availability')}
        />
      </View>
      <View style={[S.row, { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }]}>
        {['calendar', 'groups'].map((id) => (
          <Chip
            key={id}
            label={id === 'calendar' ? (sv ? 'Kalender' : 'Calendar') : text('groups')}
            selected={section === id}
            onPress={() => setSection(id)}
            icon={id === 'calendar' ? 'calendar-outline' : 'people-outline'}
          />
        ))}
      </View>
      {section === 'calendar' ? (
        <Reveal key="calendar" style={{ gap: 12 }}>
          <View style={S.row}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
              {['all', 'today', 'week'].map((v) => (
                <Chip
                  key={v}
                  label={v === 'week' ? (sv ? 'Veckan' : 'Week') : text(v)}
                  selected={when === v}
                  onPress={() => setWhen(v)}
                />
              ))}
              <Chip
                label={sv ? 'Min kalender' : 'My calendar'}
                selected={scope === 'mine'}
                onPress={() => setScope(scope === 'mine' ? 'all' : 'mine')}
              />
            </ScrollView>
            <IconButton
              name="options-outline"
              label={sv ? 'Filtrera barnläge' : 'Filter children'}
              active={showChildFilter || mode !== 'all'}
              onPress={() => setShowChildFilter(!showChildFilter)}
            />
          </View>
          {showChildFilter && (
            <Reveal style={S.wrap}>
              {['with', 'without'].map((v) => (
                <Chip
                  key={v}
                  label={text(v)}
                  selected={mode === v}
                  onPress={() => setMode(mode === v ? 'all' : v)}
                />
              ))}
            </Reveal>
          )}
          <Text style={{ fontSize: 12, color: C.muted }}>
            {sv ? 'Era planer & sällskap nära er' : 'Your plans & company nearby'}
            {mode !== 'all' ? ` · ${text(mode)}` : ''}
          </Text>
          {days.map(({ day, items }) => {
            const date = new Date(`${day}T12:00:00`);
            const open = expanded.includes(day);
            const label = date.toLocaleDateString(sv ? 'sv-SE' : 'en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            });
            return (
              <View key={day} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 38, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 36,
                      height: 40,
                      backgroundColor: day === localDay(new Date()) ? C.green : C.lime,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                        color: day === localDay(new Date()) ? 'white' : C.green,
                      }}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                  <View
                    style={{ width: 2, flex: 1, minHeight: 10, backgroundColor: C.border, marginTop: 5 }}
                  />
                </View>
                <View style={{ flex: 1, paddingBottom: 6 }}>
                  <Pressable
                    accessibilityRole={items.length > 2 ? 'button' : undefined}
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={`${open ? (sv ? 'Visa färre' : 'Show less') : sv ? `Visa alla ${items.length} aktiviteter` : `Show all ${items.length} activities`} · ${label}`}
                    onPress={() => setExpanded(open ? expanded.filter((d) => d !== day) : [...expanded, day])}
                    style={[S.between, { minHeight: 44 }]}
                  >
                    <Text
                      accessibilityRole="header"
                      style={{ fontSize: 13, color: C.ink, fontWeight: '600', flex: 1 }}
                    >
                      {label}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.green }}>
                      {items.length > 2 && !open ? `+ ${items.length - 2}` : items.length}
                    </Text>
                    {items.length > 2 && <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />}
                  </Pressable>
                  <View style={[S.card, { borderRadius: 14, paddingHorizontal: 12 }]}>
                    {items.slice(0, 2).map(row)}
                    {open && <Reveal>{items.slice(2).map(row)}</Reveal>}
                  </View>
                </View>
              </View>
            );
          })}
          {!days.length && (
            <Empty
              title={text('noResults')}
              body={
                sv
                  ? 'Inga aktiviteter inom de här valen. Välj en annan period eller skapa en egen träff.'
                  : 'No activities with these choices. Try another period or create a meetup.'
              }
            >
              <Button label={text('createEvent')} onPress={() => nav.openEditor('event')} />
            </Empty>
          )}
        </Reveal>
      ) : (
        <Reveal key="groups" style={{ gap: 12 }}>
          <Text style={S.muted}>{text('groupsSub')}</Text>
          {demo && (
            <Text style={{ fontSize: 12, color: C.coral }}>
              {sv
                ? 'Förskapade exempel – prova att gå med och skapa en träff.'
                : 'Example communities – try joining and creating a meetup.'}
            </Text>
          )}
          {groups.map((g, i) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={g.name}
              onPress={() => nav.openGroup(g.id)}
              style={[S.card, S.row, { padding: 13, borderRadius: 14 }]}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: i % 2 ? C.peach : C.lime,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={COMMUNITY_TEMPLATES[i % COMMUNITY_TEMPLATES.length].icon} size={21} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{g.name}</Text>
                <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 18, color: C.muted }}>
                  {g.description}
                </Text>
                <Text style={{ fontSize: 11, color: C.green }}>
                  {g.area}
                  {state.group_members.some(
                    (m) => m.group_id === g.id && m.household_id === me.id && m.status === 'accepted',
                  )
                    ? ` · ${sv ? 'Medlem' : 'Member'}`
                    : ''}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} />
            </Pressable>
          ))}
          {!groups.length && (
            <Text style={S.muted}>
              {sv
                ? 'Inga sammanhang här ännu. Starta ett med en mall nedan.'
                : 'No communities here yet. Start one from a template below.'}
            </Text>
          )}
          <Text accessibilityRole="header" style={[S.title, { marginTop: 10 }]}>
            {sv ? 'Starta ett sammanhang' : 'Start a community'}
          </Text>
          <Text style={S.muted}>
            {sv
              ? 'Välj en mall och anpassa den för ert område innan du sparar.'
              : 'Choose a template and adapt it for your area before saving.'}
          </Text>
          {COMMUNITY_TEMPLATES.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${sv ? 'Använd mall' : 'Use template'}: ${templateText(t.name, locale)}`}
              onPress={() => nav.openEditor('group', { templateId: t.id })}
              style={[S.between, { minHeight: 48, borderBottomWidth: 1, borderBottomColor: C.border }]}
            >
              <Icon name={t.icon as IconName} size={18} />
              <Text style={[S.body, { flex: 1, fontSize: 14 }]}>{templateText(t.name, locale)}</Text>
              <Icon name="add" size={18} />
            </Pressable>
          ))}
          <Button
            secondary
            label={sv ? 'Skapa ett eget' : 'Create your own'}
            onPress={() => nav.openEditor('group')}
          />
        </Reveal>
      )}
    </View>
  );
}
