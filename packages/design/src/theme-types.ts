/**
 * FR: Types pour le système de thèmes UI
 * EN: Types for UI theme system
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: 'light' | 'dark' | 'high-contrast' | 'custom';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  isCustom?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeConfig {
  currentTheme: string;
  availableThemes: Theme[];
  customThemes: Theme[];
}

export interface ThemeStorage {
  config: ThemeConfig;
  userPreferences: {
    autoDarkMode: boolean;
    reduceMotion: boolean;
    highContrast: boolean;
    fontSizeScale: number;
  };
}

export type ThemeCategory = Theme['category'];

export interface ThemePreview {
  theme: Theme;
  previewColors: string[];
  screenshot?: string;
}