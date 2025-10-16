import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ProgressChartProps {
  title: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks?: number;
  showPercentage?: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  totalTasks,
  completedTasks,
  overdueTasks = 0,
  showPercentage = true,
}) => {
  const { theme } = useTheme();

  const pendingTasks = totalTasks - completedTasks - overdueTasks;
  const completedPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overduePercentage = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
  const pendingPercentage = totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Título */}
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      
      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{totalTasks}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.colors.success }]}>{completedTasks}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Concluídas</Text>
        </View>
        {overdueTasks > 0 && (
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>{overdueTasks}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Atrasadas</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.colors.warning }]}>{pendingTasks}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pendentes</Text>
        </View>
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          {/* Barra de Concluídas */}
          {completedPercentage > 0 && (
            <View
              style={[
                styles.progressSegment,
                {
                  backgroundColor: theme.colors.success,
                  width: `${completedPercentage}%`,
                },
              ]}
            />
          )}
          
          {/* Barra de Atrasadas */}
          {overduePercentage > 0 && (
            <View
              style={[
                styles.progressSegment,
                {
                  backgroundColor: theme.colors.error,
                  width: `${overduePercentage}%`,
                  marginLeft: completedPercentage > 0 ? 1 : 0,
                },
              ]}
            />
          )}
          
          {/* Barra de Pendentes */}
          {pendingPercentage > 0 && (
            <View
              style={[
                styles.progressSegment,
                {
                  backgroundColor: theme.colors.warning,
                  width: `${pendingPercentage}%`,
                  marginLeft: (completedPercentage > 0 || overduePercentage > 0) ? 1 : 0,
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Porcentagem */}
      {showPercentage && (
        <Text style={[styles.percentage, { color: theme.colors.text }]}>
          {completedPercentage.toFixed(0)}% concluído
        </Text>
      )}

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.colors.success }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Concluídas</Text>
        </View>
        {overdueTasks > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.colors.error }]} />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Atrasadas</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: theme.colors.warning }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Pendentes</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
  },
});

export default ProgressChart;