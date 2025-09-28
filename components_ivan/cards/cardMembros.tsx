import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  FlatList, 
  Modal 
} from 'react-native';
import WorkspaceInterface from '../workspace/workspaceInterface';
import { getActiveWorkspaceId, getUserWorkspaces, apiCall } from '../../services/authService';


// Não recebe mais props de membros, criador, isEquipe
interface CardMembrosProps {
  onMembrosAtualizados?: (novosMembros: string[]) => void;
}



const CardMembros: React.FC<CardMembrosProps> = ({ onMembrosAtualizados}) => {
  const [novoEmail, setNovoEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [listaMembros, setListaMembros] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [criador, setCriador] = useState('');
  const [isEquipe, setIsEquipe] = useState(false);
  const [idWorkspace, setIdWorkspace] = useState<number | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceInterface[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceInterface | null>(null);

  // Função agora é exportada para uso em outras funções
  const initializeWorkspaceData = async () => {
    try {
      const userWorkspaces = await getUserWorkspaces();
      setWorkspaces(userWorkspaces || []);
      const activeWorkspaceId = await getActiveWorkspaceId();
      const workspaceAtivo = userWorkspaces.find((ws: WorkspaceInterface) => ws.id_workspace === activeWorkspaceId) || userWorkspaces[0];
      setActiveWorkspaceState(workspaceAtivo);
      setIdWorkspace(workspaceAtivo?.id_workspace || null);
      setIsEquipe(workspaceAtivo?.equipe || false);
      setListaMembros(workspaceAtivo?.emails || []);
      setCriador(workspaceAtivo?.criador || '');
    } catch (error) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setIdWorkspace(null);
      setIsEquipe(false);
      setListaMembros([]);
      setCriador('');
    }
  };
  useEffect(() => {
    initializeWorkspaceData();
  }, []);



  const validarEmail = async (email: string) => {
    try {
      const emailcadastrado = await apiCall(`/usuarios/email/${email}`, 'GET');
      return emailcadastrado;
    } catch {
      console.log('Email não cadastrado no aplicativo.');
      return false;
    }
  };

  const adicionarMembro = async () => {
    if (!idWorkspace) { return; }
    const emailValido = await validarEmail(novoEmail);
    if (!emailValido) {
      Alert.alert('Email inválido', 'Este email não possui conta cadastrada em nosso sistema.');
      return;
    }
    if (listaMembros.includes(novoEmail)) {
      Alert.alert('Já é membro', 'Este email já faz parte do workspace.');
      return;
    }
    setLoading(true);
    try {
      await apiCall(`/workspaces/${idWorkspace}/adicionar-email`, 'POST', { emailNovo: novoEmail });
      setNovoEmail('');
      await initializeWorkspaceData();
      onMembrosAtualizados && onMembrosAtualizados(listaMembros);
      Alert.alert('Sucesso', 'Membro adicionado!');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao adicionar membro.');
    } finally {
      setLoading(false);
    }
  };

  const removerMembro = async (email: string) => {
    if (!idWorkspace) { return; }
    if (email === criador) {
      Alert.alert('Ação não permitida', 'Não é possível remover o criador do workspace.');
      return;
    }
    setLoading(true);
    try {
      await apiCall(`/workspaces/${idWorkspace}/remover-email`, 'DELETE', { emailRuim: email });
      await initializeWorkspaceData();
      onMembrosAtualizados && onMembrosAtualizados(listaMembros);
      Alert.alert('Sucesso', 'Membro removido!');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao remover membro.');
    } finally {
      setLoading(false);
    }
  };

  const renderMembro = ({ item }: { item: string }) => (
    <View style={styles.membroRow}>
      <Text style={{ marginRight: 8, fontSize: 18 }}>{item === criador ? '👑' : '👤'}</Text>
      <Text style={styles.membroEmail}>{item}</Text>
      <Text style={styles.membroTipo}>{item === criador ? ' (Criador)' : ' (Membro)'}</Text>
      {item !== criador && (
        <TouchableOpacity style={styles.removerBtn} onPress={() => removerMembro(item)} disabled={loading}>
          <Text style={{ fontSize: 18 }}>❌</Text>
        </TouchableOpacity>
      )}
    </View>
  );


  // Card pequeno (apenas ícone - igual ao CardUser)
  const renderCardPequeno = () => (
    <TouchableOpacity 
      style={styles.cardPequeno} 
      onPress={() => setModalVisible(true)}
    >
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>👥</Text>
      </View>
    </TouchableOpacity>
  );

  // Modal com funcionalidades completas
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header do Modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gerenciar Membros</Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Membros */}
          <FlatList
            data={listaMembros}
            keyExtractor={item => item}
            renderItem={renderMembro}
            style={styles.lista}
            ListHeaderComponent={
              <Text style={styles.membrosCount}>
                {listaMembros.length} membro{listaMembros.length !== 1 ? 's' : ''}
              </Text>
            }
          />

          {/* Adicionar Membro (apenas se for equipe) */}
          {isEquipe && (
            <View style={styles.addContainer}>
              <TextInput
                style={styles.input}
                placeholder="Adicionar email de membro"
                placeholderTextColor="#6c757d"
                value={novoEmail}
                onChangeText={setNovoEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={adicionarMembro} 
                disabled={loading}
              >
                <Text style={{ fontSize: 18, color: '#fff' }}>➕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View>
      {renderCardPequeno()}
      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  // Card Pequeno (igual ao CardUser)
  cardPequeno: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 8,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {
    fontSize: 20,
  },

  // Modal (mantido igual)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#23272b',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  membrosCount: {
    fontSize: 14,
    color: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  lista: {
    maxHeight: 300,
    marginBottom: 12,
  },
  membroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  membroEmail: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  membroTipo: {
    color: '#6c757d',
    fontSize: 13,
    marginLeft: 6,
  },
  removerBtn: {
    marginLeft: 10,
    padding: 4,
  },
  addContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    marginRight: 8,
  },
  addBtn: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
});

export default CardMembros;