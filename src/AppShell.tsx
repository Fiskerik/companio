import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { AppProvider, useApp } from './data/AppProvider';
import { Reveal } from './ui/Motion';
import { backendConfigured, demoEnabled, supabase } from './data/client';
import { canSeeAvailability } from './domain/rules';
import { Art, Avatar, Button, Chip, Field, Icon, IconButton, Logo, type IconName } from './ui/components';
import { Editor, Onboarding, errorMessage, type EditorKind, type EditorProps } from './ui/Forms';
import {
  AvailabilityCard,
  Discover,
  EventDetail,
  Favorites,
  GroupDetail,
  HouseholdDetail,
  Inbox,
  People,
  Profile,
  type Navigation,
} from './ui/screens';
import { C, S, serif } from './ui/theme';

const tabs: { id: string; icon: IconName; activeIcon: IconName }[] = [
  { id: 'discover', icon: 'compass-outline', activeIcon: 'compass' },
  { id: 'people', icon: 'people-outline', activeIcon: 'people' },
  { id: 'inbox', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { id: 'favorites', icon: 'heart-outline', activeIcon: 'heart' },
  { id: 'profile', icon: 'person-circle-outline', activeIcon: 'person-circle' },
];

function PrivacyPage() {
  const support = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'supportadressen behöver konfigureras';
  const goHome = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = '/';
  };
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 860, alignSelf: 'center', gap: 26, paddingVertical: 24 }}>
        <View style={S.between}>
          <Logo />
          <Button label="Companio" secondary onPress={goHome} />
        </View>
        <View style={[S.card, S.cardBody, { padding: 30, gap: 22 }]}>
          <Text accessibilityRole="header" style={S.heading}>
            Integritetspolicy / Privacy policy
          </Text>
          <Text style={S.muted}>Senast uppdaterad: 12 september 2026</Text>
          <Text style={S.body}>
            Companio hjälper vuxna att hitta socialt sällskap och skapa lokala träffar. Den här sidan
            beskriver hur personuppgifter är tänkta att hanteras i tjänsten. Operatörens juridiska namn,
            adress och slutliga kontaktuppgifter ska fyllas i innan publik lansering.
          </Text>
          <Text style={S.title}>Vilka uppgifter används?</Text>
          <Text style={S.body}>
            Vi kan behandla konto- och inloggningsuppgifter, namn, vuxenprofilbild, språk, område, intressen,
            hushållstyp, valda preferenser, tillgänglighet, kontaktförfrågningar, meddelanden,
            träffdeltagande, gruppmedlemskap, supportärenden och tekniska uppgifter som behövs för säker
            drift. Barn får inga konton och ska inte identifieras med namn, födelsedatum, skola eller diagnos.
          </Text>
          <Text style={S.title}>Varför används uppgifterna?</Text>
          <Text style={S.body}>
            Uppgifterna används för att skapa konton, visa relevanta sällskap och träffar enligt dina
            inställningar, leverera meddelanden och aviseringar, hantera deltagande, förebygga missbruk, svara
            på support och uppfylla rättsliga skyldigheter. Privata meddelanden används inte för automatiserad
            matchningsanalys.
          </Text>
          <Text style={S.title}>Plats och synlighet</Text>
          <Text style={S.body}>
            Du kan välja ort manuellt. Om du tillåter platsåtkomst används en ungefärlig plats för avstånd och
            lokala förslag. Exakt bostadsadress visas inte offentligt. Tillgänglighet betyder att ett hushåll
            vill ses under en angiven tid och upphör automatiskt när tiden passerat.
          </Text>
          <Text style={S.title}>Delning och leverantörer</Text>
          <Text style={S.body}>
            Uppgifter delas med leverantörer som behövs för inloggning, datalagring, bildlagring, pushnotiser,
            drift och felövervakning. Tjänsten är planerad med Supabase i vald EU-region och Vercel för
            webbpublicering. Aktuella leverantörer, biträdesavtal, eventuella överföringar och lagringstider
            ska dokumenteras före lansering.
          </Text>
          <Text style={S.title}>Dina rättigheter</Text>
          <Text style={S.body}>
            Du kan begära tillgång, rättelse, radering, dataportabilitet eller begränsning enligt tillämplig
            dataskyddslagstiftning. Kontoradering och dataexport ska kunna startas i appen. Du kan också lämna
            klagomål till Integritetsskyddsmyndigheten (IMY) i Sverige.
          </Text>
          <Text style={S.title}>Kontakt</Text>
          <Text style={S.body}>
            Frågor om integritet: {support}. Ange den ansvariga juridiska personen och en fungerande
            supportadress i denna text innan appen lanseras offentligt.
          </Text>
          <View style={{ backgroundColor: C.peach, borderRadius: 14, padding: 16 }}>
            <Text style={S.muted}>
              Detta är en publicerbar utvecklingsmall för Companio och ersätter inte juridisk granskning. Den
              måste kompletteras med personuppgiftsansvarig, rättsliga grunder, fullständig leverantörslista,
              lagringstider, internationella överföringar och incidentkontakt före skarp drift.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Welcome() {
  const { locale, setLocale, text, startDemo } = useApp();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const login = async () => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      if (sent) {
        const r = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (r.error) throw r.error;
      } else {
        const r = await supabase.auth.signInWithOtp({ email: email.trim() });
        if (r.error) throw r.error;
        setSent(true);
      }
    } catch {
      setError(
        locale === 'sv'
          ? 'Inloggningen lyckades inte. Kontrollera mejladress och kod.'
          : 'Sign-in failed. Check your email address and code.',
      );
    } finally {
      setBusy(false);
    }
  };
  const apple = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const raw = Crypto.randomUUID();
      const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
        nonce,
      });
      if (!credential.identityToken) throw Error('NO_TOKEN');
      const r = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: raw,
      });
      if (r.error) throw r.error;
    } catch (e) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED')
        setError(
          locale === 'sv'
            ? 'Apple-inloggningen kunde inte slutföras.'
            : 'Apple sign-in could not be completed.',
        );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: width > 700 ? 45 : 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 55 }}>
        <View style={S.between}>
          <Logo />
          <View style={S.row}>
            <Chip label="SV" selected={locale === 'sv'} onPress={() => setLocale('sv')} />
            <Chip label="EN" selected={locale === 'en'} onPress={() => setLocale('en')} />
          </View>
        </View>
        <View
          style={{
            flexDirection: width > 850 ? 'row' : 'column',
            gap: width > 850 ? 70 : 30,
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1, width: '100%', gap: 23 }}>
            <View style={S.wrap}>
              <Chip
                label={locale === 'sv' ? 'Vänskap, mitt i vardagen' : 'Friendship, in everyday life'}
                icon="sunny-outline"
              />
            </View>
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: serif,
                fontSize: width > 700 ? 57 : 40,
                lineHeight: width > 700 ? 63 : 47,
                color: C.ink,
                letterSpacing: -1.8,
              }}
            >
              {text('welcome')}
            </Text>
            <Text style={[S.body, { fontSize: 17, lineHeight: 27, maxWidth: 470, color: C.muted }]}>
              {text('intro')}
            </Text>
            <View style={[S.row, { marginTop: 5 }]}>
              {['E', 'J', 'S'].map((n, i) => (
                <View key={n} style={{ marginLeft: i ? -22 : 0 }}>
                  <Avatar name={n} size={43} />
                </View>
              ))}
              <Text style={[S.muted, { fontSize: 12, marginLeft: 4, flex: 1 }]}>
                {locale === 'sv'
                  ? 'Par, familjer och vardagsvänner.'
                  : 'Couples, families and everyday friends.'}
              </Text>
            </View>
            <View style={{ borderRadius: 25, overflow: 'hidden', marginTop: 10 }}>
              <Art scene="coffee" height={210} />
            </View>
          </View>
          <View style={[S.card, { width: '100%', maxWidth: 420, padding: 30, gap: 20 }]}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: serif, fontSize: 29, color: C.ink }}>
                {locale === 'sv' ? 'Ett hej är en bra början.' : 'Hello is a lovely start.'}
              </Text>
              <Text style={S.muted}>
                {demoEnabled
                  ? text('skipLoginIntro')
                  : locale === 'sv'
                    ? 'Skapa ett konto eller logga in.'
                    : 'Create an account or sign in.'}
              </Text>
            </View>
            {demoEnabled && (
              <>
                <Button
                  label={text('skipLogin')}
                  icon="arrow-forward"
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await startDemo();
                    } catch {
                      setError(text('error'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <Text style={[S.muted, { fontSize: 12 }]}>{text('demoHelp')}</Text>
                {backendConfigured && <View style={S.divider} />}
              </>
            )}
            {backendConfigured ? (
              <>
                <Field
                  label={text('email')}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setSent(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {sent && (
                  <Field
                    label={text('code')}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                  />
                )}
                <Button
                  label={busy ? '…' : sent ? text('verify') : text('sendCode')}
                  disabled={busy || !email.includes('@') || (sent && code.length < 6)}
                  onPress={() => void login()}
                />
                {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={{ height: 48 }}
                    onPress={() => void apple()}
                  />
                )}
              </>
            ) : !demoEnabled ? (
              <Text style={S.muted}>{text('connectBackend')}</Text>
            ) : null}
            {error && (
              <Text accessibilityRole="alert" style={{ color: C.red }}>
                {error}
              </Text>
            )}
            <View style={[S.row, { alignItems: 'flex-start' }]}>
              <Icon name="shield-checkmark-outline" size={18} color={C.muted} />
              <Text style={[S.muted, { fontSize: 11, lineHeight: 17, flex: 1 }]}>
                {locale === 'sv'
                  ? 'För dig som är 18+. Här skapar vi vänskap, med respekt för varandras integritet.'
                  : 'For adults 18+. A place to build friendships and respect each other’s privacy.'}
              </Text>
            </View>
          </View>
        </View>
        <View style={[S.between, { paddingBottom: 20, flexWrap: 'wrap' }]}>
          <Text style={S.muted}>© {new Date().getFullYear()} Companio</Text>
          <Text style={[S.muted, { fontSize: 12 }]}>
            {locale === 'sv' ? 'Byggt för mer tid tillsammans.' : 'Made for more time together.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
function Shell() {
  const { state, demo, ready, session, text, locale, error, clearError, refresh, refreshing } = useApp();
  const { width } = useWindowDimensions();
  const listingPreview = process.env.EXPO_PUBLIC_STORE_PREVIEW === 'true';
  const desktop = width >= 960;
  const [tab, setTab] = useState('discover'),
    [chat, setChat] = useState<string | null>(null),
    [editor, setEditor] = useState<(Partial<EditorProps> & { kind: EditorKind }) | null>(null),
    [detail, setDetail] = useState<{ kind: 'household' | 'event' | 'group'; id: string } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!state.household_id) {
      setEditor(null);
      setDetail(null);
      setTab('discover');
      setChat(null);
    }
  }, [state.household_id]);
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname === '/privacy') {
    return <PrivacyPage />;
  }
  const nav: Navigation = {
    openEditor: (kind, options) => {
      setDetail(null);
      setEditor({ kind, ...options });
    },
    openHousehold: (id) => {
      setEditor(null);
      setDetail({ kind: 'household', id });
    },
    openEvent: (id) => {
      setEditor(null);
      setDetail({ kind: 'event', id });
    },
    openGroup: (id) => {
      setEditor(null);
      setDetail({ kind: 'group', id });
    },
    openChat: (id) => {
      setDetail(null);
      setEditor(null);
      setChat(id);
      setTab('inbox');
    },
    go: (t) => {
      setTab(t);
      setChat(null);
    },
  };
  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  if (!state.adult && !session && !demo) return <Welcome />;
  if (!state.household_id)
    return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
        <Logo />
        <Onboarding />
      </ScrollView>
    );
  const me = state.households.find((h) => h.id === state.household_id);
  if (!me)
    return (
      <View style={S.empty}>
        <Text style={S.body}>{text('error')}</Text>
        <Button label={text('retry')} onPress={() => void refresh()} />
      </View>
    );
  const available = state.availability.filter(
    (a) => a.household_id !== me.id && canSeeAvailability(state, a),
  );
  const unread =
    state.contacts.filter((c) => c.to_household === me.id && c.status === 'pending').length +
    state.conversations.filter((c) => {
      const p = state.conversation_preferences.find((p) => p.conversation_id === c.id);
      return (
        !p?.archived &&
        state.messages.some(
          (m) =>
            m.conversation_id === c.id &&
            m.author_id &&
            m.author_id !== state.adult?.id &&
            m.created_at > (p?.read_at || ''),
        )
      );
    }).length;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {desktop && (
        <View
          style={{
            width: 235,
            backgroundColor: '#FBFBF7',
            borderRightWidth: 1,
            borderRightColor: C.border,
            paddingHorizontal: 22,
            paddingVertical: 30,
            gap: 42,
          }}
        >
          <Logo />
          <View style={{ gap: 10 }}>
            {tabs.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={text(item.id)}
                accessibilityState={{ selected: tab === item.id }}
                aria-selected={tab === item.id}
                onPress={() => nav.go(item.id)}
                style={[
                  S.row,
                  {
                    padding: 14,
                    borderRadius: 13,
                    backgroundColor: tab === item.id ? C.lime : 'transparent',
                    gap: 13,
                  },
                ]}
              >
                <Icon name={tab === item.id ? item.activeIcon : item.icon} size={21} />
                <Text
                  style={{ fontSize: 14, fontWeight: tab === item.id ? '600' : '400', color: C.ink, flex: 1 }}
                >
                  {text(item.id)}
                </Text>
                {item.id === 'inbox' && unread > 0 && (
                  <Text style={{ fontSize: 11, color: C.coral, fontWeight: '700' }}>{unread}</Text>
                )}
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ backgroundColor: C.pale, padding: 18, borderRadius: 17, gap: 11 }}>
            <Icon name="leaf-outline" size={23} />
            <Text style={{ fontFamily: serif, fontSize: 21, color: C.ink }}>{text('tagline')}</Text>
            <Text style={[S.muted, { fontSize: 12, lineHeight: 19 }]}>
              {locale === 'sv'
                ? 'En liten plan kan bli början på något fint.'
                : 'A little plan can be the start of something lovely.'}
            </Text>
            <Button label={text('createEvent')} small onPress={() => nav.openEditor('event')} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text('profile')}
            onPress={() => nav.go('profile')}
            style={S.row}
          >
            <Avatar name={state.adult?.name || '?'} path={state.adult?.avatar_path} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={[S.title, { fontSize: 13 }]}>{state.adult?.name}</Text>
              <Text style={[S.muted, { fontSize: 11 }]}>{text(me.kind)}</Text>
            </View>
            <Icon name="chevron-forward" size={15} />
          </Pressable>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View
          style={[
            S.between,
            {
              paddingHorizontal: desktop ? 35 : 21,
              paddingTop: desktop ? 20 : 12,
              paddingBottom: 17,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            },
          ]}
        >
          {desktop ? (
            <View style={S.row}>
              <Icon name="location-outline" size={17} color={C.muted} />
              <Text style={[S.body, { fontSize: 13 }]}>{me.area}</Text>
              <Text style={[S.muted, { fontSize: 12 }]}>· {me.radius_km} km</Text>
            </View>
          ) : (
            <Logo />
          )}
          <View style={S.row}>
            {!desktop && (
              <IconButton name="add" label={text('createEvent')} onPress={() => nav.openEditor('event')} />
            )}
            <IconButton
              name="refresh-outline"
              label={text('refresh')}
              onPress={() => (demo ? tick((n) => n + 1) : void refresh())}
            />
            <IconButton name="notifications-outline" label={text('inbox')} onPress={() => nav.go('inbox')} />
          </View>
        </View>
        {demo && !listingPreview && (
          <View style={{ backgroundColor: '#F1E9D7', paddingVertical: 7, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 11, color: '#7D6544', textAlign: 'center' }}>{text('demoNotice')}</Text>
          </View>
        )}
        {error && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text('close')}
            onPress={clearError}
            style={[S.error, { margin: 12 }]}
          >
            <Text accessibilityRole="alert" style={{ color: C.red }}>
              {errorMessage(error, locale === 'en')} ×
            </Text>
          </Pressable>
        )}
        <ScrollView
          key={tab}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={C.green} />
          }
          contentContainerStyle={{ padding: desktop ? 26 : 14, paddingBottom: 32 }}
        >
          <View style={{ flexDirection: 'row', gap: 28, maxWidth: 1220, width: '100%', alignSelf: 'center' }}>
            <Reveal key={tab} style={{ flex: 1, minWidth: 0 }}>
              {tab === 'discover' ? (
                <Discover nav={nav} />
              ) : tab === 'people' ? (
                <People nav={nav} />
              ) : tab === 'inbox' ? (
                <Inbox nav={nav} selected={chat} onBack={() => setChat(null)} />
              ) : tab === 'favorites' ? (
                <Favorites nav={nav} />
              ) : (
                <Profile nav={nav} />
              )}
            </Reveal>
            {width >= 1320 && tab === 'discover' && (
              <View style={{ width: 250, gap: 18, paddingTop: 7 }}>
                <Text style={S.eyebrow}>{locale === 'sv' ? 'SÄLLSKAP I NÄRHETEN' : 'COMPANY NEARBY'}</Text>
                <Text style={{ fontFamily: serif, fontSize: 25, color: C.ink }}>
                  {locale === 'sv' ? 'Vilka vill ses?' : 'Who’s free?'}
                </Text>
                {available.slice(0, 3).map((a) => (
                  <AvailabilityCard key={a.id} slot={a} onPress={() => nav.openHousehold(a.household_id)} />
                ))}
                <View style={{ padding: 22, backgroundColor: C.peach, borderRadius: 20, gap: 14 }}>
                  <Icon name="chatbubble-ellipses-outline" size={25} />
                  <Text style={{ fontFamily: serif, fontSize: 23, color: C.ink }}>
                    {locale === 'sv' ? 'Det börjar med ett hej.' : 'It starts with hello.'}
                  </Text>
                  <Text style={S.muted}>
                    {locale === 'sv'
                      ? 'Du behöver ingen perfekt öppningsreplik. Nyfikenhet räcker långt.'
                      : 'No perfect opening line needed. A little curiosity goes a long way.'}
                  </Text>
                  <Button secondary label={text('people')} onPress={() => nav.go('people')} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        {!desktop && (
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: 'row',
              backgroundColor: '#FEFEFB',
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingVertical: 10,
              paddingHorizontal: 4,
            }}
          >
            {tabs.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={text(item.id)}
                accessibilityState={{ selected: tab === item.id }}
                aria-selected={tab === item.id}
                onPress={() => nav.go(item.id)}
                style={{ flex: 1, alignItems: 'center', gap: 5, minHeight: 45, justifyContent: 'center' }}
              >
                <View style={{ position: 'relative' }}>
                  <Icon
                    name={tab === item.id ? item.activeIcon : item.icon}
                    size={23}
                    color={tab === item.id ? C.green : '#8A9489'}
                  />
                  {item.id === 'inbox' && unread > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -5,
                        top: -3,
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: C.coral,
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: tab === item.id ? '600' : '400',
                    color: tab === item.id ? C.green : '#818B81',
                  }}
                >
                  {text(item.id)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {editor && <Editor {...editor} kind={editor.kind} onClose={() => setEditor(null)} />}
      {detail?.kind === 'household' && state.households.some((h) => h.id === detail.id) && (
        <HouseholdDetail
          household={state.households.find((h) => h.id === detail.id)!}
          nav={nav}
          onClose={() => setDetail(null)}
        />
      )}
      {detail?.kind === 'event' && state.events.some((e) => e.id === detail.id) && (
        <EventDetail
          event={state.events.find((e) => e.id === detail.id)!}
          nav={nav}
          onClose={() => setDetail(null)}
        />
      )}
      {detail?.kind === 'group' && state.groups.some((g) => g.id === detail.id) && (
        <GroupDetail
          group={state.groups.find((g) => g.id === detail.id)!}
          nav={nav}
          onClose={() => setDetail(null)}
        />
      )}
    </View>
  );
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <View style={S.empty}>
          <Logo />
          <Text style={S.title}>Något gick fel / Something went wrong</Text>
          <Button label="Försök igen / Try again" onPress={() => this.setState({ failed: false })} />
        </View>
      );
    return this.props.children;
  }
}
export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="dark" />
        <ErrorBoundary>
          <AppProvider>
            <Shell />
          </AppProvider>
        </ErrorBoundary>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
