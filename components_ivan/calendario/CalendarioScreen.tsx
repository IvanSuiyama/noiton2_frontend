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
import {
  apiCall,
  getActiveWorkspaceId,
} from '../../services/authService';
import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';
import NotificationService from '../../services/notificationService';

interface CalendarioScreenProps {
  navigation: StackNavigationProp<RootStackParamList>;
}

interface DiaCalendario {
  data: Date;
  dia: number;
  ehMesAtual: boolean;
  ehHoje: boolean;
  tarefas: TarefaMultiplaInterface[];
}

const CalendarioScreen: React.FC<CalendarioScreenProps> = ({ navigation }) => {
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
  }, []);

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

      const response = await apiCall(`/tarefas/listar/${workspaceId}`, 'GET');
      const tarefas = response.data || [];
      
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
          !dia.ehMesAtual && styles.diaOutroMes,
          dia.ehHoje && styles.diaHoje,
          isSelected && styles.diaSelecionado,
        ]}
        onPress={() => selecionarDia(dia)}
        disabled={!dia.ehMesAtual}>
        
        <Text style={[
          styles.diaTexto,
          !dia.ehMesAtual && styles.diaTextoOutroMes,
          dia.ehHoje && styles.diaTextoHoje,
          isSelected && styles.diaTextoSelecionado,
        ]}>
          {dia.dia}
        </Text>
        
        {dia.tarefas.length > 0 && (
          <View style={styles.indicadorTarefas}>
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
      style={styles.tarefaItem}
      onPress={() => handleVerTarefa(tarefa)}>
      <View style={styles.tarefaContent}>
        <View style={styles.tarefaInfo}>
          <Text style={styles.tarefaTitulo} numberOfLines={1}>
            {tarefa.titulo}
          </Text>
          {tarefa.descricao && (
            <Text style={styles.tarefaDescricao} numberOfLines={2}>
              {tarefa.descricao}
            </Text>
          )}
          <View style={styles.tarefaMeta}>
            {tarefa.status === 'concluido' ? (
              <Text style={styles.statusConcluida}>✅ Concluída</Text>
            ) : tarefa.status === 'em_andamento' ? (
              <Text style={styles.statusAndamento}>🔄 Em Andamento</Text>
            ) : tarefa.status === 'atrasada' ? (
              <Text style={styles.statusAtrasada}>⚠️ Atrasada</Text>
            ) : (
              <Text style={styles.statusPendente}>⏳ A Fazer</Text>
            )}
          </View>
        </View>
        <View style={styles.tarefaAction}>
          <Text style={styles.actionIcon}>👁️</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Carregando calendário...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabeçalho do Calendário */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navegarMes(-1)}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <Text style={styles.mesAno}>
          {meses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
        </Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navegarMes(1)}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Dias da Semana */}
      <View style={styles.diasSemanaContainer}>
        {diasSemana.map((dia, index) => (
          <Text key={index} style={styles.diaSemana}>
            {dia}
          </Text>
        ))}
      </View>

      {/* Grade do Calendário */}
      <View style={styles.calendarioGrid}>
        {diasCalendario.map((dia, index) => renderDia(dia, index))}
      </View>

      {/* Lista de Tarefas do Dia Selecionado */}
      {dataSelecionada && (
        <View style={styles.tarefasContainer}>
          <Text style={styles.tarefasTitle}>
            📅 Tarefas de {formatarData(dataSelecionada)}
          </Text>
          
          <ScrollView style={styles.tarefasList} showsVerticalScrollIndicator={false}>
            {tarefasSelecionadas.length > 0 ? (
              tarefasSelecionadas.map(renderTarefa)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
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
    backgroundColor: '#f8f9fa',
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
    color: '#6c757d',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  mesAno: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  calendarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
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
  diaHoje: {
    backgroundColor: '#007bff',
  },
  diaSelecionado: {
    backgroundColor: '#28a745',
  },
  diaTexto: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  diaTextoOutroMes: {
    color: '#6c757d',
  },
  diaTextoHoje: {
    color: '#fff',
    fontWeight: 'bold',
  },
  diaTextoSelecionado: {
    color: '#fff',
    fontWeight: 'bold',
  },
  indicadorTarefas: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#dc3545',
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
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  tarefasTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tarefasList: {
    flex: 1,
  },
  tarefaItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    color: '#333',
    marginBottom: 4,
  },
  tarefaDescricao: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  tarefaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusConcluida: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  statusAndamento: {
    fontSize: 12,
    color: '#17a2b8',
    fontWeight: '500',
  },
  statusAtrasada: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  statusPendente: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '500',
  },
  tarefaAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    backgroundColor: '#f8f9fa',
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
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default CalendarioScreen;