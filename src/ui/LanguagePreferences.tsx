import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../data/AppProvider';
import { LANGUAGES, practiceTag } from '../domain/discovery';
import { Chip, Toggle } from './components';
import { S } from './theme';

export function LanguagePreferences({
  languages,
  onLanguages,
  interests,
  onInterests,
}: {
  languages: string[];
  onLanguages: (v: string[]) => void;
  interests: string[];
  onInterests: (v: string[]) => void;
}) {
  const { locale } = useApp();
  const sv = locale === 'sv';
  const exchange = interests.includes('language_learning');
  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  return (
    <View style={{ gap: 8 }}>
      <Text style={S.label}>{sv ? 'Språk vi kan prata' : 'Languages we can speak'}</Text>
      <View style={S.wrap}>
        {Object.entries(LANGUAGES).map(([code, label]) => (
          <Chip
            key={code}
            label={label}
            selected={languages.includes(code)}
            onPress={() => onLanguages(toggle(languages, code))}
          />
        ))}
      </View>
      <Toggle
        label={sv ? 'Öppna för språkinlärning och språkutbyte' : 'Open to language learning and exchange'}
        value={exchange}
        onChange={(value) =>
          onInterests(
            value
              ? [...interests, 'language_learning']
              : interests.filter((i) => i !== 'language_learning' && !i.startsWith('practice_')),
          )
        }
      />
      {exchange && (
        <>
          <Text style={S.label}>{sv ? 'Språk vi vill öva' : 'Languages we want to practise'}</Text>
          <View style={S.wrap}>
            {Object.entries(LANGUAGES).map(([code, label]) => (
              <Chip
                key={code}
                label={label}
                selected={interests.includes(practiceTag(code))}
                onPress={() => onInterests(toggle(interests, practiceTag(code)))}
              />
            ))}
          </View>
          <Text style={S.muted}>
            {sv
              ? 'Inget övningsspråk valt? Då kan ni ändå hjälpa andra med språken ni pratar. En fika räcker – ingen behöver vara lärare.'
              : 'No practice language selected? You can still help others with languages you speak. A coffee is enough – no teaching experience needed.'}
          </Text>
        </>
      )}
    </View>
  );
}
