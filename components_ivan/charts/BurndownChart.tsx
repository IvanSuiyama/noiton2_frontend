import React from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface MetricasData {
  tarefasTotais: number;
  tarefasConcluidas: number;
  tarefasEmAndamento: number;
  tarefasPendentes: number;
}

interface MetricasChartProps {
  data: MetricasData;
  isEquipe?: boolean;
}

const MetricasChart: React.FC<MetricasChartProps> = ({
  data,
  isEquipe = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.metricsGrid}>
        <MetricaCard
          valor={data.tarefasConcluidas}
          label="Concluídas"
          cor="#4CAF50"
          theme={theme}
        />
        <MetricaCard
          valor={data.tarefasEmAndamento}
          label="Em Andamento"
          cor="#FF9800"
          theme={theme}
        />
        <MetricaCard
          valor={data.tarefasPendentes}
          label="Pendentes"
          cor="#F44336"
          theme={theme}
        />
        <MetricaCard
          valor={data.tarefasTotais}
          label="Total"
          cor={theme.colors.primary}
          theme={theme}
        />
      </View>
    </View>
  );
};



const MetricaCard = ({
  valor,
  label,
  cor,
  theme
}: {
  valor: number;
  label: string;
  cor: string;
  theme: any;
}) => (
  <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
    <Text style={[styles.metricValue, { color: cor }]}>{valor}</Text>
    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    margin: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MetricasChart;
