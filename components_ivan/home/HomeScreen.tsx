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
import CardDashboardSmall from '../cards/cardDashboardSmall';
import CardLojinha from '../cards/CardLojinha';
import CardAjuda from '../cards/CardAjuda';
import CacheOffline from '../cache/Cacheoffline';

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
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const fetchWorkspaceId = async () => {
      const id = await getActiveWorkspaceId();
      setWorkspaceRefreshKey(id);
    };
    fetchWorkspaceId();
  }, []);

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
      {/* Componente invisível de monitoramento de conectividade */}
      <CacheOffline 
        onConnectivityChange={setIsConnected}
        showReconnectingMessage={true}
      />
      
      {/* Header superior */}
      <View style={[styles.topHeader, { backgroundColor: theme.colors.background }]}>
        <View style={styles.cardWrapper}>
          <CardWorkspace navigation={navigation} />
        </View>
        <View style={styles.cardWrapper}>
          <CardMembros refreshKey={workspaceRefreshKey} />
        </View>
        <View style={styles.cardWrapper}>
          <CardDashboardSmall navigation={navigation} refreshKey={workspaceRefreshKey} />
        </View>
        <View style={styles.cardWrapper}>
          <CardUser navigation={navigation} />
        </View>
      </View>

      {/* Seção de Cards Adicionais */}
      <View style={styles.additionalCardsContainer}>
        <View style={styles.cardRow}>
          <View style={styles.cardHalf}>
            <CardLojinha onPress={() => navigation.navigate('Lojinha')} />
          </View>
          <View style={styles.cardHalf}>
            <CardAjuda onPress={() => navigation.navigate('Ajuda')} />
          </View>
        </View>
      </View>

      {}
      <View style={styles.centerSpace} />

      {}
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

      {}
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

  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  additionalCardsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cardHalf: {
    flex: 1,
    marginHorizontal: 6,
  },

  centerSpace: {
    height: 100,
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
