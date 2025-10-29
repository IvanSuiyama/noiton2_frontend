import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import {
  apiCall,
  getActiveWorkspaceId,
} from '../../services/authService';

type CardDashboardSmallNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface MetricasData {
  total: number;
  concluidas: number;
  atrasadas: number;
  emAndamento: number;
}

type Props = {
  navigation: CardDashboardSmallNavigationProp;
  refreshKey?: number | null;
};

const CardDashboardSmall: React.FC<Props> = ({ navigation, refreshKey }) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metricas, setMetricas] = useState<MetricasData>({
    total: 0,
    concluidas: 0,
    atrasadas: 0,
    emAndamento: 0,
  });

  useEffect(() => {
    if (showModal && !loading) {
      carregarMetricas();
    }
  }, [showModal, refreshKey]);

  const carregarMetricas = async () => {
    try {
      setLoading(true);
      const workspaceId = await getActiveWorkspaceId();
      
      if (!workspaceId) {
        throw new Error('Nenhum workspace ativo encontrado');
      }

      const tarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
      calcularMetricas(tarefas || []);
      
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      Alert.alert('Erro', 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (tarefas: any[]) => {
    const metricsData: MetricasData = {
      total: tarefas.length,
      concluidas: 0,
      atrasadas: 0,
      emAndamento: 0,
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
      }
    });

    setMetricas(metricsData);
  };

  const handleCardPress = () => {
    setShowModal(true);
  };

  const handleViewFullDashboard = () => {
    setShowModal(false);
    navigation.navigate('Dashboard');
  };

  const renderMetricaRow = (icon: string, label: string, valor: number, cor: string) => (
    <View style={styles.metricaRow}>
      <Text style={styles.metricaIcon}>{icon}</Text>
      <Text style={[styles.metricaLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricaValor, { color: cor }]}>{valor}</Text>
    </View>
  );

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.dashboardCard,
          { backgroundColor: theme.colors.surface }
        ]}
        onPress={handleCardPress}
      >
        <View style={[styles.dashboardIcon, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.dashboardIconText, { color: theme.colors.text }]}>
            📊
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal com Métricas Resumidas */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.metricasModal, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>📊 Métricas Rápidas</Text>
              <TouchableOpacity 
                onPress={() => setShowModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Carregando...
                </Text>
              </View>
            ) : (
              <View style={styles.metricasContainer}>
                {renderMetricaRow('📝', 'Total', metricas.total, theme.colors.text)}
                {renderMetricaRow('✅', 'Concluídas', metricas.concluidas, theme.colors.success)}
                {renderMetricaRow('🔄', 'Em Andamento', metricas.emAndamento, theme.colors.info)}
                {renderMetricaRow('⚠️', 'Atrasadas', metricas.atrasadas, theme.colors.error)}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.fullDashboardButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleViewFullDashboard}
            >
              <Text style={styles.fullDashboardButtonText}>Ver Dashboard Completo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  dashboardCard: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dashboardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricasModal: {
    borderRadius: 12,
    margin: 20,
    width: '85%',
    maxWidth: 350,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 18,
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  metricasContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  metricaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricaIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  metricaLabel: {
    fontSize: 14,
    flex: 1,
  },
  metricaValor: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  fullDashboardButton: {
    margin: 20,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullDashboardButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CardDashboardSmall;