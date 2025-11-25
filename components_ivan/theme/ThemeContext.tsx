import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    background: '#f8f9fa',
    surface: '#ffffff',
    primary: '#007bff',
    secondary: '#6c757d',
    text: '#333333',
    textSecondary: '#6c757d',
    border: '#e9ecef',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    background: '#121212',
    surface: '#1e1e1e',
    primary: '#0d6efd',
    secondary: '#6c757d',
    text: '#ffffff',
    textSecondary: '#adb5bd',
    border: '#343a40',
    success: '#198754',
    warning: '#fd7e14',
    error: '#dc3545',
    info: '#0dcaf0',
  },
};

// TEMA TRELLO - Inspirado no design do Trello
const trelloTheme: Theme = {
  isDark: false,
  colors: {
    background: '#f4f5f7',
    surface: '#ffffff',
    primary: '#0079bf',
    secondary: '#026aa7',
    text: '#172b4d',
    textSecondary: '#5e6c84',
    border: '#dfe1e6',
    success: '#61bd4f',
    warning: '#f2d600',
    error: '#eb5a46',
    info: '#00c2e0',
  },
};

// NOITON 1.0 - Tema premium inspirado na versão original (P 10.00)
const noiton1Theme: Theme = {
  isDark: false,
  colors: {
    background: '#F5F5DC',    // Bege claro (beige)
    surface: '#FAF0E6',      // Bege linho para cards e modais
    primary: '#8B4513',      // Marrom saddle para elementos principais
    secondary: '#A0522D',    // Marrom sienna para elementos secundários
    text: '#3E2723',         // Marrom escuro para texto principal
    textSecondary: '#5D4037', // Marrom médio para texto secundário
    border: '#D7CCC8',       // Bege acinzentado para bordas
    success: '#6D4C41',      // Marrom para sucesso
    warning: '#8D6E63',      // Marrom acinzentado para avisos
    error: '#5D4037',        // Marrom escuro para erros
    info: '#795548',         // Marrom para informações
  },
};

export type ThemeType = 'light' | 'dark' | 'trello' | 'noiton1';

interface ThemeContextType {
  theme: Theme;
  currentThemeType: ThemeType;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  setThemeByType: (themeType: ThemeType, forceAdmin?: boolean) => void;
  getThemeByType: (themeType: ThemeType) => Theme;
  getAllThemes: () => { type: ThemeType; name: string; theme: Theme; price: number; isPremium: boolean }[];
  isThemeUnlocked: (themeType: ThemeType) => Promise<boolean>;
  unlockTheme: (themeType: ThemeType) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);
  const [currentThemeType, setCurrentThemeType] = useState<ThemeType>('dark');
  const THEME_STORAGE_KEY = 'app_theme_type';
  const UNLOCKED_THEMES_KEY = 'unlocked_themes';

  useEffect(() => {
    loadTheme();
  }, []);

  const getThemeByType = (themeType: ThemeType): Theme => {
    switch (themeType) {
      case 'light': return lightTheme;
      case 'dark': return darkTheme;
      case 'trello': return trelloTheme;
      case 'noiton1': return noiton1Theme;
      default: return darkTheme;
    }
  };

  const loadTheme = async () => {
    try {
      const savedThemeType = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const themeType = (savedThemeType as ThemeType) || 'dark';
      setCurrentThemeType(themeType);
      setCurrentTheme(getThemeByType(themeType));
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
      setCurrentThemeType('dark');
      setCurrentTheme(darkTheme);
    }
  };

  const saveThemeType = async (themeType: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeType);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const setThemeByType = async (themeType: ThemeType, forceAdmin: boolean = false) => {
    const isUnlocked = await isThemeUnlocked(themeType);
    if (!isUnlocked && !forceAdmin) {
      throw new Error('Tema não desbloqueado');
    }
    setCurrentThemeType(themeType);
    const newTheme = getThemeByType(themeType);
    setCurrentTheme(newTheme);
    await saveThemeType(themeType);
  };

  const toggleTheme = () => {
    const newThemeType = currentThemeType === 'dark' ? 'light' : 'dark';
    setCurrentThemeType(newThemeType);
    const newTheme = getThemeByType(newThemeType);
    setCurrentTheme(newTheme);
    saveThemeType(newThemeType);
  };

  const setTheme = (isDark: boolean) => {
    const themeType = isDark ? 'dark' : 'light';
    setCurrentThemeType(themeType);
    const newTheme = getThemeByType(themeType);
    setCurrentTheme(newTheme);
    saveThemeType(themeType);
  };

  const getAllThemes = () => [
    { type: 'light' as ThemeType, name: 'Claro', theme: lightTheme, price: 0, isPremium: false },
    { type: 'dark' as ThemeType, name: 'Escuro', theme: darkTheme, price: 0, isPremium: false },
    { type: 'trello' as ThemeType, name: 'Trello', theme: trelloTheme, price: 3.60, isPremium: true },
    { type: 'noiton1' as ThemeType, name: 'Noiton 1.0', theme: noiton1Theme, price: 10.00, isPremium: true },
  ];

  const isThemeUnlocked = async (themeType: ThemeType): Promise<boolean> => {
    if (themeType === 'light' || themeType === 'dark') {
      return true;
    }
    
    try {
      const unlockedThemes = await AsyncStorage.getItem(UNLOCKED_THEMES_KEY);
      const unlocked = unlockedThemes ? JSON.parse(unlockedThemes) : [];
      return unlocked.includes(themeType);
    } catch (error) {
      console.error('Erro ao verificar tema desbloqueado:', error);
      return false;
    }
  };

  const unlockTheme = async (themeType: ThemeType): Promise<void> => {
    try {
      const unlockedThemes = await AsyncStorage.getItem(UNLOCKED_THEMES_KEY);
      const unlocked = unlockedThemes ? JSON.parse(unlockedThemes) : [];
      if (!unlocked.includes(themeType)) {
        unlocked.push(themeType);
        await AsyncStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(unlocked));
      }
    } catch (error) {
      console.error('Erro ao desbloquear tema:', error);
      throw error;
    }
  };

  const value: ThemeContextType = {
    theme: currentTheme,
    currentThemeType,
    toggleTheme,
    setTheme,
    setThemeByType,
    getThemeByType,
    getAllThemes,
    isThemeUnlocked,
    unlockTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { lightTheme, darkTheme, trelloTheme, noiton1Theme };