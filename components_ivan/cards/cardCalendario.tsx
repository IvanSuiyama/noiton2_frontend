import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import {
  apiCall,
  getActiveWorkspaceId,
} from '../../services/authService';
import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';

interface CardCalendarioProps {
  navigation: StackNavigationProp<RootStackParamList>;
  refreshKey?: number | null;
}

interface DiaCalendario {
  data: Date;
  dia: number;
  ehMesAtual: boolean;
  ehHoje: boolean;
  tarefas: TarefaMultiplaInterface[];
}

const CardCalendario: React.FC<CardCalendarioProps> = ({ navigation, refreshKey }) => {
  const { theme } = useTheme();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diasCalendario, setDiasCalendario] = useState<DiaCalendario[]>([]);
  const [tarefasSelecionadas, setTarefasSelecionadas] = useState<TarefaMultiplaInterface[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [todasTarefas, setTodasTarefas] = useState<TarefaMultiplaInterface[]>([]);

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    carregarTarefas();
  }, [refreshKey]);

  useEffect(() => {
    gerarCalendario();
  }, [mesAtual, todasTarefas]);

  const carregarTarefas = async () => {
    try {
      setLoading(true);
      
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId) {
        throw new Error('Nenhum workspace ativo encontrado');
      }

      const response = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
      const tarefas = response || [];
      
      setTodasTarefas(tarefas);
      
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert('Erro', 'Erro ao carregar tarefas do calendário');
    } finally {
      setLoading(false);
    }
  };

  const gerarCalendario = () => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const ultimoDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
    const primeiroDiaCalendario = new Date(primeiroDiaMes);
    
    // Ajustar para começar no domingo
    primeiroDiaCalendario.setDate(primeiroDiaCalendario.getDate() - primeiroDiaMes.getDay());

    const dias: DiaCalendario[] = [];

    // Gerar 42 dias (6 semanas)
    for (let i = 0; i < 42; i++) {
      const data = new Date(primeiroDiaCalendario);
      data.setDate(primeiroDiaCalendario.getDate() + i);

      const tarefasDoDia = todasTarefas.filter(tarefa => {
        if (!tarefa.data_fim) { return false; }
        
        const dataFim = new Date(tarefa.data_fim);
        return (
          dataFim.getDate() === data.getDate() &&
          dataFim.getMonth() === data.getMonth() &&
          dataFim.getFullYear() === data.getFullYear()
        );
      });

      dias.push({
        data: new Date(data),
        dia: data.getDate(),
        ehMesAtual: data.getMonth() === mesAtual.getMonth(),
        ehHoje: (
          data.getDate() === hoje.getDate() &&
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        ),
        tarefas: tarefasDoDia,
      });
    }

    setDiasCalendario(dias);
  };

  const navegarMes = (direcao: number) => {
    const novoMes = new Date(mesAtual);
    novoMes.setMonth(novoMes.getMonth() + direcao);
    setMesAtual(novoMes);
    setDataSelecionada(null);
    setTarefasSelecionadas([]);
  };

  const selecionarDia = (dia: DiaCalendario) => {
    setDataSelecionada(dia.data);
    setTarefasSelecionadas(dia.tarefas);
  };

  const formatarData = (data: Date): string => {
    return `${data.getDate()}/${data.getMonth() + 1}/${data.getFullYear()}`;
  };

  const handleVerTarefa = (tarefa: TarefaMultiplaInterface) => {
    navigation.navigate('VisualizaTarefa', { 
      id_tarefa: tarefa.id_tarefa,
      titulo: tarefa.titulo 
    });
  };

  const renderDia = (dia: DiaCalendario, index: number) => {
    const isSelected = dataSelecionada && 
      dia.data.getTime() === dataSelecionada.getTime();

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.diaContainer,
          { backgroundColor: theme.colors.surface },
          !dia.ehMesAtual && styles.diaOutroMes,
          dia.ehHoje && { backgroundColor: theme.colors.primary },
          isSelected && { backgroundColor: theme.colors.success },
        ]}
        onPress={() => selecionarDia(dia)}
        disabled={!dia.ehMesAtual}>
        
        <Text style={[
          styles.diaTexto,
          { color: theme.colors.text },
          !dia.ehMesAtual && { color: theme.colors.textSecondary },
          (dia.ehHoje || isSelected) && { color: theme.colors.background },
        ]}>
          {dia.dia}
        </Text>
        
        {dia.tarefas.length > 0 && (
          <View style={[styles.indicadorTarefas, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.numeroTarefas}>
              {dia.tarefas.length > 9 ? '9+' : dia.tarefas.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTarefa = (tarefa: TarefaMultiplaInterface) => (
    <TouchableOpacity
      key={tarefa.id_tarefa}
      style={[styles.tarefaItem, { 
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border 
      }]}
      onPress={() => handleVerTarefa(tarefa)}>
      <View style={styles.tarefaContent}>
        <View style={styles.tarefaInfo}>
          <Text style={[styles.tarefaTitulo, { color: theme.colors.text }]} numberOfLines={1}>
            {tarefa.titulo}
          </Text>
          {tarefa.descricao && (
            <Text style={[styles.tarefaDescricao, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {tarefa.descricao}
            </Text>
          )}
          <View style={styles.tarefaMeta}>
            {tarefa.status === 'concluido' ? (
              <Text style={[styles.statusConcluida, { color: theme.colors.success }]}>✅ Concluída</Text>
            ) : tarefa.status === 'em_andamento' ? (
              <Text style={[styles.statusAndamento, { color: theme.colors.info }]}>🔄 Em Andamento</Text>
            ) : tarefa.status === 'atrasada' ? (
              <Text style={[styles.statusAtrasada, { color: theme.colors.error }]}>⚠️ Atrasada</Text>
            ) : (
              <Text style={[styles.statusPendente, { color: theme.colors.warning }]}>⏳ A Fazer</Text>
            )}
          </View>
        </View>
        <View style={[styles.tarefaAction, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.actionIcon}>👁️</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Carregando calendário...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabeçalho do Calendário */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border 
      }]}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.background }]}
          onPress={() => navegarMes(-1)}>
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>‹</Text>
        </TouchableOpacity>
        
        <Text style={[styles.mesAno, { color: theme.colors.text }]}>
          {meses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
        </Text>
        
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.background }]}
          onPress={() => navegarMes(1)}>
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Dias da Semana */}
      <View style={[styles.diasSemanaContainer, { 
        backgroundColor: theme.colors.surface 
      }]}>
        {diasSemana.map((dia, index) => (
          <Text key={index} style={[styles.diaSemana, { color: theme.colors.textSecondary }]}>
            {dia}
          </Text>
        ))}
      </View>

      {/* Grade do Calendário */}
      <View style={[styles.calendarioGrid, { backgroundColor: theme.colors.surface }]}>
        {diasCalendario.map((dia, index) => renderDia(dia, index))}
      </View>

      {/* Lista de Tarefas do Dia Selecionado */}
      {dataSelecionada && (
        <View style={[styles.tarefasContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.tarefasTitle, { color: theme.colors.text }]}>
            📅 Tarefas de {formatarData(dataSelecionada)}
          </Text>
          
          <ScrollView style={styles.tarefasList} showsVerticalScrollIndicator={false}>
            {tarefasSelecionadas.length > 0 ? (
              tarefasSelecionadas.map(renderTarefa)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Nenhuma tarefa para este dia
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  mesAno: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  diaContainer: {
    width: '14.28%', // 100% / 7 dias
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 8,
    margin: 1,
  },
  diaOutroMes: {
    opacity: 0.3,
  },
  diaTexto: {
    fontSize: 16,
    fontWeight: '500',
  },
  indicadorTarefas: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numeroTarefas: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  tarefasContainer: {
    flex: 1,
    padding: 16,
  },
  tarefasTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tarefasList: {
    flex: 1,
  },
  tarefaItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tarefaDescricao: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  tarefaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusConcluida: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusAndamento: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusAtrasada: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusPendente: {
    fontSize: 12,
    fontWeight: '500',
  },
  tarefaAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  actionIcon: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default CardCalendario;