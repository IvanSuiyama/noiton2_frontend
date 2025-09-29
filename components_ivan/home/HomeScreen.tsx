import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import CardWorkspace from '../cards/cardWorkspace';
import CardUser from '../cards/cardUser';
// import HomeCard from '../cards/HomeCard';
import CardTarefas from '../cards/cardTarefas';
import { getActiveWorkspaceId } from '../../services/authService';
import CardMembros from '../cards/cardMembros';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Removido controle de abas, sempre mostra tarefas
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

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Header Superior com Cards */}
      <View style={styles.topHeader}>
  <CardWorkspace navigation={navigation}  />
 <View style={{ marginRight: 90 }}>
  <CardMembros refreshKey={workspaceRefreshKey} />
</View>
  <CardUser navigation={navigation} />
      </View>

      {/* Cabeçalho com Data Atual */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{currentDate}</Text>
      </View>

      {/* Conteúdo Principal sem ScrollView, rolagem fica no FlatList do CardTarefas */}
      <View style={styles.mainContent}>
        <View style={styles.cardContainer}>
          <CardTarefas navigation={navigation} refreshKey={workspaceRefreshKey} />
        </View>
        {/* Espaçamento inferior */}
        <View style={styles.bottomSpacing} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    gap: 12,
    minHeight: 80,
  },
  
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 0,
    borderRadius: 0,
    paddingVertical: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
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
    borderBottomColor: 'rgba(108, 117, 125, 0.8)',
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },

  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  
  mainContent: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },

  scrollContent: {
    flexGrow: 1,
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