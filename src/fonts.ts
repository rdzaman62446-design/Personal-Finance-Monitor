import { Caveat_400Regular } from '@expo-google-fonts/caveat/400Regular';
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { useFonts } from 'expo-font';
import { createContext, useContext } from 'react';
import { TextStyle } from 'react-native';

// Fonts the user can choose for log entries. Each custom font ships a regular and a
// bold file, because Android won't synthesise bold for a custom font family.
export type LogFont = {
  key: string;
  label: string;
  note: string;
  regular?: string;
  bold?: string;
  // Some fonts (e.g. handwriting) read small and need a size bump.
  scale: number;
};

export const LOG_FONTS: LogFont[] = [
  { key: 'system', label: 'System', note: 'Your phone’s default', scale: 1 },
  { key: 'poppins', label: 'Poppins', note: 'Clean & modern', regular: 'Poppins_400Regular', bold: 'Poppins_600SemiBold', scale: 0.97 },
  { key: 'nunito', label: 'Nunito', note: 'Soft & rounded', regular: 'Nunito_400Regular', bold: 'Nunito_700Bold', scale: 1.02 },
  { key: 'lora', label: 'Lora', note: 'Elegant serif', regular: 'Lora_400Regular', bold: 'Lora_600SemiBold', scale: 1.02 },
  {
    key: 'mono',
    label: 'JetBrains Mono',
    note: 'Typewriter — numbers line up',
    regular: 'JetBrainsMono_400Regular',
    bold: 'JetBrainsMono_600SemiBold',
    scale: 0.95,
  },
  { key: 'caveat', label: 'Caveat', note: 'Handwritten notebook', regular: 'Caveat_400Regular', bold: 'Caveat_700Bold', scale: 1.3 },
];

export const useLoadLogFonts = () =>
  useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Nunito_400Regular,
    Nunito_700Bold,
    Lora_400Regular,
    Lora_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
    Caveat_400Regular,
    Caveat_700Bold,
  });

export const fontByKey = (key: string) => LOG_FONTS.find((f) => f.key === key) ?? LOG_FONTS[0];

// The chosen log font, or the system font until custom fonts have loaded.
export const LogFontContext = createContext<LogFont>(LOG_FONTS[0]);
export const useLogFont = () => useContext(LogFontContext);

// Text style for log text in the given font, weight and base size.
export function logText(font: LogFont, bold: boolean, size: number): TextStyle {
  const family = bold ? font.bold : font.regular;
  if (!family) return { fontSize: size, fontWeight: bold ? '700' : '400' };
  return { fontFamily: family, fontSize: Math.round(size * font.scale * 10) / 10, fontWeight: 'normal' };
}
