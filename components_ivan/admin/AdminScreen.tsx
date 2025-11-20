import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import * as adminServices from '../../services/adminServices';
// import Icon from 'react-native-vector-icons/MaterialIcons'; // Removido para usar emojis

type AdminScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Admin'>;

type Props = {
  navigation: AdminScreenNavigationProp;
};

interface Denuncia {
  id_denuncia: number;
  id_tarefa: number;
  id_usuario_denunciante: number;
  motivo: string;
  status: 'pendente' | 'analisada' | 'rejeitada' | 'aprovada';
  data_criacao: string;
  data_analise?: string;
  id_moderador?: number;
  observacoes_moderador?: string;
  titulo_tarefa: string;
  nome_denunciante: string;
  nome_moderador?: string;
  id_usuario_criador?: number;
  nome_criador_tarefa?: string;
}

interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  telefone?: string;
  data_criacao?: string;
}

interface Tarefa {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  status: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  data_criacao: string;
  data_fim?: string;
  id_usuario: number;
  nome_usuario?: string;
  id_workspace: number;
  nome_workspace?: string;
}

const AdminScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Estados dos modais
  const [modalDenuncias, setModalDenuncias] = useState<boolean>(false);
  const [modalUsuarios, setModalUsuarios] = useState<boolean>(false);
  const [modalTarefas, setModalTarefas] = useState<boolean>(false);
  
  // Estados para detalhes
  const [usuarioDetalhes, setUsuarioDetalhes] = useState<Usuario | null>(null);
  const [tarefaDetalhes, setTarefaDetalhes] = useState<Tarefa | null>(null);
  const [denunciaDetalhes, setDenunciaDetalhes] = useState<Denuncia | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState<'usuario' | 'tarefa' | 'denuncia' | null>(null);

  useEffect(() => {
    carregarDenuncias();
  }, []);

  const carregarDenuncias = async () => {
    setLoading(true);
    try {
      const data = await adminServices.listarDenuncias();
      setDenuncias(data || []);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as denúncias');
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await adminServices.listarTodosUsuarios();
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
    }
  };

  const carregarTarefas = async () => {
    setLoading(true);
    try {
      const data = await adminServices.listarTodasTarefas();
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas');
    } finally {
      setLoading(false);
    }
  };

  const aprovarDenuncia = async (denuncia: Denuncia) => {
    Alert.alert(
      'Aprovar Denúncia',
      `Tem certeza que deseja aprovar esta denúncia? A tarefa "${denuncia.titulo_tarefa}" será apagada e o criador será notificado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Aprovar denúncia
              await adminServices.atualizarStatusDenuncia(
                denuncia.id_denuncia,
                'aprovada',
                'Denúncia aprovada pelo administrador - tarefa removida'
              );
              
              // 2. Notificar criador da tarefa sobre a exclusão
              try {
                await adminServices.notificarCriadorTarefaExcluida(
                  denuncia.id_tarefa,
                  denuncia.titulo_tarefa
                );
              } catch (notifyError) {
                console.log('Aviso: Não foi possível enviar notificação ao criador:', notifyError);
              }
              
              // 3. Deletar tarefa
              await adminServices.deletarTarefa(denuncia.id_tarefa);
              
              Alert.alert(
                'Denúncia Aprovada',
                `A tarefa "${denuncia.titulo_tarefa}" foi removida. O criador da tarefa foi notificado sobre a violação dos termos.`,
                [{ text: 'OK', onPress: () => carregarDenuncias() }]
              );
            } catch (error) {
              console.error('Erro ao aprovar denúncia:', error);
              Alert.alert('Erro', 'Não foi possível aprovar a denúncia');
            }
          }
        }
      ]
    );
  };

  const rejeitarDenuncia = async (denuncia: Denuncia) => {
    Alert.alert(
      'Rejeitar Denúncia',
      'Tem certeza que deseja rejeitar esta denúncia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          onPress: async () => {
            try {
              await adminServices.atualizarStatusDenuncia(
                denuncia.id_denuncia,
                'rejeitada',
                'Denúncia rejeitada pelo administrador'
              );
              
              Alert.alert('Denúncia Rejeitada', 'A denúncia foi rejeitada silenciosamente.');
              carregarDenuncias();
            } catch (error) {
              console.error('Erro ao rejeitar denúncia:', error);
              Alert.alert('Erro', 'Não foi possível rejeitar a denúncia');
            }
          }
        }
      ]
    );
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const verDetalhesUsuario = async (usuario: Usuario) => {
    try {
      const detalhes = await adminServices.buscarUsuarioPorId(usuario.id_usuario);
      setUsuarioDetalhes(detalhes);
      setModalDetalhes('usuario');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar detalhes do usuário');
    }
  };

  const verDetalhesTarefa = async (tarefa: Tarefa) => {
    try {
      const detalhes = await adminServices.buscarTarefaPorId(tarefa.id_tarefa);
      setTarefaDetalhes(detalhes);
      setModalDetalhes('tarefa');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar detalhes da tarefa');
    }
  };

  const verDetalhesDenuncia = (denuncia: Denuncia) => {
    setDenunciaDetalhes(denuncia);
    setModalDetalhes('denuncia');
  };

  const abrirModalDenuncias = () => {
    setModalDenuncias(true);
    carregarDenuncias();
  };

  const abrirModalUsuarios = () => {
    setModalUsuarios(true);
    carregarUsuarios();
  };

  const abrirModalTarefas = () => {
    setModalTarefas(true);
    carregarTarefas();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ADM</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.content}>
        <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
          Bem-vindo, Ivan
        </Text>

        {/* Botões dos Modais */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
            onPress={abrirModalDenuncias}
          >
            <Text style={styles.modalButtonIcon}>🚨</Text>
            <Text style={styles.modalButtonText}>Denúncias</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            onPress={abrirModalTarefas}
          >
            <Text style={styles.modalButtonIcon}>📋</Text>
            <Text style={styles.modalButtonText}>Tarefas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.success || '#28a745' }]}
            onPress={abrirModalUsuarios}
          >
            <Text style={styles.modalButtonIcon}>👥</Text>
            <Text style={styles.modalButtonText}>Usuários</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Denúncias */}
      <Modal visible={modalDenuncias} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.error }]}>
            <TouchableOpacity onPress={() => setModalDenuncias(false)}>
              <Text style={{ color: '#fff', fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Denúncias</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <FlatList
            data={denuncias}
            keyExtractor={(item) => item.id_denuncia.toString()}
            renderItem={({ item }) => (
              <View style={[styles.listItem, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                    {item.titulo_tarefa}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.colors.textSecondary }]}>
                    {item.motivo}
                  </Text>
                  <Text style={[styles.itemDate, { color: theme.colors.textSecondary }]}>
                    {formatarData(item.data_criacao)}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  {item.status === 'pendente' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                        onPress={() => rejeitarDenuncia(item)}
                      >
                        <Text style={styles.actionButtonText}>❌</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => aprovarDenuncia(item)}
                      >
                        <Text style={styles.actionButtonText}>✅</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
                    onPress={() => verDetalhesDenuncia(item)}
                  >
                    <Text style={styles.actionButtonText}>👁️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Nenhuma denúncia encontrada
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Modal Usuários */}
      <Modal visible={modalUsuarios} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.success || '#28a745' }]}>
            <TouchableOpacity onPress={() => setModalUsuarios(false)}>
              <Text style={{ color: '#fff', fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Usuários</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <FlatList
            data={usuarios}
            keyExtractor={(item) => item.id_usuario.toString()}
            renderItem={({ item }) => (
              <View style={[styles.listItem, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                    {item.nome}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.colors.textSecondary }]}>
                    {item.email}
                  </Text>
                  {item.telefone && (
                    <Text style={[styles.itemDate, { color: theme.colors.textSecondary }]}>
                      {item.telefone}
                    </Text>
                  )}
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
                    onPress={() => verDetalhesUsuario(item)}
                  >
                    <Text style={styles.actionButtonText}>👁️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Nenhum usuário encontrado
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Modal Tarefas */}
      <Modal visible={modalTarefas} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.primary }]}>
            <TouchableOpacity onPress={() => setModalTarefas(false)}>
              <Text style={{ color: '#fff', fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Tarefas</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <FlatList
            data={tarefas}
            keyExtractor={(item) => item.id_tarefa.toString()}
            renderItem={({ item }) => (
              <View style={[styles.listItem, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                    {item.titulo}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.colors.textSecondary }]}>
                    {item.descricao || 'Sem descrição'}
                  </Text>
                  <Text style={[styles.itemDate, { color: theme.colors.textSecondary }]}>
                    Status: {item.status} | Prioridade: {item.prioridade}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
                    onPress={() => verDetalhesTarefa(item)}
                  >
                    <Text style={styles.actionButtonText}>👁️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Nenhuma tarefa encontrada
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal visible={modalDetalhes !== null} animationType="fade" transparent>
        <View style={styles.detailsOverlay}>
          <View style={[styles.detailsModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
                {modalDetalhes === 'usuario' ? 'Detalhes do Usuário' :
                 modalDetalhes === 'tarefa' ? 'Detalhes da Tarefa' : 'Detalhes da Denúncia'}
              </Text>
              <TouchableOpacity onPress={() => setModalDetalhes(null)}>
                <Text style={[styles.closeButton, { color: theme.colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailsContent}>
              {modalDetalhes === 'usuario' && usuarioDetalhes && (
                <View>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Nome:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{usuarioDetalhes.nome}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Email:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{usuarioDetalhes.email}</Text>
                  
                  {usuarioDetalhes.telefone && (
                    <>
                      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Telefone:</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text }]}>{usuarioDetalhes.telefone}</Text>
                    </>
                  )}
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>ID:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{usuarioDetalhes.id_usuario}</Text>
                </View>
              )}
              
              {modalDetalhes === 'tarefa' && tarefaDetalhes && (
                <View>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Título:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{tarefaDetalhes.titulo}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Descrição:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{tarefaDetalhes.descricao || 'Sem descrição'}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Status:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{tarefaDetalhes.status}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Prioridade:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{tarefaDetalhes.prioridade}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Criado em:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{formatarData(tarefaDetalhes.data_criacao)}</Text>
                </View>
              )}
              
              {modalDetalhes === 'denuncia' && denunciaDetalhes && (
                <View>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Tarefa:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{denunciaDetalhes.titulo_tarefa}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Motivo:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{denunciaDetalhes.motivo}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Denunciante:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{denunciaDetalhes.nome_denunciante}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Status:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{denunciaDetalhes.status}</Text>
                  
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Criado em:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{formatarData(denunciaDetalhes.data_criacao)}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalButtonIcon: {
    fontSize: 24,
    marginRight: 12,
    color: '#fff',
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  listItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailsContent: {
    padding: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    marginBottom: 8,
  },
});

export default AdminScreen;