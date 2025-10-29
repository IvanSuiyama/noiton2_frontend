import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import ThemeToggle from '../theme/ThemeToggle';
import GoogleCalendarService from '../../services/googleCalendarService';

interface ConfiguracoesScreenProps {
  navigation: StackNavigationProp<RootStackParamList>;
}

const ConfiguracoesScreen: React.FC<ConfiguracoesScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  const handleAbout = () => {
    Alert.alert(
      'Sobre o App',
      'Noiton 2.0\nVersão: 2.0.0\nDesenvolvido para gerenciamento de tarefas em equipe.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Ajuda',
      'Para suporte, entre em contato com a equipe de desenvolvimento.\n\nFuncionalidades principais:\n• Gerenciar tarefas\n• Trabalhar em equipe\n• Organizar por categorias\n• Favoritar tarefas importantes',
      [{ text: 'OK' }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Feedback',
      'Sua opinião é importante! Envie seus comentários e sugestões para nos ajudar a melhorar o aplicativo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar Feedback', onPress: () => {
          // Aqui poderia abrir um formulário ou email
          Alert.alert('Obrigado!', 'Seu feedback será enviado em breve.');
        }}
      ]
    );
  };

  const handleCalendarSettings = () => {
    Alert.alert(
      '📅 Configurações do Calendário',
      'Configure como o app interage com seu calendário do Google.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Verificar Permissões', 
          onPress: async () => {
            const hasPermissions = await GoogleCalendarService.checkCalendarPermissions();
            if (hasPermissions) {
              Alert.alert('✅ Permissões OK', 'O app já tem permissões para acessar o calendário.');
            } else {
              const granted = await GoogleCalendarService.requestPermissionsWithUserFeedback();
              if (granted) {
                Alert.alert('✅ Sucesso', 'Permissões concedidas com sucesso!');
              } else {
                Alert.alert('❌ Permissões Negadas', 'Você pode conceder permissões depois nas configurações do Android.');
              }
            }
          }
        },
        { 
          text: 'Abrir Calendário', 
          onPress: () => GoogleCalendarService.openCalendarApp()
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Seção Aparência */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🎨 Aparência
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Personalize a aparência do aplicativo
          </Text>
          
          <View style={styles.settingItem}>
            <ThemeToggle showLabel={true} showSwitch={true} />
          </View>
        </View>

        {/* Seção Integrações */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🔗 Integrações
          </Text>
          
          <TouchableOpacity
            style={[styles.settingItem, styles.settingButton]}
            onPress={handleCalendarSettings}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>📅</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Google Calendar
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Sincronizar tarefas com calendário
                </Text>
              </View>
              <Text style={[styles.settingArrow, { color: theme.colors.textSecondary }]}>
                ›
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção Geral */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            ⚙️ Geral
          </Text>
          
          <TouchableOpacity
            style={[styles.settingItem, styles.settingButton]}
            onPress={handleAbout}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Sobre o aplicativo
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Versão e informações
                </Text>
              </View>
              <Text style={[styles.settingArrow, { color: theme.colors.textSecondary }]}>
                ›
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.settingButton]}
            onPress={handleHelp}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>❓</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Ajuda
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Dúvidas e suporte
                </Text>
              </View>
              <Text style={[styles.settingArrow, { color: theme.colors.textSecondary }]}>
                ›
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.settingButton]}
            onPress={handleFeedback}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>💬</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Enviar Feedback
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Compartilhe sua opinião
                </Text>
              </View>
              <Text style={[styles.settingArrow, { color: theme.colors.textSecondary }]}>
                ›
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção Dados */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            💾 Dados
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>📊</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Armazenamento Local
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  Favoritos e configurações salvos localmente
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Espaçamento final */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    paddingVertical: 12,
  },
  settingButton: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  bottomSpace: {
    height: 32,
  },
});

export default ConfiguracoesScreen;