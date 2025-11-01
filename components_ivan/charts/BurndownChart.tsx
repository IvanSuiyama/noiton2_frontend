import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface MetricasData {
  tarefasTotais: number;
  tarefasConcluidas: number;
  tarefasEmAndamento: number;
  tarefasPendentes: number;
  produtividadeSemanal?: number[];
  ultimasSemanasLabels?: string[];
}

interface MetricasChartProps {
  data: MetricasData;
  title: string;
  isEquipe?: boolean;
}

const MetricasChart: React.FC<MetricasChartProps> = ({
  data,
  title,
  isEquipe = false,
}) => {
  const { theme } = useTheme();

  const porcentagemConcluida = data.tarefasTotais > 0
    ? Math.round((data.tarefasConcluidas / data.tarefasTotais) * 100)
    : 0;

  const porcentagemAndamento = data.tarefasTotais > 0
    ? Math.round((data.tarefasEmAndamento / data.tarefasTotais) * 100)
    : 0;

  const porcentagemPendente = data.tarefasTotais > 0
    ? Math.round((data.tarefasPendentes / data.tarefasTotais) * 100)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title} - {isEquipe ? 'Equipe' : 'Individual'}
      </Text>

      {}
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

      {}
      <View style={styles.progressSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Distribuição das Tarefas
        </Text>

        <BarraProgresso
          porcentagem={porcentagemConcluida}
          cor="#4CAF50"
          label="Concluídas"
          theme={theme}
        />

        <BarraProgresso
          porcentagem={porcentagemAndamento}
          cor="#FF9800"
          label="Em Andamento"
          theme={theme}
        />

        <BarraProgresso
          porcentagem={porcentagemPendente}
          cor="#F44336"
          label="Pendentes"
          theme={theme}
        />
      </View>

      {}
      {data.produtividadeSemanal && data.produtividadeSemanal.length > 0 && (
        <View style={styles.weeklySection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Produtividade Semanal
          </Text>
          <View style={styles.weeklyChart}>
            {data.produtividadeSemanal.map((valor, index) => {
              const maxValue = Math.max(...data.produtividadeSemanal!);
              const altura = maxValue > 0 ? (valor / maxValue) * 80 : 0;

              return (
                <View key={index} style={styles.weeklyBar}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: altura,
                        backgroundColor: theme.colors.primary,
                      }
                    ]}
                  />
                  <Text style={[styles.barValue, { color: theme.colors.text }]}>
                    {valor}
                  </Text>
                  <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                    {data.ultimasSemanasLabels?.[index] || `S${index + 1}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const BarraProgresso = ({
  porcentagem,
  cor,
  label,
  theme
}: {
  porcentagem: number;
  cor: string;
  label: string;
  theme: any;
}) => (
  <View style={styles.progressContainer}>
    <View style={styles.progressHeader}>
      <Text style={[styles.progressLabel, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.progressPercent, { color: theme.colors.text }]}>{porcentagem}%</Text>
    </View>
    <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border }]}>
      <View
        style={[
          styles.progressBarFill,
          {
            backgroundColor: cor,
            width: `${porcentagem}%`
          }
        ]}
      />
    </View>
  </View>
);

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
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  progressSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weeklySection: {
    marginTop: 10,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
  },
  weeklyBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginHorizontal: 2,
  },
  barFill: {
    width: 20,
    borderRadius: 4,
    marginBottom: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export default MetricasChart;
