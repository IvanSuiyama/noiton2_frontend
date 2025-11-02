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
import PdfService from '../../services/pdfService';

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
  const [switchingMode, setSwitchingMode] = useState(false);
  const [metricas, setMetricas] = useState<MetricasData>({
    total: 0,
    concluidas: 0,
    atrasadas: 0,
    emAndamento: 0,
    pendentes: 0,
  });
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [isEquipeView, setIsEquipeView] = useState(false); // Sempre começar no modo Individual
  const [userEmail, setUserEmail] = useState<string>('');

  const handleSwitchChange = async (newValue: boolean) => {
    setSwitchingMode(true);
    setIsEquipeView(newValue);
    // O useEffect vai detectar a mudança e recarregar os dados
    setTimeout(() => setSwitchingMode(false), 1000); // Reset após 1 segundo
  };

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
        console.log('📋 Workspace carregado:', JSON.stringify(workspace, null, 2));
        console.log('📋 Tipo do workspace:', workspace?.tipo);
        console.log('📋 Outros campos possíveis:', {
          type: workspace?.type,
          workspace_type: workspace?.workspace_type,
          tipoWorkspace: workspace?.tipoWorkspace,
          categoria: workspace?.categoria
        });
        
        // Corrigir o tipo se vier undefined ou com outro nome
        if (!workspace.tipo) {
          workspace.tipo = workspace.type || workspace.workspace_type || workspace.tipoWorkspace || 'equipe'; // assumir equipe por padrão
          console.log('🔧 Tipo corrigido para:', workspace.tipo);
        }
        
        // Garantir que sempre tenha um tipo definido
        if (!workspace.tipo) {
          workspace.tipo = 'equipe'; // Por padrão, assumir equipe se não especificado
          console.log('🔧 Assumindo workspace como equipe (padrão)');
        }
        
        setWorkspaceInfo(workspace);
      } catch (workspaceError) {
        console.error('Erro ao carregar workspace:', workspaceError);

        workspace = {
          id_workspace: workspaceId,
          nome: 'Workspace',
          tipo: 'individual' as 'individual' | 'equipe'
        };
        console.log('⚠️ Usando workspace padrão (erro na API):', workspace);
        setWorkspaceInfo(workspace);
      }

      try {
        let tarefas;
        
        console.log('🔍 Carregando tarefas:', {
          workspaceId,
          workspaceType: workspace?.tipo,
          isEquipeView,
          userEmail: email
        });

        if (workspace?.tipo === 'equipe' || (workspace && !workspace.tipo)) {
          if (isEquipeView) {
            // Visualização de EQUIPE: todas as tarefas do workspace
            console.log('📊 Modo EQUIPE: carregando todas as tarefas do workspace');
            tarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
          } else {
            // Visualização INDIVIDUAL: apenas tarefas do usuário logado
            console.log('👤 Modo INDIVIDUAL: carregando apenas minhas tarefas');
            try {
              // Tentar endpoint específico para usuário
              tarefas = await apiCall(`/tarefas/workspace/${workspaceId}/usuario/${email}`, 'GET');
            } catch (filtroError) {
              console.log('⚠️ Endpoint específico falhou, tentando filtros avançados...');
              try {
                tarefas = await apiCall(`/tarefas/workspace/${workspaceId}/filtros-avancados?minhas_tarefas=true`, 'GET');
              } catch (filtroError2) {
                console.log('⚠️ Filtros avançados falharam, usando filtro manual...');
                // Fallback: carregar todas e filtrar no frontend
                const todasTarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
                tarefas = todasTarefas.filter((tarefa: any) => 
                  tarefa.criado_por === email || 
                  tarefa.usuario_criador === email ||
                  tarefa.email_criador === email
                );
                console.log(`🔧 Filtro manual aplicado: ${todasTarefas.length} → ${tarefas.length} tarefas`);
              }
            }
          }
        } else {
          // Workspace individual: sempre mostrar todas as tarefas (já são do usuário)
          console.log('📝 Workspace individual: carregando todas as tarefas');
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

  const exportarPDF = async () => {
    try {
      // Verificar disponibilidade do serviço
      const disponivel = await PdfService.verificarDisponibilidade();
      
      if (!disponivel) {
        Alert.alert('Erro', 'Serviço de relatório não está disponível no momento.');
        return;
      }

      // Gerar relatório HTML e salvar
      Alert.alert(
        'Gerar Relatório',
        'Deseja gerar um relatório HTML das métricas? O arquivo será salvo na pasta Downloads.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Baixar Relatório', 
            onPress: async () => {
              const sucesso = await PdfService.gerarRelatorioPDF(
                metricas, 
                workspaceInfo, 
                isEquipeView, 
                userEmail
              );
              if (!sucesso) {
                Alert.alert('Erro', 'Não foi possível gerar o relatório.');
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório. Tente novamente.');
    }
  };



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
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                📊 Métricas
              </Text>
              
              {(workspaceInfo?.tipo === 'equipe' || (workspaceInfo && !workspaceInfo.tipo)) && (
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, { 
                    color: !isEquipeView ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: !isEquipeView ? 'bold' : 'normal'
                  }]}>
                    Individual
                  </Text>
                  <Switch
                    value={isEquipeView}
                    onValueChange={handleSwitchChange}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={isEquipeView ? theme.colors.background : theme.colors.textSecondary}
                    disabled={switchingMode}
                  />
                  <Text style={[styles.switchLabel, { 
                    color: isEquipeView ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isEquipeView ? 'bold' : 'normal'
                  }]}>
                    Equipe
                  </Text>
                  {switchingMode && (
                    <ActivityIndicator 
                      size="small" 
                      color={theme.colors.primary} 
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
              )}
            </View>
            
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {workspaceInfo?.nome || 'Workspace'}
              {(workspaceInfo?.tipo === 'equipe' || (workspaceInfo && !workspaceInfo.tipo)) && (
                <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  {' '}• {isEquipeView ? 'Equipe' : 'Individual'}
                </Text>
              )}
            </Text>
          </View>

          {}
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.colors.primary }]}
            onPress={exportarPDF}>
            <Text style={styles.exportButtonText}>📊 Relatório</Text>
          </TouchableOpacity>
        </View>

        {}
        <MetricasChart
          data={{
            tarefasTotais: metricas.total,
            tarefasConcluidas: metricas.concluidas,
            tarefasEmAndamento: metricas.emAndamento,
            tarefasPendentes: metricas.pendentes,
          }}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
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

});

export default CardDashboard;
