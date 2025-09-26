import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  getActiveWorkspaceName,
  getUserWorkspaces,
  setActiveWorkspace,
  getUserEmail,
} from '../../services/authService';

type CardWorkspaceNavigationProp = StackNavigationProp<RootStackParamList>;

interface CardWorkspaceProps {
  navigation: CardWorkspaceNavigationProp;
}

const CardWorkspace: React.FC<CardWorkspaceProps> = ({ navigation }) => {
  // Estilo do lápis igual ao do card de usuário
  const pencilIconStyle = {
    fontSize: 20,
    color: '#fff700',
    textShadowColor: '#fff700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontWeight: 'bold' as 'bold',
    opacity: 1,
  };
  const [workspaceName, setWorkspaceName] = useState('');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadWorkspaceData();
    loadWorkspaces();
    // Carregar email do usuário logado
    getUserEmail().then(email => setUserEmail(email || ''));
  }, []);

  const loadWorkspaceData = async () => {
    try {
      const activeWorkspaceName = await getActiveWorkspaceName();
      setWorkspaceName(activeWorkspaceName || 'Workspace');
    } catch (error) {
      console.error('Erro ao carregar dados do workspace:', error);
    }
  };

  // Busca workspaces do usuário logado (por email)
  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const workspaces = await getUserWorkspaces();
      setUserWorkspaces(workspaces || []);
    } catch (error) {
      console.error('Erro ao carregar workspaces:', error);
      Alert.alert('Erro', 'Não foi possível carregar os workspaces');
    } finally {
      setLoading(false);
    }
  };

  // Troca o workspace ativo (id e nome)
  const handleWorkspaceChange = async (workspace: any) => {
    try {
      await setActiveWorkspace(workspace.id_workspace, workspace.nome);
      setWorkspaceName(workspace.nome);
      setShowWorkspaceModal(false);
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

  // Navega para edição do workspace, passando nome e email
  const handleEditWorkspace = (wsName: string) => {
    navigation.navigate('EditWorkspace', {
      workspaceName: wsName,
      userEmail,
    });
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.workspaceCard}
        onPress={() => setShowWorkspaceModal(true)}>
        <View style={styles.workspaceIcon}>
          <Text style={styles.workspaceIconText}>
            {workspaceName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.workspaceInfo}>
          <View style={styles.workspaceNameContainer}>
            <Text style={styles.workspaceName}>{workspaceName}</Text>
            <TouchableOpacity
              style={styles.editButtonCard}
              onPress={() => handleEditWorkspace(workspaceName)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={pencilIconStyle}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.workspaceLabel}>Workspace</Text>
        </View>
        <Text style={styles.chevronDown}>▼</Text>
      </TouchableOpacity>

      {/* Modal de Seleção de Workspace */}
      <Modal
        visible={showWorkspaceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkspaceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.workspaceModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Workspace</Text>
              <TouchableOpacity onPress={() => setShowWorkspaceModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={userWorkspaces}
              keyExtractor={(item) => item.id_workspace.toString()}
              renderItem={({item}) => (
                <View style={styles.workspaceItemRow}>
                  <TouchableOpacity
                    style={styles.workspaceItem}
                    onPress={() => handleWorkspaceChange(item)}>
                    <View style={styles.workspaceItemIcon}>
                      <Text style={styles.workspaceItemIconText}>
                        {item.nome.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.workspaceItemInfo}>
                      <Text style={styles.workspaceItemName}>{item.nome}</Text>
                      <Text style={styles.workspaceItemType}>
                        {item.equipe ? 'Equipe' : 'Pessoal'}
                      </Text>
                    </View>
                    {workspaceName === item.nome && (
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
            
            {/* Botão Criar Novo Workspace */}
            <TouchableOpacity
              style={styles.createWorkspaceButton}
              onPress={handleCreateNewWorkspace}>
              <Text style={styles.createWorkspaceIcon}>+</Text>
              <Text style={styles.createWorkspaceText}>Criar novo workspace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  editButtonCard: {
    marginLeft: 8,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // editIconNeon removido, agora é inline
  workspaceCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
  },
  
  workspaceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  workspaceIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  workspaceInfo: {
    flex: 1,
  },

  workspaceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  workspaceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editButtonModal: {
    marginLeft: 4,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // editIcon removido, agora é inline
  
  workspaceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  
  workspaceLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  
  chevronDown: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 8,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal de Workspace
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
  
  workspaceItem: {
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
  
  createWorkspaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  
  createWorkspaceIcon: {
    fontSize: 18,
    color: 'rgba(108, 117, 125, 0.9)',
    marginRight: 12,
  },
  
  createWorkspaceText: {
    fontSize: 16,
    color: 'rgba(108, 117, 125, 0.9)',
    fontWeight: '500',
  },
});

export default CardWorkspace;
