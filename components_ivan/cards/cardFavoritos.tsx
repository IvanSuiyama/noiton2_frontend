import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  apiCall,
  getActiveWorkspaceId,
} from '../../services/authService';
import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

interface CardFavoritosProps {
  navigation: StackNavigationProp<RootStackParamList>;
}

const CardFavoritos: React.FC<CardFavoritosProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [tarefasFavoritas, setTarefasFavoritas] = useState<TarefaMultiplaInterface[]>([]);
  const [tarefasDisponiveis, setTarefasDisponiveis] = useState<TarefaMultiplaInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFavoritos, setShowAddFavoritos] = useState(false);

  const STORAGE_KEY = 'tarefas_favoritas';
  const MAX_FAVORITOS = 10;
  const MAX_PINNED = 3;

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar tarefas do workspace
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId) {
        throw new Error('Nenhum workspace ativo encontrado');
      }

      const response = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
      const todasTarefas = response || [];
      
      // Carregar favoritos do AsyncStorage
      const favoritosStorage = await AsyncStorage.getItem(STORAGE_KEY);
      const favoritosIds = favoritosStorage ? JSON.parse(favoritosStorage) : [];
      
      // Filtrar tarefas favoritas
      const favoritas = todasTarefas.filter((tarefa: TarefaMultiplaInterface) => 
        favoritosIds.some((fav: any) => fav.id === tarefa.id_tarefa)
      );
      
      // Adicionar informação de pin
      const favoritasComPin = favoritas.map((tarefa: TarefaMultiplaInterface) => {
        const favInfo = favoritosIds.find((fav: any) => fav.id === tarefa.id_tarefa);
        return {
          ...tarefa,
          isPinned: favInfo?.isPinned || false,
          pinnedOrder: favInfo?.pinnedOrder || 0
        };
      });
      
      // Ordenar: tarefas pinadas primeiro, depois por ordem de adição
      favoritasComPin.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) { return -1; }
        if (!a.isPinned && b.isPinned) { return 1; }
        if (a.isPinned && b.isPinned) { return a.pinnedOrder - b.pinnedOrder; }
        return 0;
      });
      
      setTarefasFavoritas(favoritasComPin);
      
      // Tarefas disponíveis (não favoritas)
      const disponiveis = todasTarefas.filter((tarefa: TarefaMultiplaInterface) => 
        !favoritosIds.some((fav: any) => fav.id === tarefa.id_tarefa)
      );
      setTarefasDisponiveis(disponiveis);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Erro ao carregar tarefas favoritas');
    } finally {
      setLoading(false);
    }
  };

  const adicionarFavorito = async (tarefa: TarefaMultiplaInterface) => {
    try {
      if (tarefasFavoritas.length >= MAX_FAVORITOS) {
        Alert.alert('Limite atingido', `Você pode ter no máximo ${MAX_FAVORITOS} tarefas favoritas`);
        return;
      }

      const favoritosStorage = await AsyncStorage.getItem(STORAGE_KEY);
      const favoritosIds = favoritosStorage ? JSON.parse(favoritosStorage) : [];
      
      const novoFavorito = {
        id: tarefa.id_tarefa,
        isPinned: false,
        pinnedOrder: 0,
        addedAt: new Date().getTime()
      };
      
      favoritosIds.push(novoFavorito);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favoritosIds));
      
      await carregarDados();
      Alert.alert('Sucesso', 'Tarefa adicionada aos favoritos!');
      
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      Alert.alert('Erro', 'Erro ao adicionar tarefa aos favoritos');
    }
  };

  const removerFavorito = async (tarefaId: number) => {
    try {
      const favoritosStorage = await AsyncStorage.getItem(STORAGE_KEY);
      const favoritosIds = favoritosStorage ? JSON.parse(favoritosStorage) : [];
      
      const novosFavoritos = favoritosIds.filter((fav: any) => fav.id !== tarefaId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novosFavoritos));
      
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      Alert.alert('Erro', 'Erro ao remover tarefa dos favoritos');
    }
  };

  const togglePin = async (tarefaId: number) => {
    try {
      const favoritosStorage = await AsyncStorage.getItem(STORAGE_KEY);
      const favoritosIds = favoritosStorage ? JSON.parse(favoritosStorage) : [];
      
      const tarefaIndex = favoritosIds.findIndex((fav: any) => fav.id === tarefaId);
      if (tarefaIndex === -1) { return; }
      
      const tarefa = favoritosIds[tarefaIndex];
      
      if (!tarefa.isPinned) {
        // Verificar limite de pins
        const pinnedCount = favoritosIds.filter((fav: any) => fav.isPinned).length;
        if (pinnedCount >= MAX_PINNED) {
          Alert.alert('Limite atingido', `Você pode fixar no máximo ${MAX_PINNED} tarefas`);
          return;
        }
        
        // Fixar tarefa
        tarefa.isPinned = true;
        tarefa.pinnedOrder = pinnedCount;
      } else {
        // Desfixar tarefa
        tarefa.isPinned = false;
        tarefa.pinnedOrder = 0;
        
        // Reordenar outras tarefas pinadas
        favoritosIds.forEach((fav: any) => {
          if (fav.isPinned && fav.pinnedOrder > tarefa.pinnedOrder) {
            fav.pinnedOrder--;
          }
        });
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favoritosIds));
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao alterar pin:', error);
      Alert.alert('Erro', 'Erro ao fixar/desfixar tarefa');
    }
  };

  const handleVerTarefa = (tarefa: TarefaMultiplaInterface) => {
    navigation.navigate('VisualizaTarefa', { 
      id_tarefa: tarefa.id_tarefa,
      titulo: tarefa.titulo 
    });
  };

  const formatarDataTarefa = (dataString: string): string => {
    const data = new Date(dataString);
    const hoje = new Date();
    const diffTime = data.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) { return 'Hoje'; }
    if (diffDays === 1) { return 'Amanhã'; }
    if (diffDays === -1) { return 'Ontem'; }
    if (diffDays < 0) { return `Há ${Math.abs(diffDays)} dias`; }
    return `Em ${diffDays} dias`;
  };

  const renderTarefaFavorita = (tarefa: any) => (
    <View key={tarefa.id_tarefa} style={[
      styles.tarefaItem,
      { backgroundColor: theme.colors.background },
      tarefa.isPinned && { ...styles.tarefaPinned, borderColor: theme.colors.warning }
    ]}>
      <View style={styles.tarefaHeader}>
        {tarefa.isPinned && (
          <Text style={styles.pinIcon}>📌</Text>
        )}
        <View style={styles.tarefaInfo}>
          <Text style={[styles.tarefaTitulo, { color: theme.colors.text }]} numberOfLines={1}>
            {tarefa.titulo}
          </Text>
          {tarefa.descricao && (
            <Text style={[styles.tarefaDescricao, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {tarefa.descricao}
            </Text>
          )}
          {tarefa.data_fim && (
            <Text style={[styles.tarefaData, { color: theme.colors.textSecondary }]}>
              📅 {formatarDataTarefa(tarefa.data_fim)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.tarefaActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.pinButton]}
          onPress={() => togglePin(tarefa.id_tarefa)}>
          <Text style={styles.actionIcon}>
            {tarefa.isPinned ? '📌' : '📍'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleVerTarefa(tarefa)}>
          <Text style={styles.actionIcon}>👁️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => removerFavorito(tarefa.id_tarefa)}>
          <Text style={styles.actionIcon}>⭐</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTarefaDisponivel = (tarefa: TarefaMultiplaInterface) => (
    <View key={tarefa.id_tarefa} style={styles.tarefaDisponivelItem}>
      <View style={styles.tarefaInfo}>
        <Text style={styles.tarefaTitulo} numberOfLines={1}>
          {tarefa.titulo}
        </Text>
        {tarefa.descricao && (
          <Text style={styles.tarefaDescricao} numberOfLines={1}>
            {tarefa.descricao}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.addButton]}
        onPress={() => adicionarFavorito(tarefa)}>
        <Text style={styles.actionIcon}>⭐</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Carregando favoritos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>⭐ Tarefas Favoritas</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {tarefasFavoritas.length}/{MAX_FAVORITOS} tarefas
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarefas Favoritas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seus Favoritos</Text>
            <Text style={[styles.pinInfo, { color: theme.colors.textSecondary }]}>
              📌 {tarefasFavoritas.filter((t: any) => t.isPinned).length}/{MAX_PINNED}
            </Text>
          </View>
          
          {tarefasFavoritas.length > 0 ? (
            <View style={[styles.favoritosContainer, { backgroundColor: theme.colors.surface }]}>
              {tarefasFavoritas.map(renderTarefaFavorita)}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Nenhuma tarefa favorita</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Adicione tarefas aos seus favoritos para acesso rápido
              </Text>
            </View>
          )}
        </View>

        {/* Botão para mostrar/ocultar tarefas disponíveis */}
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setShowAddFavoritos(!showAddFavoritos)}>
          <Text style={[styles.toggleButtonText, { color: theme.colors.primary }]}>
            {showAddFavoritos ? '▼ Ocultar' : '▶ Adicionar'} Tarefas aos Favoritos
          </Text>
        </TouchableOpacity>

        {/* Tarefas Disponíveis */}
        {showAddFavoritos && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarefas Disponíveis</Text>
            
            {tarefasDisponiveis.length > 0 ? (
              <View style={styles.disponiveisContainer}>
                {tarefasDisponiveis.slice(0, 20).map(renderTarefaDisponivel)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Todas as tarefas já estão nos favoritos
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pinInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  favoritosContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
  },
  disponiveisContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
  },
  tarefaItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tarefaPinned: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 2,
  },
  tarefaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pinIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  tarefaInfo: {
    flex: 1,
  },
  tarefaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tarefaDescricao: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tarefaData: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  tarefaActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tarefaDisponivelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButton: {
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButton: {
    backgroundColor: '#ffc107',
  },
  viewButton: {
    backgroundColor: '#17a2b8',
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  addButton: {
    backgroundColor: '#28a745',
  },
  actionIcon: {
    fontSize: 16,
  },
  toggleButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CardFavoritos;
