import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';

interface BurndownData {
  labels: string[];
  ideal: number[];
  atual: number[];
}

interface BurndownChartProps {
  data: BurndownData;
  title: string;
  width?: number;
  height?: number;
}

const BurndownChart: React.FC<BurndownChartProps> = ({
  data,
  title,
  width = Dimensions.get('window').width - 32,
  height = 200,
}) => {
  // Calcular valores máximos para escala
  const maxValue = Math.max(...data.ideal, ...data.atual, 0);
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Função para calcular posição X
  const getX = (index: number) => {
    return padding + (index / (data.labels.length - 1)) * chartWidth;
  };

  // Função para calcular posição Y
  const getY = (value: number) => {
    return padding + (1 - value / maxValue) * chartHeight;
  };

  // Gerar pontos para linha ideal
  const idealPoints = data.ideal.map((value, index) => ({
    x: getX(index),
    y: getY(value),
  }));

  // Gerar pontos para linha atual
  const atualPoints = data.atual.map((value, index) => ({
    x: getX(index),
    y: getY(value),
  }));

  // Função para criar path SVG
  const createPath = (points: {x: number, y: number}[]) => {
    return points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');
  };

  return (
    <View style={[styles.container]}>
      <Text style={[styles.title]}>
        {title}
      </Text>
      
      <View style={styles.chartContainer}>
        {/* Gráfico usando Views simples */}
        <View style={[styles.chartArea, { width, height }]}>
          
          {/* Linhas de grade horizontais */}
          {Array.from({ length: 5 }, (_, i) => (
            <View
              key={`grid-h-${i}`}
              style={[
                styles.gridLine,
                {
                  top: padding + (i / 4) * chartHeight,
                  left: padding,
                  width: chartWidth,
                  height: 1,
                }
              ]}
            />
          ))}

          {/* Linhas de grade verticais */}
          {data.labels.map((_, index) => (
            <View
              key={`grid-v-${index}`}
              style={[
                styles.gridLine,
                {
                  top: padding,
                  left: getX(index),
                  width: 1,
                  height: chartHeight,
                }
              ]}
            />
          ))}

          {/* Linha ideal (cinza) */}
          {idealPoints.map((point, index) => {
            if (index === idealPoints.length - 1) { return null; }
            const nextPoint = idealPoints[index + 1];
            const lineWidth = Math.sqrt(
              Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
            );
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
            
            return (
              <View
                key={`ideal-${index}`}
                style={[
                  styles.lineSegment,
                  styles.idealLine,
                  {
                    left: point.x,
                    top: point.y - 1,
                    width: lineWidth,
                    transform: [{ rotate: `${angle}rad` }],
                  }
                ]}
              />
            );
          })}

          {/* Linha atual (azul) */}
          {atualPoints.map((point, index) => {
            if (index === atualPoints.length - 1) { return null; }
            const nextPoint = atualPoints[index + 1];
            const lineWidth = Math.sqrt(
              Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
            );
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
            
            return (
              <View
                key={`atual-${index}`}
                style={[
                  styles.lineSegment,
                  styles.atualLine,
                  {
                    left: point.x,
                    top: point.y - 1.5,
                    width: lineWidth,
                    transform: [{ rotate: `${angle}rad` }],
                  }
                ]}
              />
            );
          })}

          {/* Pontos da linha ideal */}
          {idealPoints.map((point, index) => (
            <View
              key={`ideal-dot-${index}`}
              style={[
                styles.dot,
                styles.idealDot,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                }
              ]}
            />
          ))}

          {/* Pontos da linha atual */}
          {atualPoints.map((point, index) => (
            <View
              key={`atual-dot-${index}`}
              style={[
                styles.dot,
                styles.atualDot,
                {
                  left: point.x - 5,
                  top: point.y - 5,
                }
              ]}
            />
          ))}

          {/* Labels do eixo X */}
          {data.labels.map((label, index) => (
            <Text
              key={`label-${index}`}
              style={[
                styles.axisLabel,
                {
                  left: getX(index) - 20,
                  top: height - 20,
                  width: 40,
                }
              ]}
            >
              {label}
            </Text>
          ))}

          {/* Labels do eixo Y */}
          {Array.from({ length: 5 }, (_, i) => {
            const value = Math.round((maxValue * (4 - i)) / 4);
            return (
              <Text
                key={`y-label-${i}`}
                style={[
                  styles.yAxisLabel,
                  {
                    left: 5,
                    top: padding + (i / 4) * chartHeight - 8,
                  }
                ]}
              >
                {value}
              </Text>
            );
          })}
        </View>
      </View>

      {/* Legenda */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.idealLegendDot]} />
          <Text style={[styles.legendText]}>
            Burndown Ideal
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.atualLegendDot]} />
          <Text style={[styles.legendText]}>
            Burndown Atual
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
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
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chartArea: {
    position: 'relative',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#e0e0e0',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: '0% 50%',
  },
  idealLine: {
    backgroundColor: '#888888',
    height: 2,
  },
  atualLine: {
    backgroundColor: '#007bff',
    height: 3,
  },
  dot: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  idealDot: {
    width: 8,
    height: 8,
    backgroundColor: '#888888',
  },
  atualDot: {
    width: 10,
    height: 10,
    backgroundColor: '#007bff',
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 12,
    color: '#666',
    width: 30,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  idealLegendDot: {
    backgroundColor: '#888888',
  },
  atualLegendDot: {
    backgroundColor: '#007bff',
  },
  legendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default BurndownChart;