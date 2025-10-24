import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  apiCall,
  getActiveWorkspaceId,
  getActiveWorkspaceName,
} from '../../services/authService';
import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';
import { useTheme } from '../theme/ThemeContext';


interface HomeCardProps {
  navigation: StackNavigationProp<RootStackParamList>;
}

const HomeCard: React.FC<HomeCardProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [tarefasRecentes, setTarefasRecentes] = useState<TarefaMultiplaInterface[]>([]);
  const [tarefasUrgentes, setTarefasUrgentes] = useState<TarefaMultiplaInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [workspaceIsTeam, setWorkspaceIsTeam] = useState<boolean>(false);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const id = await getActiveWorkspaceId();
      const name = await getActiveWorkspaceName();
      setWorkspaceId(id);
      setWorkspaceName(name || '');

      if (id) {
        // Carregar informações do workspace
        await carregarInfoWorkspace(id);
        
        await Promise.all([
          carregarTarefasRecentes(id),
          carregarTarefasUrgentes(id), // Agora carrega tarefas perto de vencer
        ]);
      }
    } catch (error) {
      console.error('Erro ao inicializar dados do Home:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar informações do workspace (se é de equipe ou individual)
  const carregarInfoWorkspace = async (wsId: number) => {
    try {
      const response = await apiCall(`/workspaces/id/${wsId}`, 'GET');
      setWorkspaceIsTeam(response.equipe || false);
    } catch (error) {
      console.error('Erro ao carregar informações do workspace:', error);
      setWorkspaceIsTeam(false);
    }
  };



  // Carregar as 3 tarefas mais recentes criadas
  const carregarTarefasRecentes = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const tarefasOrdenadas = todasTarefas
        .filter((tarefa: TarefaMultiplaInterface) => tarefa.status !== 'concluido')
        .sort((a: TarefaMultiplaInterface, b: TarefaMultiplaInterface) => {
          const dataA = new Date(a.data_criacao || 0).getTime();
          const dataB = new Date(b.data_criacao || 0).getTime();
          return dataB - dataA;
        })
        .slice(0, 3);
      
      setTarefasRecentes(tarefasOrdenadas);
    } catch (error) {
      console.error('Erro ao carregar tarefas recentes:', error);
    }
  };

  // Carregar as tarefas perto de vencer (1 ou 2 dias)
  const carregarTarefasUrgentes = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
      
      // Data limite: 2 dias a partir de hoje
      const limiteData = new Date(hoje);
      limiteData.setDate(hoje.getDate() + 2);
      
      const tarefasPertoDeVencer = todasTarefas
        .filter((tarefa: TarefaMultiplaInterface) => {
          if (tarefa.status === 'concluido' || !tarefa.data_fim) {
            return false;
          }
          
          const dataFim = new Date(tarefa.data_fim);
          dataFim.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
          
          // Verificar se a data fim é hoje, amanhã ou depois de amanhã
          return dataFim >= hoje && dataFim <= limiteData;
        })
        .sort((a: TarefaMultiplaInterface, b: TarefaMultiplaInterface) => {
          // Ordenar por data fim (mais próximas primeiro)
          const dataA = new Date(a.data_fim!).getTime();
          const dataB = new Date(b.data_fim!).getTime();
          return dataA - dataB;
        })
        .slice(0, 3);
      
      setTarefasUrgentes(tarefasPertoDeVencer);
    } catch (error) {
      console.error('Erro ao carregar tarefas perto de vencer:', error);
    }
  };

    const handleVerTarefa = (tarefa: TarefaMultiplaInterface) => {
    try {
      navigation.navigate('VisualizaTarefa', { 
        id_tarefa: tarefa.id_tarefa,
        titulo: tarefa.titulo 
      });
    } catch (error) {
      console.error('Erro ao navegar para visualizar tarefa:', error);
    }
  };

  const formatarDataHoje = () => {
    const hoje = new Date();
    return hoje.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatarDataTarefa = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const renderTarefa = (tarefa: TarefaMultiplaInterface) => (
    <View key={tarefa.id_tarefa} style={[styles.tarefaItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.tarefaContent}>
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
        <TouchableOpacity
          style={[styles.visualizarButton, { backgroundColor: theme.colors.background }]}
          onPress={() => handleVerTarefa(tarefa)}>
          <Text style={styles.visualizarIcon}>👁️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>


      {/* Dia atual */}
      <View style={[styles.dateSection, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatarDataHoje()}</Text>
      </View>



      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarefas Mais Recentes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>📝 Tarefas Recentes</Text>
          <View style={[styles.tarefasContainer, { backgroundColor: theme.colors.background }]}>
            {tarefasRecentes.length > 0 ? (
              tarefasRecentes.map(renderTarefa)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Nenhuma tarefa recente</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tarefas Perto de Vencer */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>⏰ Tarefas Perto de Vencer</Text>
          <View style={[styles.tarefasContainer, { backgroundColor: theme.colors.background }]}>
            {tarefasUrgentes.length > 0 ? (
              tarefasUrgentes.map(renderTarefa)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Nenhuma tarefa perto de vencer</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    margin: 8,
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
    marginBottom: 16,
    alignItems: 'center',
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
  dateSection: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tarefasContainer: {
    borderRadius: 8,
    padding: 8,
  },
  tarefaItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tarefaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tarefaInfo: {
    flex: 1,
    marginRight: 8,
  },
  tarefaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tarefaDescricao: {
    fontSize: 12,
    marginBottom: 4,
  },
  tarefaData: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  visualizarButton: {
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizarIcon: {
    fontSize: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default HomeCard;
