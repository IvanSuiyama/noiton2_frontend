import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useTheme } from './ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  showSwitch?: boolean;
  style?: any;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showLabel = true, 
  showSwitch = false, 
  style 
}) => {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    try {
      toggleTheme();
      
      // Feedback opcional
      const message = theme.isDark 
        ? 'Tema claro ativado!' 
        : 'Tema escuro ativado!';
      
      // Comentar linha abaixo se não quiser o Alert
      // Alert.alert('Tema alterado', message);
      
    } catch (error) {
      console.error('Erro ao alterar tema:', error);
      Alert.alert('Erro', 'Não foi possível alterar o tema');
    }
  };

  if (showSwitch) {
    return (
      <View style={[styles.switchContainer, { backgroundColor: theme.colors.surface }, style]}>
        {showLabel && (
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Tema Escuro
          </Text>
        )}
        <Switch
          value={theme.isDark}
          onValueChange={handleToggle}
          trackColor={{ 
            false: theme.colors.border, 
            true: theme.colors.primary 
          }}
          thumbColor={theme.isDark ? '#fff' : '#f4f3f4'}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style
      ]}
      onPress={handleToggle}>
      <Text style={styles.icon}>
        {theme.isDark ? '☀️' : '🌙'}
      </Text>
      {showLabel && (
        <Text style={[styles.buttonText, { color: theme.colors.text }]}>
          {theme.isDark ? 'Tema Claro' : 'Tema Escuro'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  icon: {
    fontSize: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ThemeToggle;