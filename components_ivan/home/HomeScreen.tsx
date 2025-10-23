import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import CardWorkspace from '../cards/cardWorkspace';
import CardUser from '../cards/cardUser';
import HomeCard from '../cards/HomeCard';
import CardTarefas from '../cards/cardTarefas';
import CardFavoritos from '../cards/cardFavoritos';
import CardCalendario from '../cards/cardCalendario';
import { getActiveWorkspaceId } from '../../services/authService';
import CardMembros from '../cards/cardMembros';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

type TabType = 'home' | 'tarefas' | 'favoritos' | 'calendario';

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState<number | null>(null);

  // Sempre que a tela for exibida, pega o workspace ativo
  useEffect(() => {
    const fetchWorkspaceId = async () => {
      const id = await getActiveWorkspaceId();
      setWorkspaceRefreshKey(id);
    };
    fetchWorkspaceId();
  }, []);

  // Se workspace mudar (por navegação, troca, etc), atualiza a chave
  useEffect(() => {
    const interval = setInterval(async () => {
      const id = await getActiveWorkspaceId();
      setWorkspaceRefreshKey(prev => (prev !== id ? id : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDate(now.toLocaleDateString('pt-BR', options));
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeCard navigation={navigation} />;
      case 'tarefas':
        return <CardTarefas navigation={navigation} refreshKey={workspaceRefreshKey} />;
      case 'favoritos':
        return <CardFavoritos navigation={navigation} />;
      case 'calendario':
        return <CardCalendario navigation={navigation} refreshKey={workspaceRefreshKey} />;
      default:
        return <CardTarefas navigation={navigation} refreshKey={workspaceRefreshKey} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Superior com Cards */}
      <View style={[styles.topHeader, { backgroundColor: theme.colors.background }]}>
        <View style={styles.workspaceCard}>
          <CardWorkspace navigation={navigation} />
        </View>
        <View style={styles.membrosCard}>
          <CardMembros refreshKey={workspaceRefreshKey} />
        </View>
        <CardUser navigation={navigation} />
      </View>

      {/* Espaço Central Livre */}
      <View style={styles.centerSpace} />

      {/* Menu de Navegação */}
      <View style={[styles.tabsContainer, { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border 
      }]}>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'home' && { 
              ...styles.activeTab, 
              backgroundColor: `${theme.colors.primary}20`,
              borderBottomColor: theme.colors.primary 
            }
          ]}
          onPress={() => setActiveTab('home')}>
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === 'home' && { 
              ...styles.activeTabText, 
              color: theme.colors.text 
            }
          ]}>
            🏠 Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'tarefas' && { 
              ...styles.activeTab, 
              backgroundColor: `${theme.colors.primary}20`,
              borderBottomColor: theme.colors.primary 
            }
          ]}
          onPress={() => setActiveTab('tarefas')}>
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === 'tarefas' && { 
              ...styles.activeTabText, 
              color: theme.colors.text 
            }
          ]}>
            📝 Tarefas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'favoritos' && { 
              ...styles.activeTab, 
              backgroundColor: `${theme.colors.primary}20`,
              borderBottomColor: theme.colors.primary 
            }
          ]}
          onPress={() => setActiveTab('favoritos')}>
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === 'favoritos' && { 
              ...styles.activeTabText, 
              color: theme.colors.text 
            }
          ]}>
            ⭐ Favoritos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'calendario' && { 
              ...styles.activeTab, 
              backgroundColor: `${theme.colors.primary}20`,
              borderBottomColor: theme.colors.primary 
            }
          ]}
          onPress={() => setActiveTab('calendario')}>
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === 'calendario' && { 
              ...styles.activeTabText, 
              color: theme.colors.text 
            }
          ]}>
            📅 Calendário
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal */}
      <View style={[styles.mainContent, { backgroundColor: theme.colors.background }]}>
        <View style={styles.cardContainer}>
          {renderTabContent()}
        </View>
        <View style={styles.bottomSpacing} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 80,
  },

  workspaceCard: {
    marginRight: -60, // Aproxima mais do centro
  },

  membrosCard: {
    marginLeft: -110, // Aproxima muito mais do card de workspace
  },
  
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  centerSpace: {
    height: 150,
    backgroundColor: 'transparent',
  },

  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 0,
    borderRadius: 0,
    paddingVertical: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
  },

  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    // Estilos dinâmicos aplicados inline
  },

  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },

  activeTabText: {
    fontWeight: '600',
  },
  
  mainContent: {
    flex: 1,
  },

  cardContainer: {
    padding: 16,
    flex: 1,
  },
  
  bottomSpacing: {
    height: 30,
  },
});

export default HomeScreen;