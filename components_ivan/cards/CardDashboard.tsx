import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import BurndownChart from '../charts/BurndownChart';
import {
  apiCall,
  getActiveWorkspaceId,
  getUserEmail,
} from '../../services/authService';

interface CardDashboardProps {
  navigation: StackNavigationProp<RootStackParamList>;
  refreshKey?: number | null;
}

interface MetricasData {
  total: number;
  concluidas: number;
  atrasadas: number;
  emAndamento: number;
  pendentes: number;
}

interface WorkspaceInfo {
  id_workspace: number;
  nome: string;
  tipo: 'individual' | 'equipe';
}

const CardDashboard: React.FC<CardDashboardProps> = ({ navigation, refreshKey }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<MetricasData>({
    total: 0,
    concluidas: 0,
    atrasadas: 0,
    emAndamento: 0,
    pendentes: 0,
  });
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [isEquipeView, setIsEquipeView] = useState(true); // Switch equipe/individual
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, [refreshKey, isEquipeView]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const workspaceId = await getActiveWorkspaceId();
      const email = await getUserEmail();
      
      if (!workspaceId) {
        throw new Error('Nenhum workspace ativo encontrado');
      }

      setUserEmail(email || '');

      // Carregar informações do workspace
      const workspace = await apiCall(`/workspaces/${workspaceId}`, 'GET');
      setWorkspaceInfo(workspace);

      // Carregar tarefas com filtros baseados na visualização
      let endpoint = `/tarefas/workspace/${workspaceId}`;
      if (!isEquipeView && workspace.tipo === 'equipe') {
        // Visualização individual em workspace de equipe
        endpoint += `/filtros-avancados?minhas_tarefas=true`;
      }

      const tarefas = await apiCall(endpoint, 'GET');
      calcularMetricas(tarefas || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      Alert.alert('Erro', 'Erro ao carregar métricas do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (tarefas: any[]) => {
    const now = new Date();
    
    const metricsData: MetricasData = {
      total: tarefas.length,
      concluidas: 0,
      atrasadas: 0,
      emAndamento: 0,
      pendentes: 0,
    };

    tarefas.forEach(tarefa => {
      switch (tarefa.status) {
        case 'concluido':
          metricsData.concluidas++;
          break;
        case 'em_andamento':
          metricsData.emAndamento++;
          break;
        case 'atrasada':
          metricsData.atrasadas++;
          break;
        default:
          metricsData.pendentes++;
      }
    });

    setMetricas(metricsData);
  };

  // Dados para o gráfico burndown (exemplo simplificado)
  const burndownData = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    ideal: [metricas.total, Math.floor(metricas.total * 0.75), Math.floor(metricas.total * 0.5), Math.floor(metricas.total * 0.25)],
    atual: [metricas.total, metricas.total - Math.floor(metricas.concluidas * 0.3), metricas.total - Math.floor(metricas.concluidas * 0.6), metricas.total - metricas.concluidas],
  };

  const exportarPDF = () => {
    Alert.alert(
      'Exportar PDF',
      `Tarefas Totais: ${metricas.total}\nConcluídas: ${metricas.concluidas}\nAtrasadas: ${metricas.atrasadas}\nEm Andamento: ${metricas.emAndamento}\nPendentes: ${metricas.pendentes}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Baixar PDF', onPress: () => {
          // TODO: Implementar exportação real de PDF
          Alert.alert('PDF', 'Funcionalidade de PDF será implementada em breve!');
        }}
      ]
    );
  };

  const renderMetricaCard = (titulo: string, valor: number, cor: string, icone: string) => (
    <View style={[styles.metricaCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.metricaIcone}>{icone}</Text>
      <Text style={[styles.metricaValor, { color: cor }]}>{valor}</Text>
      <Text style={[styles.metricaTitulo, { color: theme.colors.textSecondary }]}>{titulo}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Carregando métricas...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              📊 Dashboard
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {workspaceInfo?.nome || 'Workspace'}
            </Text>
          </View>

          {/* Switch Equipe/Individual (só aparece em workspaces de equipe) */}
          {workspaceInfo?.tipo === 'equipe' && (
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>
                Individual
              </Text>
              <Switch
                value={isEquipeView}
                onValueChange={setIsEquipeView}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={isEquipeView ? theme.colors.background : theme.colors.textSecondary}
              />
              <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>
                Equipe
              </Text>
            </View>
          )}

          {/* Botão Exportar PDF */}
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.colors.primary }]}
            onPress={exportarPDF}>
            <Text style={styles.exportButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Métricas Cards */}
        <View style={styles.metricsContainer}>
          {renderMetricaCard('Total', metricas.total, theme.colors.text, '📝')}
          {renderMetricaCard('Concluídas', metricas.concluidas, theme.colors.success, '✅')}
          {renderMetricaCard('Em Andamento', metricas.emAndamento, theme.colors.info, '🔄')}
          {renderMetricaCard('Atrasadas', metricas.atrasadas, theme.colors.error, '⚠️')}
        </View>

        {/* Gráfico Burndown */}
        <BurndownChart
          data={burndownData}
          title={`Burndown Chart - ${isEquipeView ? 'Equipe' : 'Individual'}`}
        />
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
    padding: 16,
    borderRadius: 16,
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  exportButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  metricaCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricaIcone: {
    fontSize: 28,
    marginBottom: 8,
  },
  metricaValor: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricaTitulo: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CardDashboard;