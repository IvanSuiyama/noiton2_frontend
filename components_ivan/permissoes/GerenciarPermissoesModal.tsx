import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { apiCall, getUserEmail } from '../../services/authService';

interface Usuario {
  id_usuario: number;
  email: string;
  nome: string;
  nivel_acesso?: 0 | 1 | 2;
}

interface PermissaoCompleta {
  id_tarefa: number;
  permissoes_atuais: Usuario[];
  usuarios_disponiveis: Usuario[];
  pode_gerenciar: boolean;
}

interface GerenciarPermissoesModalProps {
  visible: boolean;
  onClose: () => void;
  idTarefa: number;
  idWorkspace: number;
  tituloTarefa: string;
  onPermissaoAlterada?: () => void;
}

const nivelLabels = {
  0: 'Criador',
  1: 'Editor',
  2: 'Visualizador'
};

const nivelDescricoes = {
  0: 'Pode ver, editar e apagar',
  1: 'Pode ver e editar',
  2: 'Pode apenas ver'
};

const GerenciarPermissoesModal: React.FC<GerenciarPermissoesModalProps> = ({
  visible,
  onClose,
  idTarefa,
  idWorkspace,
  tituloTarefa,
  onPermissaoAlterada
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [permissoes, setPermissoes] = useState<PermissaoCompleta | null>(null);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [nivelSelecionado, setNivelSelecionado] = useState<1 | 2>(2);
  const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);
  const [showNivelSelector, setShowNivelSelector] = useState(false);

  useEffect(() => {
    if (visible) {
      carregarPermissoes();
    }
  }, [visible, idTarefa]);

  const carregarPermissoes = async () => {
    try {
      setLoading(true);

      // Obter email do usuário logado (criador da tarefa)
      const emailCriador = await getUserEmail();

      // Obter informações do workspace para pegar a lista de usuários
      const workspaceInfo = await apiCall(`/workspaces/id/${idWorkspace}`, 'GET');
      
      // Filtrar emails para remover o criador da tarefa e converter para formato esperado
      const emailsFiltrados = (workspaceInfo.emails || []).filter((email: string) => 
        email !== emailCriador
      );

      const usuariosWorkspace = emailsFiltrados.map((email: string) => ({
        email: email,
        nome: email.split('@')[0] // usar parte antes do @ como nome temporário
      }));

      const permissoesData: PermissaoCompleta = {
        id_tarefa: idTarefa,
        permissoes_atuais: [],
        usuarios_disponiveis: usuariosWorkspace,
        pode_gerenciar: true
      };

      setPermissoes(permissoesData);
    } catch (error) {
      console.error('Erro ao carregar usuários do workspace:', error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários do workspace');
    } finally {
      setLoading(false);
    }
  };

  const adicionarPermissao = async () => {
    if (!usuarioSelecionado) {
      Alert.alert('Atenção', 'Selecione um usuário');
      return;
    }

    Alert.alert('Sucesso', 'Permissão adicionada!');
    setUsuarioSelecionado(null);
    setNivelSelecionado(2);
    onPermissaoAlterada?.();
  };

  const alterarPermissao = async (usuario: Usuario, novoNivel: 0 | 1 | 2) => {
    if (novoNivel === 0) {
      Alert.alert('Atenção', 'Não é possível alterar para nível Criador');
      return;
    }

    Alert.alert('Sucesso', 'Permissão alterada!');
    onPermissaoAlterada?.();
  };

  const removerPermissao = async (usuario: Usuario) => {
    if (usuario.nivel_acesso === 0) {
      Alert.alert('Atenção', 'Não é possível remover o criador da tarefa');
      return;
    }

    Alert.alert(
      'Confirmar',
      `Deseja remover ${usuario.nome} da tarefa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Sucesso', 'Permissão removida!');
            onPermissaoAlterada?.();
          }
        }
      ]
    );
  };

  const renderUsuarioPermissao = ({ item }: { item: Usuario }) => (
    <View style={[styles.usuarioItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.usuarioInfo}>
        <Text style={[styles.usuarioNome, { color: theme.colors.text }]}>{item.nome}</Text>
        <Text style={[styles.usuarioEmail, { color: theme.colors.textSecondary }]}>{item.email}</Text>
        <Text style={[styles.usuarioNivel, { color: theme.colors.primary }]}>
          {nivelLabels[item.nivel_acesso!]} - {nivelDescricoes[item.nivel_acesso!]}
        </Text>
      </View>

      <View style={styles.usuarioAcoes}>
        {item.nivel_acesso !== 0 ? (
          <>
            <TouchableOpacity
              style={styles.botaoAlterar}
              onPress={() => {
                const novoNivel = item.nivel_acesso === 1 ? 2 : 1;
                alterarPermissao(item, novoNivel);
              }}>
              <Text style={styles.textoBotao}>
                {item.nivel_acesso === 1 ? 'Para Visualizador' : 'Para Editor'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoRemover}
              onPress={() => removerPermissao(item)}>
              <Text style={styles.textoBotao}>Remover</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.criadorLabel}>Criador</Text>
        )}
      </View>
    </View>
  );

  if (loading && !permissoes) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Carregando...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      {}
      <Modal visible={showUsuarioSelector} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.selectorModal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.selectorModalTitle, { color: theme.colors.text }]}>Selecionar Usuário</Text>
            <ScrollView style={styles.selectorList}>
              {permissoes?.usuarios_disponiveis.map((usuario) => (
                <TouchableOpacity
                  key={usuario.id_usuario}
                  style={[
                    styles.selectorItem,
                    { backgroundColor: theme.colors.surface },
                    usuarioSelecionado?.id_usuario === usuario.id_usuario && styles.selectorItemSelected
                  ]}
                  onPress={() => {
                    setUsuarioSelecionado(usuario);
                    setShowUsuarioSelector(false);
                  }}>
                  <Text style={[styles.selectorItemText, { color: theme.colors.text }]}>{usuario.nome}</Text>
                  <Text style={[styles.selectorItemEmail, { color: theme.colors.textSecondary }]}>{usuario.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.selectorCancelButton}
              onPress={() => setShowUsuarioSelector(false)}>
              <Text style={styles.selectorCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showNivelSelector} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.selectorModal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.selectorModalTitle, { color: theme.colors.text }]}>Selecionar Nível</Text>
            <View style={styles.selectorList}>
              <TouchableOpacity
                style={[
                  styles.selectorItem,
                  { backgroundColor: theme.colors.surface },
                  nivelSelecionado === 1 && styles.selectorItemSelected
                ]}
                onPress={() => {
                  setNivelSelecionado(1);
                  setShowNivelSelector(false);
                }}>
                <Text style={[styles.selectorItemText, { color: theme.colors.text }]}>Editor</Text>
                <Text style={[styles.selectorItemEmail, { color: theme.colors.textSecondary }]}>Pode ver e editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorItem,
                  { backgroundColor: theme.colors.surface },
                  nivelSelecionado === 2 && styles.selectorItemSelected
                ]}
                onPress={() => {
                  setNivelSelecionado(2);
                  setShowNivelSelector(false);
                }}>
                <Text style={[styles.selectorItemText, { color: theme.colors.text }]}>Visualizador</Text>
                <Text style={[styles.selectorItemEmail, { color: theme.colors.textSecondary }]}>Pode apenas ver</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.selectorCancelButton}
              onPress={() => setShowNivelSelector(false)}>
              <Text style={styles.selectorCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.titulo, { color: theme.colors.text }]}>Gerenciar Permissões</Text>
              <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{tituloTarefa}</Text>
            </View>

            {}
            {permissoes?.usuarios_disponiveis && permissoes.usuarios_disponiveis.length > 0 && (
              <View style={styles.secao}>
                <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>Adicionar Usuário</Text>

                <View style={[styles.adicionarContainer, { backgroundColor: theme.colors.background }]}>
                  <View style={styles.selectorContainer}>
                    <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>Usuário:</Text>
                    <TouchableOpacity
                      style={[styles.selectorButton, { 
                        backgroundColor: theme.colors.surface, 
                        borderColor: theme.colors.border 
                      }]}
                      onPress={() => setShowUsuarioSelector(true)}>
                      <Text style={[styles.selectorText, { color: theme.colors.text }]}>
                        {usuarioSelecionado
                          ? `${usuarioSelecionado.nome} (${usuarioSelecionado.email})`
                          : 'Selecione um usuário...'
                        }
                      </Text>
                      <Text style={[styles.selectorArrow, { color: theme.colors.textSecondary }]}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.selectorContainer}>
                    <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>Nível de Acesso:</Text>
                    <TouchableOpacity
                      style={[styles.selectorButton, { 
                        backgroundColor: theme.colors.surface, 
                        borderColor: theme.colors.border 
                      }]}
                      onPress={() => setShowNivelSelector(true)}>
                      <Text style={[styles.selectorText, { color: theme.colors.text }]}>
                        {nivelSelecionado === 1
                          ? 'Editor - Pode ver e editar'
                          : 'Visualizador - Pode apenas ver'
                        }
                      </Text>
                      <Text style={[styles.selectorArrow, { color: theme.colors.textSecondary }]}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.botaoAdicionar, 
                      { backgroundColor: usuarioSelecionado ? theme.colors.primary : theme.colors.secondary }
                    ]}
                    onPress={adicionarPermissao}
                    disabled={!usuarioSelecionado}>
                    <Text style={[styles.textoBotaoAdicionar, { color: '#fff' }]}>Adicionar Permissão</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {}
            <View style={styles.botoesAcao}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={onClose}>
                <Text style={styles.textoBotaoCancelar}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    textAlign: 'center',
  },
  secao: {
    marginBottom: 20,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  lista: {
    maxHeight: 200,
  },
  usuarioItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usuarioInfo: {
    flex: 1,
    marginRight: 12,
  },
  usuarioNome: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  usuarioEmail: {
    fontSize: 12,
    marginBottom: 4,
  },
  usuarioNivel: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  usuarioAcoes: {
    flexDirection: 'column',
    gap: 4,
  },
  botaoAlterar: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  botaoRemover: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  criadorLabel: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '600',
    textAlign: 'center',
  },
  adicionarContainer: {
    borderRadius: 8,
    padding: 12,
  },
  selectorContainer: {
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  selectorButton: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 14,
    flex: 1,
  },
  selectorArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  botaoAdicionar: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    backgroundColor: '#ccc',
  },
  textoBotaoAdicionar: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  botoesAcao: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  botaoCancelar: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  textoBotaoCancelar: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },

  selectorModal: {
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectorList: {
    maxHeight: 300,
  },
  selectorItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectorItemSelected: {
    borderColor: '#007bff',
  },
  selectorItemText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorItemEmail: {
    fontSize: 12,
  },
  selectorCancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  selectorCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GerenciarPermissoesModal;
