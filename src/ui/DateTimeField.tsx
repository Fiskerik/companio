import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../data/AppProvider';
import { localInput, parseLocalInput } from '../i18n';
import { localDay } from '../domain/discovery';
import { Button, Chip, Icon, IconButton } from './components';
import { Reveal } from './Motion';
import { C, S } from './theme';

export function DateTimeField({
  label,
  value,
  onChange,
  minimum,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimum?: Date;
}) {
  const { locale } = useApp();
  const date = new Date(parseLocalInput(value) || Date.now());
  const [panel, setPanel] = useState<'date' | 'time' | null>(null);
  const [month, setMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const lang = locale === 'sv' ? 'sv-SE' : 'en-GB';
  const choose = (d: Date) => onChange(localInput(d));
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const earliestMonth = minimum ? new Date(minimum.getFullYear(), minimum.getMonth(), 1) : null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={S.label}>{label}</Text>
      <View style={S.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${locale === 'sv' ? 'Välj datum' : 'Choose date'}`}
          accessibilityValue={{
            text: date.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }),
          }}
          accessibilityState={{ expanded: panel === 'date' }}
          onPress={() => {
            setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
            setPanel(panel === 'date' ? null : 'date');
          }}
          style={[S.field, S.row, { flex: 1 }]}
        >
          <Icon name="calendar-outline" size={18} />
          <Text style={[S.body, { flex: 1, fontSize: 14 }]}>
            {date.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${locale === 'sv' ? 'Välj tid' : 'Choose time'}`}
          accessibilityValue={{
            text: date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false }),
          }}
          accessibilityState={{ expanded: panel === 'time' }}
          onPress={() => setPanel(panel === 'time' ? null : 'time')}
          style={[S.field, S.row]}
        >
          <Icon name="time-outline" size={18} />
          <Text style={S.body}>
            {date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </Text>
        </Pressable>
      </View>
      {panel === 'date' && (
        <Reveal style={{ ...S.card, padding: 12, gap: 10 }}>
          <View style={S.between}>
            <Button
              small
              secondary
              label={locale === 'sv' ? 'Föregående månad' : 'Previous month'}
              disabled={!!earliestMonth && month <= earliestMonth}
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              icon="chevron-back"
            />
            <IconButton
              label={locale === 'sv' ? 'Nästa månad' : 'Next month'}
              name="chevron-forward"
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            />
          </View>
          <Text accessibilityRole="header" style={S.title}>
            {month.toLocaleDateString(lang, { month: 'long', year: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {(locale === 'sv'
              ? ['Må', 'Ti', 'On', 'To', 'Fr', 'Lö', 'Sö']
              : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
            ).map((d) => (
              <Text key={d} style={[S.muted, { width: '14.2857%', textAlign: 'center', fontSize: 12 }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
              const day = i - offset + 1;
              if (day < 1 || day > days) return <View key={i} style={{ width: '14.2857%', height: 44 }} />;
              const candidate = new Date(
                month.getFullYear(),
                month.getMonth(),
                day,
                date.getHours(),
                date.getMinutes(),
              );
              const disabled = !!minimum && localDay(candidate) < localDay(minimum);
              const selected = localDay(candidate) === localDay(date);
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={candidate.toLocaleDateString(lang, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => {
                    choose(candidate);
                    setPanel(null);
                  }}
                  style={{
                    width: '14.2857%',
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: selected ? C.green : 'transparent',
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  <Text style={{ color: selected ? 'white' : C.ink, fontSize: 15 }}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </Reveal>
      )}
      {panel === 'time' && (
        <Reveal style={{ ...S.card, padding: 12, gap: 10 }}>
          <Text style={S.label}>{locale === 'sv' ? 'Timme' : 'Hour'}</Text>
          <View style={S.wrap}>
            {Array.from({ length: 24 }, (_, h) => (
              <Chip
                key={h}
                label={String(h).padStart(2, '0')}
                selected={date.getHours() === h}
                onPress={() => {
                  const next = new Date(date);
                  next.setHours(h);
                  choose(next);
                }}
              />
            ))}
          </View>
          <Text style={S.label}>{locale === 'sv' ? 'Minut' : 'Minute'}</Text>
          <View style={S.wrap}>
            {Array.from({ length: 12 }, (_, m) => m * 5).map((m) => (
              <Chip
                key={m}
                label={String(m).padStart(2, '0')}
                selected={date.getMinutes() === m}
                onPress={() => {
                  const next = new Date(date);
                  next.setMinutes(m);
                  choose(next);
                }}
              />
            ))}
          </View>
          <Text style={S.muted}>
            {locale === 'sv' ? 'Tiden visas i din enhets tidszon.' : 'Times use your device’s time zone.'}
          </Text>
          <Button small label={locale === 'sv' ? 'Klar' : 'Done'} onPress={() => setPanel(null)} />
        </Reveal>
      )}
    </View>
  );
}
