import React, { useState } from 'react';
import { Platform, Share, Text, View, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../data/AppProvider';
import { useApp as useContextApp } from '../data/AppProvider';
import { supabase } from '../data/client';
import { pickAndUploadImage } from '../data/media';
import { CHILD_AGES, INTERESTS, validateParty, validateWindow } from '../domain/rules';
import { localInput, parseLocalInput } from '../i18n';
import type { Command, Gathering, HouseholdKind, Payload } from '../domain/types';
import { Button, Chip, Field, Sheet, Toggle, MediaImage } from './components';
import { COMMUNITY_TEMPLATES, templateText } from '../domain/discovery';
import { DateTimeField } from './DateTimeField';
import { LanguagePreferences } from './LanguagePreferences';
import { C, S } from './theme';

const CITIES: [string, number, number][] = [
  ['Stockholm', 59.33, 18.07],
  ['Göteborg', 57.71, 11.97],
  ['Malmö', 55.61, 13],
  ['Uppsala', 59.86, 17.64],
  ['Linköping', 58.41, 15.62],
  ['Västerås', 59.61, 16.54],
  ['Örebro', 59.27, 15.21],
  ['Lund', 55.7, 13.19],
  ['Helsingborg', 56.05, 12.69],
  ['Umeå', 63.83, 20.26],
  ['Luleå', 65.58, 22.15],
  ['Jönköping', 57.78, 14.16],
  ['Norrköping', 58.59, 16.19],
  ['Gävle', 60.67, 17.14],
  ['Borås', 57.72, 12.94],
  ['Karlstad', 59.38, 13.5],
  ['Växjö', 56.88, 14.81],
  ['Halmstad', 56.67, 12.86],
  ['Sundsvall', 62.39, 17.31],
  ['Östersund', 63.18, 14.64],
  ['Visby', 57.63, 18.29],
  ['Kiruna', 67.86, 20.23],
];
export const errorMessage = (error: string, english: boolean) => {
  const codes: Record<string, [string, string]> = {
    CONTENT_REVIEW: [
      'Texten behöver ändras för att följa gemenskapsreglerna.',
      'Please update the text to follow the community guidelines.',
    ],
    SUSPENDED: [
      'Hushållet är pausat. Kontakta support för omprövning.',
      'This household is suspended. Contact support to appeal.',
    ],
    AUTH_REQUIRED: ['Logga in igen.', 'Please sign in again.'],
    INVALID_TIME: ['Kontrollera start och sluttid.', 'Check the start and end times.'],
    INVALID_PARTY: ['Kontrollera antal vuxna och barn.', 'Check the number of adults and children.'],
    MATCH_REQUIRED: ['Ni behöver matcha först.', 'Connect with this household first.'],
    NOT_AVAILABLE: ['Det här är inte längre tillgängligt.', 'This is no longer available.'],
    EVENT_CLOSED: ['Träffen har redan börjat eller ställts in.', 'This meetup has started or was cancelled.'],
    HOUSEHOLD_FULL: ['Hushållet har redan två vuxna.', 'The household already has two adults.'],
    INVALID_INVITATION: [
      'Inbjudan har gått ut eller är ogiltig.',
      'The invitation has expired or is invalid.',
    ],
    CONTACT_LIMIT: [
      'Dagens kontaktförfrågningar är slut. Försök imorgon.',
      'Daily connection limit reached. Try tomorrow.',
    ],
    RATE_LIMIT: ['Lite för många försök. Vänta en minut.', 'Too many attempts. Please wait a minute.'],
    IPHONE_REQUIRED: [
      'Pushnotiser aktiveras på en fysisk iPhone.',
      'Enable push notifications on a physical iPhone.',
    ],
    NOTIFICATION_PERMISSION_DENIED: [
      'Tillåt notiser i telefonens inställningar.',
      'Allow notifications in your device settings.',
    ],
    DEMO_ONLY: ['Detta kräver ett anslutet konto.', 'This requires a connected account.'],
    BACKEND_NOT_CONFIGURED: ['Tjänsten är ännu inte ansluten.', 'The service is not connected yet.'],
    CAPACITY_BELOW_ATTENDANCE: [
      'Kapaciteten kan inte vara lägre än antalet anmälda.',
      'Capacity cannot be lower than current attendance.',
    ],
  };
  const code = Object.keys(codes).find((c) => error.includes(c));
  return code
    ? codes[code][english ? 1 : 0]
    : english
      ? 'Could not save. Check the fields and try again.'
      : 'Det gick inte att spara. Kontrollera fälten och försök igen.';
};
export function PlaceFields({
  value,
  onChange,
}: {
  value: { area: string; latitude: number; longitude: number };
  onChange: (v: typeof value) => void;
}) {
  const { text, locale } = useApp();
  const [advanced, setAdvanced] = useState(false),
    [message, setMessage] = useState(''),
    [query, setQuery] = useState('');
  const locate = async () => {
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') {
        setMessage(
          locale === 'sv'
            ? 'Du kan välja en ort eller ange ungefärlig plats utan GPS.'
            : 'Choose a town or enter an approximate location without GPS.',
        );
        return;
      }
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onChange({
        ...value,
        latitude: Math.round(point.coords.latitude * 100) / 100,
        longitude: Math.round(point.coords.longitude * 100) / 100,
      });
      setMessage(
        locale === 'sv'
          ? 'Ungefärlig plats vald. Ange områdets namn ovan.'
          : 'Approximate location selected. Enter the area name above.',
      );
    } catch {
      setMessage(
        locale === 'sv'
          ? 'Platsen kunde inte hämtas. Välj en ort nedan.'
          : 'Could not get your location. Choose a town below.',
      );
    }
  };
  return (
    <View style={S.stack}>
      <Field label={text('area')} value={value.area} onChangeText={(area) => onChange({ ...value, area })} />
      <Text style={S.muted}>{text('locationHelp')}</Text>
      <Field
        label={locale === 'sv' ? 'Närmaste ort för avstånd' : 'Nearest town for distances'}
        value={query}
        onChangeText={setQuery}
        placeholder={locale === 'sv' ? 'Sök ort…' : 'Search town…'}
      />
      <View style={S.wrap}>
        {CITIES.filter((c) => !query || c[0].toLowerCase().includes(query.toLowerCase()))
          .slice(0, query ? 8 : 4)
          .map(([city, latitude, longitude]) => (
            <Chip
              key={city}
              label={city}
              selected={value.latitude === latitude && value.longitude === longitude}
              onPress={() => {
                onChange({ area: city, latitude, longitude });
                setQuery(city);
              }}
            />
          ))}
      </View>
      <Button label={text('useLocation')} icon="locate-outline" secondary onPress={() => void locate()} />
      {message && <Text style={S.muted}>{message}</Text>}
      <Button
        label={locale === 'sv' ? 'Ange annan plats utan GPS' : 'Set another location without GPS'}
        secondary
        small
        onPress={() => setAdvanced(!advanced)}
      />
      {advanced && (
        <View style={S.row}>
          <View style={{ flex: 1 }}>
            <Field
              label={locale === 'sv' ? 'Latitud (ungefärlig)' : 'Approximate latitude'}
              value={String(value.latitude)}
              keyboardType="numbers-and-punctuation"
              onChangeText={(v) => onChange({ ...value, latitude: Number(v.replace(',', '.')) })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={locale === 'sv' ? 'Longitud (ungefärlig)' : 'Approximate longitude'}
              value={String(value.longitude)}
              keyboardType="numbers-and-punctuation"
              onChangeText={(v) => onChange({ ...value, longitude: Number(v.replace(',', '.')) })}
            />
          </View>
        </View>
      )}
    </View>
  );
}
export function Onboarding() {
  const { command, text, locale, setLocale, state, signOut } = useApp();
  const [step, setStep] = useState(0),
    [name, setName] = useState(state.adult?.name || ''),
    [kind, setKind] = useState<HouseholdKind>('family'),
    [age, setAge] = useState(false),
    [interests, setInterests] = useState<string[]>(['coffee']),
    [mode, setMode] = useState('either'),
    [place, setPlace] = useState({ area: '', latitude: 59.33, longitude: 18.07 }),
    [langs, setLangs] = useState<string[]>(['sv']),
    [token, setToken] = useState(''),
    [joining, setJoining] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      if (!age || !name.trim() || (!joining && !place.area.trim())) throw Error('REQUIRED');
      await command(
        joining ? 'partner_accept' : 'onboard',
        joining
          ? { token, name, locale, adult_confirmed: age }
          : {
              name,
              kind,
              locale,
              adult_confirmed: age,
              ...place,
              interests,
              languages: langs,
              child_mode: mode,
            },
      );
    } catch (e) {
      setError(errorMessage(String(e), locale === 'en'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[S.card, { width: '100%', maxWidth: 560, alignSelf: 'center', marginVertical: 20 }]}>
      <View style={[S.cardBody, { padding: 28, gap: 22 }]}>
        <Text style={S.eyebrow}>
          {locale === 'sv' ? `VÄLKOMMEN HEM · ${step + 1}/3` : `MAKE YOURSELF AT HOME · ${step + 1}/3`}
        </Text>
        <Text style={S.heading}>{text('setup')}</Text>
        <View style={S.wrap}>
          <Chip label="Svenska" selected={locale === 'sv'} onPress={() => setLocale('sv')} />
          <Chip label="English" selected={locale === 'en'} onPress={() => setLocale('en')} />
        </View>
        {step === 0 && (
          <>
            <Field label={text('name')} value={name} onChangeText={setName} maxLength={60} />
            <Text style={S.label}>{text('householdType')}</Text>
            <View style={S.wrap}>
              {(['family', 'couple', 'single_parent', 'solo'] as const).map((k) => (
                <Chip key={k} label={text(k)} selected={kind === k} onPress={() => setKind(k)} />
              ))}
            </View>
            <Text style={S.muted}>{text('communityRules')}</Text>
            <Toggle label={text('adultConfirm')} value={age} onChange={setAge} />
            <Toggle label={text('joinHousehold')} value={joining} onChange={setJoining} />
            {joining && (
              <>
                <Field
                  label={text('inviteCode')}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                />
                <Text style={S.muted}>{text('partnerWarning')}</Text>
              </>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <PlaceFields value={place} onChange={setPlace} />
            <LanguagePreferences
              languages={langs}
              onLanguages={setLangs}
              interests={interests}
              onInterests={setInterests}
            />
          </>
        )}
        {step === 2 && (
          <>
            <Text style={S.label}>{text('interests')}</Text>
            <View style={S.wrap}>
              {INTERESTS.map((i) => (
                <Chip
                  key={i}
                  label={text(i)}
                  selected={interests.includes(i)}
                  onPress={() =>
                    setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])
                  }
                />
              ))}
            </View>
            <Text style={S.label}>{text('preferences')}</Text>
            <View style={S.wrap}>
              {['with', 'without', 'either'].map((m) => (
                <Chip key={m} label={text(m)} selected={mode === m} onPress={() => setMode(m)} />
              ))}
            </View>
            <Text style={S.muted}>
              {locale === 'sv'
                ? 'Bjud in din partner och lägg till en vuxenbild från profilen när ni är inne.'
                : 'Invite your partner and add an adult photo from your profile after joining.'}
            </Text>
          </>
        )}
        {error && (
          <Text accessibilityRole="alert" style={{ color: C.red }}>
            {error}
          </Text>
        )}
        <View style={S.between}>
          <Button
            secondary
            label={step ? text('back') : text('signOut')}
            onPress={() => (step ? setStep(step - 1) : void signOut())}
          />
          <Button
            label={busy ? '…' : step === 2 || joining ? text('done') : text('next')}
            disabled={
              busy ||
              !age ||
              !name.trim() ||
              (step === 1 && (!place.area.trim() || !langs.length)) ||
              (joining && !token.trim())
            }
            onPress={() => (step === 2 || joining ? void finish() : setStep(step + 1))}
          />
        </View>
      </View>
    </View>
  );
}

