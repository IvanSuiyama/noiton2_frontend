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
import MetricasChart from '../charts/BurndownChart';
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
  const [isEquipeView, setIsEquipeView] = useState(false);
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

      let workspace;
      try {

        workspace = await apiCall(`/workspaces/id/${workspaceId}`, 'GET');
        setWorkspaceInfo(workspace);
      } catch (workspaceError) {
        console.error('Erro ao carregar workspace:', workspaceError);

        workspace = {
          id_workspace: workspaceId,
          nome: 'Workspace',
          tipo: 'individual' as 'individual' | 'equipe'
        };
        setWorkspaceInfo(workspace);
      }

      try {

        let tarefas;
        if (!isEquipeView && workspace?.tipo === 'equipe') {

          try {
            tarefas = await apiCall(`/tarefas/workspace/${workspaceId}/filtros-avancados?minhas_tarefas=true`, 'GET');
          } catch (filtroError) {
            console.log('Filtros avançados não disponíveis, usando endpoint simples');

            tarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
          }
        } else {

          tarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
        }

        calcularMetricas(tarefas || []);
      } catch (tarefasError) {
        console.error('Erro ao carregar tarefas:', tarefasError);

        calcularMetricas([]);
        Alert.alert('Aviso', 'Não foi possível carregar as tarefas. Mostrando dados vazios.');
      }

    } catch (error) {
      console.error('Erro geral ao carregar dados do dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', `Erro ao carregar métricas: ${errorMessage}`);
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

  const exportarPDF = () => {
    Alert.alert(
      'Exportar PDF',
      `Tarefas Totais: ${metricas.total}\nConcluídas: ${metricas.concluidas}\nAtrasadas: ${metricas.atrasadas}\nEm Andamento: ${metricas.emAndamento}\nPendentes: ${metricas.pendentes}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Baixar PDF', onPress: () => {

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
        {}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              📊 Dashboard
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {workspaceInfo?.nome || 'Workspace'}
            </Text>
          </View>

          {}
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

          {}
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.colors.primary }]}
            onPress={exportarPDF}>
            <Text style={styles.exportButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>

        {}
        <View style={styles.metricsContainer}>
          {renderMetricaCard('Total', metricas.total, theme.colors.text, '📝')}
          {renderMetricaCard('Concluídas', metricas.concluidas, theme.colors.success, '✅')}
          {renderMetricaCard('Em Andamento', metricas.emAndamento, theme.colors.info, '🔄')}
          {renderMetricaCard('Atrasadas', metricas.atrasadas, theme.colors.error, '⚠️')}
        </View>

        {}
        <MetricasChart
          data={{
            tarefasTotais: metricas.total,
            tarefasConcluidas: metricas.concluidas,
            tarefasEmAndamento: metricas.emAndamento,
            tarefasPendentes: metricas.pendentes,
            produtividadeSemanal: [4, 6, 5, 8, 3],
            ultimasSemanasLabels: ['S1', 'S2', 'S3', 'S4', 'S5'],
          }}
          title="Métricas do Projeto"
          isEquipe={isEquipeView}
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
