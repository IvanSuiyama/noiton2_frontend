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
  const [calendarioColapsado, setCalendarioColapsado] = useState(false);

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

  // Função para verificar se uma tarefa está ativa em uma data específica
  const tarefaEstaAtivaNaData = (tarefa: TarefaMultiplaInterface, data: Date): boolean => {
    try {
      const dataCriacao = new Date(tarefa.data_criacao);
      
      // Normalizar datas para comparação (remover horas)
      const dataCheck = new Date(data.getFullYear(), data.getMonth(), data.getDate());
      const dataInicioNorm = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth(), dataCriacao.getDate());
      
      // Se não é recorrente, aparece apenas na data de criação
      if (!tarefa.recorrente || !tarefa.recorrencia) {
        return dataCheck.getTime() === dataInicioNorm.getTime();
      }
      
      // Para tarefas recorrentes, verificar se a data é posterior à criação
      if (dataCheck < dataInicioNorm) {
        return false;
      }
      
      // Calcular diferença em dias
      const diffDias = Math.floor((dataCheck.getTime() - dataInicioNorm.getTime()) / (1000 * 60 * 60 * 24));
      
      // Lógica de recorrência
      switch (tarefa.recorrencia) {
        case 'diaria':
          // Tarefa diária aparece todos os dias a partir da criação
          return true;
        case 'semanal':
          // Tarefa semanal aparece a cada 7 dias a partir da criação
          return diffDias % 7 === 0;
        case 'mensal':
          // Tarefa mensal aparece no mesmo dia do mês a partir da criação
          return dataCheck.getDate() === dataInicioNorm.getDate();
        default:
          // Fallback: aparece apenas na data de criação
          return diffDias === 0;
      }
      
    } catch (error) {
      console.error('Erro ao verificar se tarefa está ativa na data:', error);
      return false;
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
        return tarefaEstaAtivaNaData(tarefa, data);
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
    setCalendarioColapsado(false); // Expandir calendário ao navegar
  };

  const selecionarDia = (dia: DiaCalendario) => {
    setDataSelecionada(dia.data);
    setTarefasSelecionadas(dia.tarefas);
    setCalendarioColapsado(true); // Colapsar calendário após seleção
  };

  const toggleCalendario = () => {
    setCalendarioColapsado(!calendarioColapsado);
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

  const renderDia = (dia: DiaCalendario) => {
    const isSelected = dataSelecionada && 
      dia.data.getTime() === dataSelecionada.getTime();

    // Criar chave única baseada na data
    const chaveUnica = `${dia.data.getFullYear()}-${dia.data.getMonth()}-${dia.data.getDate()}`;

    return (
      <TouchableOpacity
        key={chaveUnica}
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
      
      {/* Selectbox colapsado ou cabeçalho expandido */}
      {calendarioColapsado && dataSelecionada ? (
        <TouchableOpacity 
          style={[styles.selectBox, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border 
          }]}
          onPress={toggleCalendario}>
          <Text style={[styles.selectText, { color: theme.colors.text }]}>
            📅 {formatarData(dataSelecionada)} ({tarefasSelecionadas.length} {tarefasSelecionadas.length === 1 ? 'tarefa' : 'tarefas'})
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* Cabeçalho do Calendário Expandido */}
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
        </>
      )}

      {/* Calendário expandido - só mostra se não estiver colapsado */}
      {!calendarioColapsado && (
        <>
          {/* Dias da Semana */}
          <View style={[styles.diasSemanaContainer, { 
            backgroundColor: theme.colors.surface 
          }]}>
            {diasSemana.map((dia) => (
              <Text key={dia} style={[styles.diaSemana, { color: theme.colors.textSecondary }]}>
                {dia}
              </Text>
            ))}
          </View>

          {/* Grade do Calendário */}
          <View style={[styles.calendarioGrid, { backgroundColor: theme.colors.surface }]}>
            {diasCalendario.map((dia) => renderDia(dia))}
          </View>
        </>
      )}

      {/* Lista de Tarefas do Dia Selecionado - com destaque quando colapsado */}
      {dataSelecionada && (
        <View style={[
          styles.tarefasContainer, 
          { backgroundColor: theme.colors.background },
          calendarioColapsado && styles.tarefasDestaque
        ]}>
          {!calendarioColapsado && (
            <Text style={[styles.tarefasTitle, { color: theme.colors.text }]}>
              📅 Tarefas de {formatarData(dataSelecionada)}
            </Text>
          )}
          
          <ScrollView 
            style={[
              styles.tarefasList,
              calendarioColapsado && styles.tarefasListDestaque
            ]} 
            showsVerticalScrollIndicator={true}>
            {tarefasSelecionadas.length > 0 ? (
              tarefasSelecionadas.map((tarefa) => (
                <TouchableOpacity
                  key={`tarefa-${tarefa.id_tarefa || tarefa.titulo}`}
                  style={[
                    styles.tarefaItem, 
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border 
                    },
                    calendarioColapsado && styles.tarefaItemDestaque
                  ]}
                  onPress={() => handleVerTarefa(tarefa)}>
                  <View style={styles.tarefaContent}>
                    <View style={styles.tarefaInfo}>
                      <Text style={[
                        styles.tarefaTitulo, 
                        { color: theme.colors.text },
                        calendarioColapsado && styles.tarefaTituloDestaque
                      ]} numberOfLines={calendarioColapsado ? 2 : 1}>
                        {tarefa.titulo}
                      </Text>
                      {tarefa.descricao && (
                        <Text style={[
                          styles.tarefaDescricao, 
                          { color: theme.colors.textSecondary }
                        ]} numberOfLines={calendarioColapsado ? 3 : 2}>
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
                        
                        {/* Mostrar categorias quando destacado */}
                        {calendarioColapsado && tarefa.categorias && tarefa.categorias.length > 0 && (
                          <View style={styles.categoriasContainer}>
                            {tarefa.categorias.slice(0, 2).map((categoria) => (
                              <View 
                                key={`categoria-${categoria.id_categoria || categoria.nome}`}
                                style={[styles.categoriaChip, { backgroundColor: categoria.cor || theme.colors.primary }]}>
                                <Text style={styles.categoriaText}>{categoria.nome}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={[styles.tarefaAction, { backgroundColor: theme.colors.background }]}>
                      <Text style={styles.actionIcon}>👁️</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
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
  // Novos estilos para selectbox
  selectBox: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  tarefasDestaque: {
    flex: 1,
    paddingTop: 8,
  },
  tarefasListDestaque: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tarefaItemDestaque: {
    marginHorizontal: 8,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tarefaTituloDestaque: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoriasContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  categoriaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  categoriaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CardCalendario;