export type EditorKind =
  'availability' | 'event' | 'group' | 'profile' | 'contact' | 'report' | 'partner' | 'delete' | 'leave';
export interface EditorProps {
  kind: EditorKind;
  onClose: () => void;
  targetId?: string;
  targetType?: string;
  event?: Gathering;
  groupId?: string;
  templateId?: string;
  onDone?: (result: Record<string, unknown>) => void;
}
export function Editor({
  kind,
  onClose,
  targetId,
  targetType,
  event,
  groupId,
  templateId,
  onDone,
}: EditorProps) {
  const { state, command, text, locale, demo } = useApp();
  const me = state.households.find((h) => h.id === state.household_id)!;
  const template = COMMUNITY_TEMPLATES.find((t) => t.id === templateId);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const later = new Date(tomorrow.getTime() + 2 * 3600000);
  const [name, setName] = useState(
      kind === 'profile' ? state.adult?.name || '' : template ? templateText(template.name, locale) : '',
    ),
    [title, setTitle] = useState(event?.title || ''),
    [description, setDescription] = useState(
      event?.description || (template ? templateText(template.description, locale) : ''),
    ),
    [bio, setBio] = useState(me.bio),
    [activity, setActivity] = useState(event?.activity || 'coffee'),
    [start, setStart] = useState(localInput(event ? new Date(event.starts_at) : tomorrow)),
    [end, setEnd] = useState(localInput(event ? new Date(event.ends_at) : later)),
    [mode, setMode] = useState(event?.child_mode || me.child_mode),
    [visibility, setVisibility] = useState('matches'),
    [eventVisibility, setEventVisibility] = useState(event?.visibility || 'public'),
    [location, setLocation] = useState(event?.location || ''),
    [capacity, setCapacity] = useState(String(event?.capacity || 8)),
    [adults, setAdults] = useState('1'),
    [children, setChildren] = useState('0'),
    [cost, setCost] = useState(event?.cost || ''),
    [practical, setPractical] = useState(event?.practical || ''),
    [approval, setApproval] = useState(event?.approval || false),
    [greeting, setGreeting] = useState(''),
    [reason, setReason] = useState(''),
    [radius, setRadius] = useState(String(me.radius_km)),
    [energy, setEnergy] = useState(me.energy),
    [interests, setInterests] = useState(me.interests),
    [ages, setAges] = useState(me.child_ages),
    [preferred, setPreferred] = useState(me.preferred_kinds),
    [languages, setLanguages] = useState(me.languages),
    [place, setPlace] = useState({ area: me.area, latitude: me.latitude, longitude: me.longitude }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [token, setToken] = useState(''),
    [confirm, setConfirm] = useState('');
  const labels: Record<EditorKind, string> = {
    availability: 'availability',
    event: 'createEvent',
    group: 'createGroup',
    profile: 'edit',
    contact: 'contact',
    report: 'report',
    partner: 'partner',
    delete: 'delete',
    leave: 'leaveHousehold',
  };
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      let action: Command;
      let p: Payload = {};
      if (kind === 'availability' || kind === 'event') {
        const starts_at = parseLocalInput(start),
          ends_at = parseLocalInput(end);
        if (!validateWindow(starts_at, ends_at)) throw Error('INVALID_TIME');
        if (!validateParty(Number(adults), Number(children))) throw Error('INVALID_PARTY');
        p = {
          activity,
          starts_at,
          ends_at,
          child_mode: mode,
          adults: Number(adults),
          children: Number(children),
        };
        if (kind === 'availability') {
          action = 'availability_create';
          p.visibility = visibility;
        } else {
          if (!title.trim() || !location.trim()) throw Error('REQUIRED');
          action = event ? 'event_update' : 'event_create';
          p = {
            ...p,
            id: event?.id,
            title,
            description,
            location,
            visibility: eventVisibility,
            capacity: Number(capacity),
            approval,
            cost,
            practical,
            group_id: groupId || event?.group_id,
          };
        }
      } else if (kind === 'group') {
        action = 'group_create';
        p = { name, description, approval };
        if (!name.trim()) throw Error('REQUIRED');
      } else if (kind === 'profile') {
        action = 'profile_update';
        p = {
          name,
          bio,
          radius_km: Number(radius),
          energy,
          child_mode: mode,
          interests,
          child_ages: ages,
          preferred_kinds: preferred,
          languages,
          ...place,
        };
        if (!name.trim() || !place.area.trim() || !languages.length) throw Error('REQUIRED');
      } else if (kind === 'contact') {
        action = 'contact_request';
        p = { target_id: targetId, greeting };
        if (!greeting.trim()) throw Error('REQUIRED');
      } else if (kind === 'report') {
        action = 'report';
        p = { target_type: targetType || 'household', target_id: targetId, reason };
        if (reason.trim().length < 5) throw Error('REQUIRED');
      } else if (kind === 'partner') {
        action = 'partner_invite';
      } else if (kind === 'leave') {
        action = 'household_leave';
      } else {
        if (confirm !== (locale === 'sv' ? 'RADERA' : 'DELETE')) throw Error('REQUIRED');
        action = 'account_delete';
      }
      const result = await command(action, p);
      if (kind === 'partner') {
        setToken(String(result.token));
      } else {
        onDone?.(result);
        onClose();
      }
    } catch (e) {
      setError(errorMessage(String(e), locale === 'en'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title={event ? text('edit') : text(labels[kind])} onClose={onClose}>
      {(kind === 'event' || kind === 'availability') && (
        <>
          <Text style={S.label}>{text('activity')}</Text>
          <View style={S.wrap}>
            {INTERESTS.map((i) => (
              <Chip key={i} label={text(i)} selected={activity === i} onPress={() => setActivity(i)} />
            ))}
          </View>
          {kind === 'event' && (
            <>
              <Field label={text('title')} value={title} onChangeText={setTitle} maxLength={100} />
              <Field
                label={text('description')}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={2000}
              />
            </>
          )}
          <DateTimeField
            label={text('start')}
            value={start}
            minimum={new Date()}
            onChange={(value) => {
              const previous = Date.parse(parseLocalInput(start));
              const duration = Date.parse(parseLocalInput(end)) - previous;
              setStart(value);
              setEnd(
                localInput(
                  new Date(
                    Date.parse(parseLocalInput(value)) +
                      Math.max(300000, Math.min(86400000, duration || 7200000)),
                  ),
                ),
              );
            }}
          />
          <DateTimeField
            label={text('end')}
            value={end}
            minimum={new Date(parseLocalInput(start))}
            onChange={setEnd}
          />
          <View style={S.wrap}>
            {['with', 'without', 'either'].map((m) => (
              <Chip key={m} label={text(m)} selected={mode === m} onPress={() => setMode(m as typeof mode)} />
            ))}
          </View>
          <Field label={text('adults')} value={adults} keyboardType="number-pad" onChangeText={setAdults} />
        </>
      )}
      {kind === 'availability' && (
        <>
          <Text style={S.label}>{text('visibility')}</Text>
          <View style={S.wrap}>
            {['matches', 'nearby'].map((v) => (
              <Chip key={v} label={text(v)} selected={visibility === v} onPress={() => setVisibility(v)} />
            ))}
          </View>
          <Text style={S.muted}>{text('visibilityHelp')}</Text>
        </>
      )}
      {kind === 'event' && (
        <>
          {!event && (
            <View style={S.wrap}>
              {['public', 'private'].map((v) => (
                <Chip
                  key={v}
                  label={text(v)}
                  selected={eventVisibility === v}
                  onPress={() => setEventVisibility(v as 'public' | 'private')}
                />
              ))}
            </View>
          )}
          <Text style={S.muted}>{text(eventVisibility === 'public' ? 'publicHelp' : 'privateHelp')}</Text>
          <Field label={text('location')} value={location || ''} onChangeText={setLocation} maxLength={300} />
          <Field
            label={text('capacity')}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
          />
          {!event && (
            <Field
              label={text('children')}
              value={children}
              onChangeText={setChildren}
              keyboardType="number-pad"
            />
          )}
          <Field label={text('cost')} value={cost} onChangeText={setCost} placeholder={text('free')} />
          <Field
            label={text('practical')}
            value={practical}
            onChangeText={setPractical}
            multiline
            maxLength={600}
          />
          {!event && <Toggle label={text('approval')} value={approval} onChange={setApproval} />}
        </>
      )}
      {kind === 'group' && (
        <>
          <Field
            label={locale === 'sv' ? 'Sammanhangets namn' : 'Community name'}
            value={name}
            onChangeText={setName}
            maxLength={100}
          />
          <Field
            label={text('description')}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
          />
          <Toggle label={text('approval')} value={approval} onChange={setApproval} />
        </>
      )}
      {kind === 'profile' && (
        <>
          <Field label={text('name')} value={name} onChangeText={setName} />
          <Field label={text('bio')} value={bio} onChangeText={setBio} multiline maxLength={600} />
          <PlaceFields value={place} onChange={setPlace} />
          <Field label={text('radius')} value={radius} onChangeText={setRadius} keyboardType="number-pad" />
          <Text style={S.label}>{text('preferences')}</Text>
          <View style={S.wrap}>
            {(['couple', 'family', 'single_parent'] as const).map((k) => (
              <Chip
                key={k}
                label={text(k)}
                selected={preferred.includes(k)}
                onPress={() =>
                  setPreferred(preferred.includes(k) ? preferred.filter((x) => x !== k) : [...preferred, k])
                }
              />
            ))}
          </View>
          <Text style={S.muted}>
            {locale === 'sv' ? 'Inget valt = alla hushållstyper.' : 'Nothing selected = all household types.'}
          </Text>
          <View style={S.wrap}>
            {['with', 'without', 'either'].map((m) => (
              <Chip
                key={m}
                label={text(m)}
                selected={mode === m}
                onPress={() => {
                  setMode(m as typeof mode);
                }}
              />
            ))}
          </View>
          <Text style={S.label}>{text('energy')}</Text>
          <View style={S.wrap}>
            {(['quiet', 'balanced', 'lively'] as const).map((e) => (
              <Chip key={e} label={text(e)} selected={energy === e} onPress={() => setEnergy(e)} />
            ))}
          </View>
          <Text style={S.label}>{text('interests')}</Text>
          <View style={S.wrap}>
            {INTERESTS.map((i) => (
              <Chip
                key={i}
                label={text(i)}
                selected={interests.includes(i)}
                onPress={() =>
                  setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])
                }
              />
            ))}
          </View>
          <LanguagePreferences
            languages={languages}
            onLanguages={setLanguages}
            interests={interests}
            onInterests={setInterests}
          />
          {(me.kind === 'family' || me.kind === 'single_parent') && (
            <>
              <Text style={S.label}>{text('childAges')}</Text>
              <View style={S.wrap}>
                {CHILD_AGES.map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    selected={ages.includes(a)}
                    onPress={() => setAges(ages.includes(a) ? ages.filter((x) => x !== a) : [...ages, a])}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
      {kind === 'contact' && (
        <Field
          label={text('message')}
          value={greeting}
          onChangeText={setGreeting}
          multiline
          maxLength={500}
        />
      )}
      {kind === 'report' && (
        <>
          <Text style={S.muted}>{text('reportHelp')}</Text>
          <Field label={text('reason')} value={reason} onChangeText={setReason} multiline maxLength={2000} />
        </>
      )}
      {kind === 'partner' && (
        <>
          <Text style={S.body}>{text('partnerWarning')}</Text>
          {token && (
            <>
              <Field label={text('inviteCode')} value={token} editable={false} multiline />
              <Text style={S.muted}>
                {demo
                  ? text('demoHelp')
                  : locale === 'sv'
                    ? 'Koden gäller i 48 timmar och kan bara användas en gång.'
                    : 'The code is valid for 48 hours and can only be used once.'}
              </Text>
              <Button
                label={locale === 'sv' ? 'Kopiera kod' : 'Copy code'}
                secondary
                onPress={() => void Clipboard.setStringAsync(token)}
              />
            </>
          )}
        </>
      )}
      {kind === 'delete' && (
        <>
          <Text style={S.body}>{text('deleteWarning')}</Text>
          <Field
            label={locale === 'sv' ? 'Bekräfta med RADERA' : 'Confirm with DELETE'}
            value={confirm}
            onChangeText={setConfirm}
          />
        </>
      )}
      {kind === 'leave' && (
        <Text style={S.body}>
          {locale === 'sv'
            ? 'Du förlorar åtkomsten till hushållets chattar, favoriter och privata uppgifter. Din partners konto behålls.'
            : 'You will lose access to household chats, favorites and private details. Your partner’s account remains.'}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" style={{ color: C.red }}>
          {error}
        </Text>
      )}
      <Button
        label={
          busy
            ? '…'
            : kind === 'contact'
              ? text('send')
              : kind === 'partner'
                ? token
                  ? text('done')
                  : text('invite')
                : text('save')
        }
        disabled={busy}
        danger={kind === 'delete' || kind === 'leave'}
        onPress={() => (kind === 'partner' && token ? onClose() : void submit())}
      />
    </Sheet>
  );
}
