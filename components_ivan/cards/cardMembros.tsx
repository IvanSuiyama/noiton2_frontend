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
import {
  apiCall,
  getActiveWorkspaceId,
  getUserWorkspaces,
} from '../../services/authService';
import WorkspaceInterface from '../workspace/workspaceInterface';
import { databaseService } from '../../services/databaseService';
import { networkMonitor } from '../../services/networkinManager';
import { useTheme } from '../theme/ThemeContext';
import { useIcons } from '../icons/IconContext';

interface CardMembrosProps {
  onMembrosAtualizados?: (novosMembros: string[]) => void;
  refreshKey?: any;
}

const CardMembros: React.FC<CardMembrosProps> = ({ onMembrosAtualizados, refreshKey }) => {
  const { theme } = useTheme();
  
  // Usar IconContext com verificação de segurança
  let iconContext;
  try {
    iconContext = useIcons();
  } catch (error) {
    console.warn('IconContext não disponível, usando ícone padrão');
    iconContext = null;
  }
  const [novoEmail, setNovoEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [listaMembros, setListaMembros] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [criador, setCriador] = useState('');
  const [isEquipe, setIsEquipe] = useState(false);
  const [idWorkspace, setIdWorkspace] = useState<number | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceInterface[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceInterface | null>(null);

  const initializeWorkspaceData = async () => {
    try {
      const isOnline = await networkMonitor.checkNetworkStatus();
      let userWorkspaces: WorkspaceInterface[] = [];

      if (isOnline) {
        // Modo online - buscar da API
        try {
          console.log('👥 Carregando dados de membros online...');
          userWorkspaces = await getUserWorkspaces();
        } catch (error) {
          console.error('Erro ao carregar workspaces online:', error);
          // Fallback para dados offline se API falhar
          userWorkspaces = await loadOfflineWorkspaces();
        }
      } else {
        // Modo offline - buscar do SQLite
        console.log('👥 Carregando dados de membros offline...');
        userWorkspaces = await loadOfflineWorkspaces();
      }

      if (!Array.isArray(userWorkspaces) || userWorkspaces.length === 0) {
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        setIdWorkspace(null);
        setIsEquipe(false);
        setListaMembros([]);
        setCriador('');
        return;
      }

      setWorkspaces(userWorkspaces);
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
      console.error('Erro ao buscar workspaces do usuário:', error);
      
      const isOnline = await networkMonitor.checkNetworkStatus();
      const errorMessage = isOnline 
        ? 'Não foi possível carregar os workspaces. Tente novamente mais tarde.'
        : 'Dados offline não disponíveis. Conecte-se à internet para sincronizar.';
      Alert.alert('Erro', errorMessage);
    }
  };

  const loadOfflineWorkspaces = async (): Promise<WorkspaceInterface[]> => {
    try {
      // Aqui assumimos que vamos buscar do usuário logado
      const { getUserEmail } = require('../../services/authService');
      const email = await getUserEmail();
      if (!email) {
        return [];
      }
      
      const result = await databaseService.getWorkspacesByUser(email);
      if (result.success && Array.isArray(result.data)) {
        console.log('👥 Workspaces carregados do cache offline para membros:', result.data.length);
        return result.data;
      }
      console.log('👥 Nenhum workspace offline encontrado para membros');
      return [];
    } catch (error) {
      console.error('Erro ao carregar workspaces offline para membros:', error);
      return [];
    }
  };
  useEffect(() => {
    initializeWorkspaceData();
  }, []);

  useEffect(() => {
    if (idWorkspace) {
      initializeWorkspaceData();
    }
  }, [idWorkspace]);

  useEffect(() => {
    initializeWorkspaceData();
  }, [refreshKey]);

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

  const renderCardPequeno = () => (
    <TouchableOpacity
      style={[styles.cardPequeno, { backgroundColor: theme.colors.surface }]}
      onPress={() => setModalVisible(true)}
    >
      <View style={[styles.cardIcon, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.cardIconText}>
          {iconContext?.getActiveIcon ? iconContext.getActiveIcon('membros') : '👥'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          {}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Gerenciar Membros</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {}
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

          {}
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
    fontWeight: 'bold',
  },

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
