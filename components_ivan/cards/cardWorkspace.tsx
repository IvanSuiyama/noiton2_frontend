import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  getActiveWorkspaceId,
  getUserWorkspaces,
  setActiveWorkspace,
  getUserEmail,
} from '../../services/authService';
import WorkspaceInterface from '../workspace/workspaceInterface';

type CardWorkspaceNavigationProp = StackNavigationProp<RootStackParamList>;

interface CardWorkspaceProps {
  navigation: CardWorkspaceNavigationProp;
  onWorkspaceChange?: (workspace: WorkspaceInterface) => void;
}

const CardWorkspace: React.FC<CardWorkspaceProps> = ({ navigation, onWorkspaceChange }) => {
  const pencilIconStyle = {
    fontSize: 18,
    color: 'rgba(108, 117, 125, 0.9)',
    marginRight: 12,
  };

  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState<WorkspaceInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceInterface | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    initializeWorkspaceData();
  }, []);

  const initializeWorkspaceData = async () => {
    try {
      setLoading(true);
      const [email, workspaces, wsId] = await Promise.all([
        getUserEmail(),
        getUserWorkspaces(),
        getActiveWorkspaceId()
      ]);
      setUserEmail(email || '');
      setUserWorkspaces(workspaces || []);
      setActiveWorkspaceId(wsId);
      if (workspaces && workspaces.length > 0) {
        // Busca workspace ativo pelo id
        const workspaceAtivo = workspaces.find((ws: WorkspaceInterface) => ws.id_workspace === wsId) || workspaces[0];
        setActiveWorkspaceState(workspaceAtivo);
        setWorkspaceName(workspaceAtivo.nome);
        setActiveWorkspaceId(workspaceAtivo.id_workspace);
        // Notificar o HomeScreen sobre o workspace ativo
        if (onWorkspaceChange) {
          onWorkspaceChange(workspaceAtivo);
        }
        // Garantir que o workspace ativo está salvo
        if (!wsId) {
          await setActiveWorkspace(workspaceAtivo.id_workspace || 0, workspaceAtivo.nome);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do workspace:', error);
      Alert.alert('Erro', 'Não foi possível carregar os workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceChange = async (workspace: WorkspaceInterface) => {
    try {
      await setActiveWorkspace(workspace.id_workspace || 0, workspace.nome);
      setWorkspaceName(workspace.nome);
      setActiveWorkspaceState(workspace);
      setActiveWorkspaceId(workspace.id_workspace || null);
      setShowWorkspaceModal(false);
      // Notificar o HomeScreen sobre a mudança
      if (onWorkspaceChange) {
        onWorkspaceChange(workspace);
      }
      Alert.alert('Sucesso', `Workspace alterado para: ${workspace.nome}`);
    } catch (error) {
      console.error('Erro ao mudar workspace:', error);
      Alert.alert('Erro', 'Não foi possível alterar o workspace');
    }
  };

  const handleCreateNewWorkspace = () => {
    setShowWorkspaceModal(false);
    navigation.navigate('CadastroWorkspace');
  };

  const handleEditWorkspace = (wsName: string) => {
    navigation.navigate('EditWorkspace', {
      workspaceName: wsName,
      userEmail,
    });
  };

  const refreshWorkspaces = async () => {
    try {
      const workspaces = await getUserWorkspaces();
      setUserWorkspaces(workspaces || []);
    } catch (error) {
      console.error('Erro ao atualizar workspaces:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.workspaceCard, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#6c757d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Card Pequeno (igual ao CardUser) */}
      <TouchableOpacity
        style={styles.workspaceCard}
        onPress={() => {
          refreshWorkspaces();
          setShowWorkspaceModal(true);
        }}
        disabled={userWorkspaces.length === 0}
      >
        <View style={styles.workspaceIcon}>
          <Text style={styles.workspaceIconText}>
            {workspaceName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal de Seleção de Workspace */}
      <Modal
        visible={showWorkspaceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkspaceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.workspaceModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Workspace</Text>
              <TouchableOpacity 
                onPress={() => setShowWorkspaceModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {userWorkspaces.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Nenhum workspace encontrado</Text>
              </View>
            ) : (
              <FlatList
                data={userWorkspaces}
                keyExtractor={(item) => (item.id_workspace || Math.random()).toString()}
                renderItem={({ item }) => (
                  <View style={styles.workspaceItemRow}>
                    <TouchableOpacity
                      style={styles.workspaceItem}
                      onPress={() => handleWorkspaceChange(item)}
                    >
                      <View style={styles.workspaceItemIcon}>
                        <Text style={styles.workspaceItemIconText}>
                          {item.nome.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.workspaceItemInfo}>
                        <Text style={styles.workspaceItemName}>{item.nome}</Text>
                        <Text style={styles.workspaceItemType}>
                          {item.equipe ? 'Equipe' : 'Pessoal'} • {item.emails?.length || 0} membros
                        </Text>
                      </View>
                      {activeWorkspaceId === item.id_workspace && (
                        <Text style={styles.workspaceSelected}>✓</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButtonModal}
                      onPress={() => handleEditWorkspace(item.nome)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={pencilIconStyle}>✏️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {/* <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleEditWorkspace(workspaceName)}
            >
              <Text style={pencilIconStyle}>✏️</Text>
              <Text style={styles.modalButtonText}>Editar workspace atual</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCreateNewWorkspace}
            >
              <Text style={styles.createWorkspaceIcon}>+</Text>
              <Text style={styles.modalButtonText}>Criar novo workspace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Card Pequeno (igual ao CardUser)
  workspaceCard: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 8,
  },
  workspaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceIconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Removidos os estilos que não são mais usados no card pequeno:
  // workspaceInfo, workspaceNameContainer, workspaceName, workspaceLabel, chevronDown, editButtonCard

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceModal: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
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
  modalClose: {
    fontSize: 18,
    color: '#6c757d',
    padding: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6c757d',
    fontSize: 16,
  },
  workspaceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workspaceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  workspaceItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workspaceItemIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  workspaceItemInfo: {
    flex: 1,
  },
  workspaceItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  workspaceItemType: {
    fontSize: 12,
    color: '#6c757d',
  },
  workspaceSelected: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  editButtonModal: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  modalButtonText: {
    fontSize: 16,
    color: 'rgba(108, 117, 125, 0.9)',
    fontWeight: '500',
  },
  createWorkspaceIcon: {
    fontSize: 18,
    color: 'rgba(108, 117, 125, 0.9)',
    marginRight: 12,
  },
});

export default CardWorkspace;