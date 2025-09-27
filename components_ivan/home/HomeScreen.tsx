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
import HomeCard from '../cards/HomeCard';
import CardTarefas from '../cards/cardTarefas';
import CardTarefasRecorrentes from '../cards/cardTarefasRecorrentes';
import CardMembros from '../cards/cardMembros';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tarefas' | 'recorrentes'>('home');

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


  // CardMembros agora busca tudo sozinho

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeCard navigation={navigation} />;
      case 'tarefas':
        return <CardTarefas navigation={navigation} />;
      case 'recorrentes':
        return <CardTarefasRecorrentes navigation={navigation} />;
      default:
        return <HomeCard navigation={navigation} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Superior com Cards */}
      <View style={styles.topHeader}>
  <CardWorkspace navigation={navigation} />
 <View style={{ marginRight: 70 }}>
  <CardMembros />
</View>
  <CardUser navigation={navigation} />
      </View>

      {/* Cabeçalho com Data Atual */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{currentDate}</Text>
      </View>

      {/* Menu de Navegação Horizontal */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'home' && styles.activeTab]}
          onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
            🏠 Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'tarefas' && styles.activeTab]}
          onPress={() => setActiveTab('tarefas')}>
          <Text style={[styles.tabText, activeTab === 'tarefas' && styles.activeTabText]}>
            📋 Tarefas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'recorrentes' && styles.activeTab]}
          onPress={() => setActiveTab('recorrentes')}>
          <Text style={[styles.tabText, activeTab === 'recorrentes' && styles.activeTabText]}>
            ♻️ Recorrentes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal com Scroll */}
      <ScrollView
        style={styles.mainContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ffffff']}
            tintColor="#ffffff"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.cardContainer}>
          {renderTabContent()}
        </View>
        {/* Espaçamento inferior */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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