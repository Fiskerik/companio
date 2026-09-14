import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as NativeAppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Session } from '@supabase/supabase-js';
import {
  EMPTY_STATE,
  type AppState,
  type Command,
  type Payload,
  type Locale,
  type NotificationTarget,
} from '../domain/types';
import { createDemo, demoCommand, upgradeDemo } from './demo';
import { supabase } from './client';
import { t } from '../i18n';

interface Context {
  state: AppState;
  demo: boolean;
  ready: boolean;
  session: Session | null;
  locale: Locale;
  setLocale: (l: Locale) => void;
  error: string;
  clearError: () => void;
  refreshing: boolean;
  refresh: () => Promise<void>;
  startDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  command: (action: Command, payload?: Payload) => Promise<Record<string, unknown>>;
  notificationTarget: NotificationTarget | null;
  clearNotificationTarget: () => void;
  text: (key: string) => string;
}
const AppContext = createContext<Context | null>(null);
export const useApp = () => useContext(AppContext)!;
const DEMO_KEY = 'companio.demo.v1';
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE),
    [demo, setDemo] = useState(false),
    [ready, setReady] = useState(false),
    [session, setSession] = useState<Session | null>(null),
    [locale, setLocale] = useState<Locale>('sv'),
    [error, setError] = useState(''),
    [refreshing, setRefreshing] = useState(false),
    [notificationTarget, setNotificationTarget] = useState<NotificationTarget | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const refreshGeneration = useRef(0);
  const refresh = useCallback(async () => {
    if (demoRef.current || !supabase) return;
    const generation = ++refreshGeneration.current;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('app_snapshot');
      if (error) throw error;
      if (generation === refreshGeneration.current) {
        setState(data);
        if (data.adult?.locale) setLocale(data.adult.locale);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string }).message || e));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    supabase?.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
          if (data.session) void refresh();
          setReady(true);
        }
      })
      .catch(() => {
        setError('Session could not be restored');
        setReady(true);
      });
    if (!supabase) setReady(true);
    const sub = supabase?.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      if (s) {
        setDemo(false);
        demoRef.current = false;
        setTimeout(() => void refresh(), 0);
      } else if (!demoRef.current) {
        refreshGeneration.current++;
        setState(EMPTY_STATE);
      }
    });
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    if (!session || demo || !supabase) return;
    const channel = supabase
      .channel('companio-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void refresh())
      .subscribe();
    const timer = setInterval(() => void refresh(), 30_000);
    const sub = NativeAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        supabase?.auth.startAutoRefresh();
        void refresh();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      void supabase?.removeChannel(channel);
    };
  }, [session, demo, refresh]);
  useEffect(() => {
    if (!session || !supabase) return;
    const client = supabase;
    let active = true;
    const resolve = async (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        { kind?: string; reference_id?: string } | undefined;
      if (!data?.kind || !data.reference_id) return;
      const { data: target, error: targetError } = await client.rpc('resolve_notification', {
        p_kind: data.kind,
        p_reference: data.reference_id,
      });
      if (active && !targetError && target && typeof target === 'object') {
        const candidate = target as { kind?: string; id?: string };
        if (
          (candidate.kind === 'conversation' ||
            candidate.kind === 'event' ||
            candidate.kind === 'household') &&
          typeof candidate.id === 'string'
        ) {
          setNotificationTarget({
            kind: candidate.kind as 'conversation' | 'event' | 'household',
            id: candidate.id,
          });
        } else if (candidate.kind === 'inbox') {
          setNotificationTarget({ kind: 'inbox' });
        }
      }
    };
    const listener = Notifications.addNotificationResponseReceivedListener((response) => {
      void resolve(response);
    });
    try {
      void resolve(Notifications.getLastNotificationResponse());
    } catch {
      // Some Expo web runtimes do not expose a last response.
    }
    return () => {
      active = false;
      listener.remove();
    };
  }, [session]);
  const command = async (action: Command, payload: Payload = {}) => {
    setError('');
    try {
      if (demoRef.current) {
        const { state: next, result } = demoCommand(stateRef.current, action, payload);
        stateRef.current = next;
        setState(next);
        await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(next));
        return result;
      }
      if (!supabase) throw Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await supabase.rpc('app_command', { p_action: action, p_payload: payload });
      if (error) throw Error(error.message);
      if (action === 'account_delete') {
        await supabase.auth.signOut();
        setState(EMPTY_STATE);
      } else await refresh();
      return data || {};
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    }
  };
  const startDemo = async () => {
    refreshGeneration.current++;
    if (session) await supabase?.auth.signOut();
    const saved = await AsyncStorage.getItem(DEMO_KEY);
    let next = createDemo();
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.adult && parsed.households?.length) next = upgradeDemo(parsed);
      }
    } catch {}
    demoRef.current = true;
    setDemo(true);
    stateRef.current = next;
    setState(next);
    setError('');
  };
  const signOut = async () => {
    refreshGeneration.current++;
    demoRef.current = false;
    setDemo(false);
    stateRef.current = EMPTY_STATE;
    setState(EMPTY_STATE);
    setSession(null);
    await supabase?.auth.signOut();
  };
  return (
    <AppContext.Provider
      value={{
        state,
        demo,
        ready,
        session,
        locale,
        setLocale,
        error,
        clearError: () => setError(''),
        refreshing,
        refresh,
        startDemo,
        signOut,
        command,
        notificationTarget,
        clearNotificationTarget: () => setNotificationTarget(null),
        text: (key) => t(locale, key),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
