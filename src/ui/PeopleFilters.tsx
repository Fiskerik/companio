import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../data/AppProvider';
import { CHILD_AGES, INTERESTS } from '../domain/rules';
import { LANGUAGES, initialPeopleFilters, type PeopleFilters as Filters } from '../domain/discovery';
import { Button, Chip, Sheet, Toggle } from './components';
import { S } from './theme';

export function PeopleFilterSheet({
  filters,
  onChange,
  count,
  onClose,
  onProfile,
}: {
  filters: Filters;
  onChange: (v: Filters) => void;
  count: number;
  onClose: () => void;
  onProfile: () => void;
}) {
  const { state, text, locale } = useApp();
  const me = state.households.find((h) => h.id === state.household_id)!;
  const sv = locale === 'sv';
  const options = (key: keyof Filters, label: string, values: [string | number, string][]) => (
    <View style={{ gap: 6 }}>
      <Text style={S.label}>{label}</Text>
      <View style={S.wrap}>
        {values.map(([value, name]) => (
          <Chip
            key={value}
            label={name}
            selected={filters[key] === value}
            onPress={() => onChange({ ...filters, [key]: value })}
          />
        ))}
      </View>
    </View>
  );
  const all: [string, string][] = [['all', text('all')]];
  return (
    <Sheet title={text('filters')} onClose={onClose}>
      <Text style={S.muted}>
        {sv
          ? 'Valen kombineras. Dina sparade profilkrav gäller också; inga filter utökas automatiskt.'
          : 'Choices are combined with your saved profile requirements. Filters are never widened automatically.'}
      </Text>
      {options(
        'radius',
        sv ? 'Avstånd – högst' : 'Distance – up to',
        [...new Set([2, 5, 10, 20, 50, me.radius_km].filter((n) => n <= me.radius_km))]
          .sort((a, b) => a - b)
          .map((n) => [n, `${n} km`]),
      )}
      {options('kind', sv ? 'Hushållstyp' : 'Household type', [
        ...all,
        ...['couple', 'family', 'single_parent'].map((k) => [k, text(k)] as [string, string]),
      ])}
      {options('childMode', sv ? 'Träffas med eller utan barn' : 'Meet with or without children', [
        ...all,
        ['with', text('with')],
        ['without', text('without')],
      ])}
      {options('activity', text('activity'), [
        ...all,
        ...INTERESTS.map((i) => [i, text(i)] as [string, string]),
      ])}
      {options('when', sv ? 'Publicerad tillgänglighet' : 'Shared availability', [
        ...all,
        ['today', text('today')],
        ['week', text('week')],
      ])}
      <Toggle
        label={text('sharedTime')}
        value={filters.sharedTime}
        onChange={(sharedTime) => onChange({ ...filters, sharedTime })}
      />
      {options('energy', text('energy'), [
        ...all,
        ...['quiet', 'balanced', 'lively'].map((e) => [e, text(e)] as [string, string]),
      ])}
      {options('language', sv ? 'Språk att prata tillsammans' : 'Languages to speak together', [
        ...all,
        ...Object.entries(LANGUAGES),
      ])}
      {options(
        'practiceLanguage',
        sv ? 'Språkutbyte – vill öva eller hjälpa med' : 'Language exchange – practise or help with',
        [...all, ...Object.entries(LANGUAGES)],
      )}
      <Text style={S.muted}>
        {sv
          ? 'Visar hushåll som valt språkutbyte och antingen pratar eller vill öva språket.'
          : 'Shows households open to language exchange who speak or want to practise the language.'}
      </Text>
      {options(
        'childAge',
        sv ? 'Barn i åldersintervallet (frivilligt uppgivet)' : 'Child age range (voluntarily shared)',
        [...all, ...CHILD_AGES.map((a) => [a, a] as [string, string])],
      )}
      {options('sort', sv ? 'Sortera efter' : 'Sort by', [
        ['recommended', sv ? 'Relevans' : 'Relevance'],
        ['distance', sv ? 'Närmaste' : 'Nearest'],
      ])}
      <Button
        secondary
        label={text('clearFilters')}
        onPress={() => onChange(initialPeopleFilters(me.radius_km))}
      />
      <Button
        secondary
        label={sv ? 'Ändra profilens grundkrav' : 'Edit profile requirements'}
        onPress={onProfile}
      />
      <Button label={sv ? `Visa ${count} hushåll` : `Show ${count} households`} onPress={onClose} />
    </Sheet>
  );
}
