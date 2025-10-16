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

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
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
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme); // ✅ Padrão escuro
  const THEME_STORAGE_KEY = 'app_theme';

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        const isDark = JSON.parse(savedTheme);
        setCurrentTheme(isDark ? darkTheme : lightTheme);
      } else {
        // ✅ Se não tem tema salvo, usa escuro por padrão
        setCurrentTheme(darkTheme);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(true));
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
      setCurrentTheme(darkTheme); // ✅ Em caso de erro, usa escuro
    }
  };

  const saveTheme = async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDark));
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme.isDark ? lightTheme : darkTheme;
    setCurrentTheme(newTheme);
    saveTheme(newTheme.isDark);
  };

  const setTheme = (isDark: boolean) => {
    const newTheme = isDark ? darkTheme : lightTheme;
    setCurrentTheme(newTheme);
    saveTheme(isDark);
  };

  const value: ThemeContextType = {
    theme: currentTheme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { lightTheme, darkTheme };