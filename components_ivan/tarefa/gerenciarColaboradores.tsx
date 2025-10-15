import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  listarPermissoesTarefa,
  adicionarPermissaoTarefa,
  removerPermissaoTarefa,
  apiCall,
} from '../../services/authService';
import {
  PermissaoTarefaInterface,
  AdicionarPermissaoInterface,
} from './tarefaMultiplaInterface';

interface GerenciarColaboradoresProps {
  visible: boolean;
  onClose: () => void;
  tarefaId: number;
  tarefaTitulo: string;
  workspaceEquipe: boolean; // Indica se o workspace é de equipe
}

interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
}

const NIVEL_ACESSO_LABELS = {
  0: 'Criador',
  1: 'Editor',
  2: 'Visualizador',
};

const NIVEL_ACESSO_ICONS = {
  0: '👑',
  1: '✏️',
  2: '👁️',
};

const NIVEL_ACESSO_CORES = {
  0: '#ffc107', // Amarelo para criador
  1: '#28a745', // Verde para editor
  2: '#6c757d', // Cinza para visualizador
};

const GerenciarColaboradores: React.FC<GerenciarColaboradoresProps> = ({
  visible,
  onClose,
  tarefaId,
  tarefaTitulo,
  workspaceEquipe,
}) => {
  const [permissoes, setPermissoes] = useState<PermissaoTarefaInterface[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedNivel, setSelectedNivel] = useState<number>(2); // Padrão: Visualizador
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    if (visible) {
      carregarDados();
    }
  }, [visible, tarefaId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([
        carregarPermissoes(),
        carregarUsuarios(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarPermissoes = async () => {
    // Se não é workspace de equipe, não carregar permissões
    if (!workspaceEquipe) {
      setPermissoes([]);
      return;
    }
    
    try {
      const response = await listarPermissoesTarefa(tarefaId);
      setPermissoes(response);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      throw error;
    }
  };

  const carregarUsuarios = async () => {
    try {
      // Buscar todos os usuários para poder adicionar colaboradores
      const response = await apiCall('/usuarios', 'GET');
      setUsuarios(response);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      throw error;
    }
  };

  const buscarUsuarioPorEmail = (email: string): Usuario | null => {
    return usuarios.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  };

  const handleAdicionarColaborador = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    const usuario = buscarUsuarioPorEmail(searchEmail.trim());
    if (!usuario) {
      Alert.alert('Erro', 'Usuário não encontrado');
      return;
    }

    // Verificar se já tem permissão
    const jaTemPermissao = permissoes.some(p => p.id_usuario === usuario.id_usuario);
    if (jaTemPermissao) {
      Alert.alert('Aviso', 'Este usuário já tem acesso à tarefa');
      return;
    }

    try {
      setLoading(true);
      await adicionarPermissaoTarefa(tarefaId, usuario.id_usuario, selectedNivel);
      await carregarPermissoes();
      setSearchEmail('');
      setShowAddUser(false);
      Alert.alert('Sucesso', 'Colaborador adicionado com sucesso');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível adicionar o colaborador');
    } finally {
      setLoading(false);
    }
  };

  const handleAlterarNivel = async (permissao: PermissaoTarefaInterface, novoNivel: number) => {
    if (permissao.nivel_acesso === 0) {
      Alert.alert('Aviso', 'Não é possível alterar o nível do criador da tarefa');
      return;
    }

    try {
      setLoading(true);
      await adicionarPermissaoTarefa(tarefaId, permissao.id_usuario, novoNivel);
      await carregarPermissoes();
      Alert.alert('Sucesso', 'Nível de acesso alterado com sucesso');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível alterar o nível de acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverColaborador = (permissao: PermissaoTarefaInterface) => {
    if (permissao.nivel_acesso === 0) {
      Alert.alert('Aviso', 'Não é possível remover o criador da tarefa');
      return;
    }

    Alert.alert(
      'Confirmar',
      `Deseja remover ${permissao.email} da tarefa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await removerPermissaoTarefa(tarefaId, permissao.id_usuario);
              await carregarPermissoes();
              Alert.alert('Sucesso', 'Colaborador removido com sucesso');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível remover o colaborador');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderPermissao = ({ item }: { item: PermissaoTarefaInterface }) => {
    return (
      <View style={styles.permissaoItem}>
        <View style={styles.permissaoInfo}>
          <View style={styles.usuarioInfo}>
            <Text style={styles.usuarioNome}>{item.nome}</Text>
            <Text style={styles.usuarioEmail}>{item.email}</Text>
          </View>
          <View style={[
            styles.nivelBadge,
            { backgroundColor: NIVEL_ACESSO_CORES[item.nivel_acesso as keyof typeof NIVEL_ACESSO_CORES] }
          ]}>
            <Text style={styles.nivelIcon}>{NIVEL_ACESSO_ICONS[item.nivel_acesso as keyof typeof NIVEL_ACESSO_ICONS]}</Text>
            <Text style={styles.nivelText}>{NIVEL_ACESSO_LABELS[item.nivel_acesso as keyof typeof NIVEL_ACESSO_LABELS]}</Text>
          </View>
        </View>
        
        {item.nivel_acesso !== 0 && (
          <View style={styles.permissaoActions}>
            {/* Botões para alterar nível */}
            {[1, 2].map(nivel => (
              item.nivel_acesso !== nivel && (
                <TouchableOpacity
                  key={nivel}
                  style={[styles.nivelButton, { backgroundColor: NIVEL_ACESSO_CORES[nivel as keyof typeof NIVEL_ACESSO_CORES] }]}
                  onPress={() => handleAlterarNivel(item, nivel)}
                >
                  <Text style={styles.nivelButtonText}>
                    {NIVEL_ACESSO_ICONS[nivel as keyof typeof NIVEL_ACESSO_ICONS]} {NIVEL_ACESSO_LABELS[nivel as keyof typeof NIVEL_ACESSO_LABELS]}
                  </Text>
                </TouchableOpacity>
              )
            ))}
            
            {/* Botão remover */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoverColaborador(item)}
            >
              <Text style={styles.removeButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Se não é workspace de equipe, mostrar mensagem informativa
  if (!workspaceEquipe) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Colaboradores</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tarefaInfo}>
              <Text style={styles.tarefaTitulo} numberOfLines={1}>
                {tarefaTitulo}
              </Text>
            </View>

            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>👤</Text>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                Workspace Individual
              </Text>
              <Text style={{ color: '#6c757d', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                Este é um workspace individual. Apenas você tem acesso às tarefas.
                Para colaborar com outros usuários, crie um workspace de equipe.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Colaboradores</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tarefaInfo}>
            <Text style={styles.tarefaTitulo} numberOfLines={1}>
              {tarefaTitulo}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6c757d" />
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              {/* Lista de colaboradores */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Colaboradores ({permissoes.length})</Text>
                {permissoes.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum colaborador encontrado</Text>
                ) : (
                  <FlatList
                    data={permissoes}
                    keyExtractor={(item) => item.id_permissao.toString()}
                    renderItem={renderPermissao}
                    scrollEnabled={false}
                  />
                )}
              </View>

              {/* Adicionar colaborador */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddUser(!showAddUser)}
                >
                  <Text style={styles.addButtonText}>
                    {showAddUser ? '− Cancelar' : '+ Adicionar Colaborador'}
                  </Text>
                </TouchableOpacity>

                {showAddUser && (
                  <View style={styles.addUserForm}>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="Email do usuário"
                      placeholderTextColor="#6c757d"
                      value={searchEmail}
                      onChangeText={setSearchEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    
                    <Text style={styles.nivelLabel}>Nível de acesso:</Text>
                    <View style={styles.nivelOptions}>
                      {[1, 2].map(nivel => (
                        <TouchableOpacity
                          key={nivel}
                          style={[
                            styles.nivelOption,
                            selectedNivel === nivel && styles.nivelOptionSelected,
                            { borderColor: NIVEL_ACESSO_CORES[nivel as keyof typeof NIVEL_ACESSO_CORES] }
                          ]}
                          onPress={() => setSelectedNivel(nivel)}
                        >
                          <Text style={[
                            styles.nivelOptionText,
                            selectedNivel === nivel && styles.nivelOptionTextSelected
                          ]}>
                            {NIVEL_ACESSO_ICONS[nivel as keyof typeof NIVEL_ACESSO_ICONS]} {NIVEL_ACESSO_LABELS[nivel as keyof typeof NIVEL_ACESSO_LABELS]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={handleAdicionarColaborador}
                    >
                      <Text style={styles.confirmButtonText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    width: '95%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    fontSize: 18,
    color: '#6c757d',
    padding: 4,
  },
  tarefaInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  tarefaTitulo: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptyText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissaoItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  permissaoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  usuarioEmail: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  nivelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nivelIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  nivelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  permissaoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  nivelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  nivelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  addUserForm: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    marginBottom: 12,
  },
  nivelLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  nivelOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  nivelOption: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  nivelOptionSelected: {
    backgroundColor: 'rgba(108, 117, 125, 0.2)',
  },
  nivelOptionText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  nivelOptionTextSelected: {
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GerenciarColaboradores;