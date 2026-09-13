import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect, Line, G } from 'react-native-svg';
import { useReducedMotion } from './Motion';
import { C, S, serif } from './theme';
import { useApp } from '../data/AppProvider';
import { supabase } from '../data/client';
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = ({
  name,
  size = 20,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Ionicons name={name} size={size} color={color} />;
export function Button({
  label,
  onPress,
  secondary = false,
  icon,
  disabled = false,
  danger = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        S.button,
        secondary && { backgroundColor: C.pale },
        danger && { backgroundColor: '#F8E6E0' },
        small && { minHeight: 44, paddingVertical: 8, paddingHorizontal: 12 },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon && <Icon name={icon} color={danger ? C.red : secondary ? C.green : '#fff'} size={17} />}
      <Text style={[S.buttonText, secondary && { color: C.green }, danger && { color: C.red }]}>{label}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  active = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        S.iconButton,
        { backgroundColor: active ? C.peach : C.paper, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={name} size={19} color={active ? C.coral : C.ink} />
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={onPress ? selected : undefined}
      onPress={onPress}
      style={[
        S.pill,
        S.row,
        { gap: 5, ...(onPress ? { minHeight: 44 } : {}) },
        selected && { backgroundColor: C.green },
      ]}
    >
      {icon && <Icon name={icon} size={14} color={selected ? 'white' : C.green} />}
      <Text style={[S.pillText, selected && { color: 'white' }]}>{label}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={S.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#91998F"
        {...props}
        style={[S.field, props.multiline && { minHeight: 95, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => onChange(!value)}
      style={[S.row, { paddingVertical: 10, alignItems: 'flex-start' }]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: value ? C.green : C.border,
          backgroundColor: value ? C.green : 'white',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value && <Icon name="checkmark" size={15} color="white" />}
      </View>
      <Text style={[S.body, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}
export function Sheet({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { text } = useApp();
  const reducedMotion = useReducedMotion();
  return (
    <Modal visible transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(28,43,34,.42)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Platform.OS === 'web' ? 20 : 8,
        }}
      >
        <SafeAreaView
          style={{
            width: '100%',
            maxWidth: wide ? 760 : 540,
            maxHeight: '95%',
            backgroundColor: C.bg,
            borderRadius: 25,
            overflow: 'hidden',
          }}
        >
          <View style={[S.between, { padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text accessibilityRole="header" style={[S.title, { flex: 1 }]}>
              {title}
            </Text>
            <IconButton name="close" label={text('close')} onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 17 }}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
export function Empty({
  title,
  body,
  icon = 'leaf-outline',
  children,
}: {
  title: string;
  body?: string;
  icon?: IconName;
  children?: React.ReactNode;
}) {
  return (
    <View style={S.empty}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: C.lime,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={26} />
      </View>
      <Text style={[S.title, { textAlign: 'center' }]}>{title}</Text>
      {body && <Text style={[S.muted, { textAlign: 'center', maxWidth: 350 }]}>{body}</Text>}
      {children}
    </View>
  );
}
export function AsyncButton({
  label,
  run,
  secondary = false,
  icon,
}: {
  label: string;
  run: () => Promise<unknown>;
  secondary?: boolean;
  icon?: IconName;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      label={busy ? '…' : label}
      secondary={secondary}
      disabled={busy}
      icon={icon}
      onPress={() => {
        setBusy(true);
        void run()
          .catch(() => {})
          .finally(() => setBusy(false));
      }}
    />
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[S.row, { gap: 9 }]}>
      <Svg width={34} height={34} viewBox="0 0 40 40">
        <Path d="M20 31C-1 20 4 4 15 9c3 1 5 5 5 5s2-4 5-5c11-5 16 11-5 22Z" fill={C.green} />
        <Path d="M13 19c3 5 11 5 14 0" stroke={C.lime} strokeWidth={2} fill="none" strokeLinecap="round" />
      </Svg>
      {!compact && (
        <Text style={{ fontFamily: serif, fontSize: 29, color: C.ink, letterSpacing: -1 }}>
          companio<Text style={{ color: C.coral }}>.</Text>
        </Text>
      )}
    </View>
  );
}
const avatarColors = ['#E8C8AD', '#D1DDD0', '#E4D6EA', '#D9DFBB', '#EFDBB6'];
export function Avatar({
  name,
  size = 46,
  index = 0,
  path,
}: {
  name: string;
  size?: number;
  index?: number;
  path?: string | null;
}) {
  const color = avatarColors[(name.charCodeAt(0) || index) % avatarColors.length];
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: C.paper,
      }}
    >
      {path ? (
        <MediaImage path={path} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontFamily: serif, fontSize: size * 0.41, color: C.green }}>{name.slice(0, 1)}</Text>
      )}
    </View>
  );
}
export function MediaImage({ path, style }: { path: string; style?: ViewStyle }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (/^(blob:|data:|file:)/.test(path)) {
      setUrl(path);
      return;
    }
    supabase?.storage
      .from('media')
      .createSignedUrl(path, 120)
      .then(({ data }) => {
        if (live) setUrl(data?.signedUrl || null);
      });
    return () => {
      live = false;
    };
  }, [path]);
  return url ? (
    <Image
      source={{ uri: url }}
      accessibilityLabel=""
      style={[{ width: '100%', height: 180, borderRadius: 12 }, style as never]}
      resizeMode="cover"
    />
  ) : (
    <View
      style={[
        {
          height: 70,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.pale,
          borderRadius: 12,
        },
        style,
      ]}
    >
      <Icon name="image-outline" color={C.muted} />
    </View>
  );
}
export function Art({ scene = 'coffee', height = 170 }: { scene?: string; height?: number }) {
  const bg =
    scene === 'games'
      ? '#E8DFC8'
      : scene === 'walks'
        ? '#DFE8DA'
        : scene === 'outdoors'
          ? '#D5E0CE'
          : '#EEDBC9';
  return (
    <View accessibilityElementsHidden style={{ height, backgroundColor: bg, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice">
        <Rect width={400} height={210} fill={bg} />
        <Circle cx={320} cy={40} r={42} fill="#F6EDCF" />
        {scene === 'games' ? (
          <G>
            <Ellipse cx={210} cy={176} rx={160} ry={33} fill="#D1C9AE" />
            <Path d="M65 88 275 66 350 147 138 174Z" fill="#AF775B" />
            <Path d="m84 89 187-16 57 65-187 27Z" fill="#F3E8CB" />
            {[0, 1, 2, 3].map((i) => (
              <G key={i}>
                <Path
                  d={`m${106 + i * 38} ${90 - i * 3} 22 -2 8 11 -22 3Z`}
                  fill={i % 2 ? C.green : C.coral}
                />
                <Circle cx={148 + i * 37} cy={129 - i * 3} r={7} fill={i % 2 ? '#DCB854' : '#8CA482'} />
              </G>
            ))}
            <Rect x={58} y={128} width={25} height={31} rx={4} fill={C.green} />
            <Path d="M83 134c17-6 19 20 0 14" fill="none" stroke={C.green} strokeWidth={5} />
            <Rect x={290} y={39} width={28} height={36} rx={4} fill={C.coral} />
            <Circle cx={297} cy={49} r={2} fill="white" />
            <Circle cx={310} cy={64} r={2} fill="white" />
          </G>
        ) : scene === 'walks' || scene === 'outdoors' ? (
          <G>
            <Path d="M0 97Q120 38 218 100T400 75V210H0Z" fill="#B7CBA7" />
            <Path d="M0 154Q140 76 400 138V210H0Z" fill="#829C73" />
            <Path d="M220 93Q170 140 280 210h100q-199-65-139-114" fill="#EDE2CA" />
            {[35, 85, 338, 376].map((x, i) => (
              <G key={x}>
                <Rect x={x} y={64 + i * 9} width={6} height={86} fill="#657159" />
                <Ellipse cx={x + 3} cy={55 + i * 9} rx={28} ry={43} fill={i % 2 ? '#668566' : '#3D6450'} />
              </G>
            ))}
            <Circle cx={182} cy={102} r={9} fill="#D5AB88" />
            <Path d="M172 114h19l8 34h-33Z" fill={C.coral} />
            <Path d="m172 147-8 32m25-32 8 29" stroke="#354C3E" strokeWidth={7} strokeLinecap="round" />
            <Circle cx={214} cy={112} r={7} fill="#C89875" />
            <Path d="M207 122h15l4 25h-22Z" fill="#E8C875" />
            <Path d="m208 147-5 24m17-24 5 24" stroke="#354C3E" strokeWidth={5} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d="M0 125Q160 102 400 143V210H0Z" fill="#C4D0A7" />
            <Path d="M58 164 131 115 335 134 279 199Z" fill="#F6EEE0" />
            {[0, 1, 2, 3].map((i) => (
              <Path key={i} d={`M${91 + i * 40} ${141 - i * 5}l145 25`} stroke="#DB9F87" strokeWidth={2} />
            ))}
            <Ellipse cx={204} cy={161} rx={36} ry={9} fill="#D7CDBB" />
            <Path d="M180 120h40v34q-20 14-40 0Z" fill={C.coral} />
            <Path d="M220 124q29-3 16 24h-16" fill="none" stroke={C.coral} strokeWidth={7} />
            <Ellipse cx={200} cy={120} rx={20} ry={5} fill="#704F3A" />
            <Path
              d="M192 106c-13-12 15-13 0-29m15 28c-13-12 15-13 0-29"
              fill="none"
              stroke="#F7F0E3"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Path d="M106 128h28v24q-14 9-28 0Z" fill={C.green} />
            <Path d="M134 132q22-3 13 16h-13" fill="none" stroke={C.green} strokeWidth={5} />
            <Path d="M303 19v110" stroke="#748466" strokeWidth={5} />
            <Ellipse cx={284} cy={53} rx={20} ry={34} rotation={-30} origin="284,53" fill="#8CA178" />
            <Ellipse cx={322} cy={79} rx={22} ry={34} rotation={30} origin="322,79" fill="#8CA178" />
            <Circle cx={59} cy={41} r={5} fill="#D8AD70" />
            <Path d="m44 41h30m-15-15v30" stroke="#D8AD70" strokeWidth={2} />
          </G>
        )}
      </Svg>
    </View>
  );
}
