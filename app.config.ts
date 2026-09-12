import type { ExpoConfig, ConfigContext } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Companio',
  slug: 'companio',
  scheme: 'companio',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: process.env.BUNDLE_ID || 'com.fiskerik.companio',
    buildNumber: process.env.IOS_BUILD_NUMBER || process.env.PROJECT_BUILD_NUMBER || '1',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: { package: process.env.BUNDLE_ID || 'com.fiskerik.companio' },
  web: {
    bundler: 'metro',
    output: 'single',
    name: 'Companio – Hitta ditt sällskap',
    favicon: './assets/favicon.png',
  },
  plugins: [
    ['expo-apple-authentication'],
    ['expo-secure-store'],
    [
      'expo-image-picker',
      {
        photosPermission: 'Välj en vuxenbild till din profil eller en bild att dela i chatten.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Companio använder din ungefärliga plats för att hitta sällskap nära dig. Du kan även välja plats manuellt.',
      },
    ],
    ['expo-notifications'],
    ['expo-sharing'],
  ],
});
