import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiCall, isAuthenticated } from '../../services/authService';
import UserInterface from './userInterface';

interface RouteParams {
  userEmail?: string;
}

const DellUser: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userEmail } = (route.params as RouteParams) || {};

  const [email, setEmail] = useState(userEmail || '');
  const [usuario, setUsuario] = useState<UserInterface | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Se veio com email por parâmetro, busca automaticamente
  useEffect(() => {
    const verificarAutenticacaoECarregarDados = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          Alert.alert(
            'Erro de Autenticação',
            'Você não está autenticado. Faça login novamente.',
            [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
          return;
        }
        
        if (userEmail) {
          await buscarUsuario();
        }
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        Alert.alert('Erro', 'Erro ao verificar autenticação');
        navigation.goBack();
      }
    };

    verificarAutenticacaoECarregarDados();
  }, [userEmail]);

  const buscarUsuario = async () => {
    if (!email.trim()) {
      setErrors({ email: 'Email é obrigatório' });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ email: 'Formato de email inválido' });
      return;
    }

    try {
      setLoadingUser(true);
      setErrors({});

      const userData = await apiCall(`/usuarios/email/${encodeURIComponent(email)}`);
      setUsuario(userData);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar usuário';
      
      if (errorMessage.includes('Token expirado') || errorMessage.includes('não autenticado')) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) {
        setErrors({ email: 'Usuário não encontrado' });
        setUsuario(null);
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setLoadingUser(false);
    }
  };

  const handleBuscar = () => {
    buscarUsuario();
  };

  const handleSolicitarExclusao = () => {
    if (!usuario) {
      return;
    }
    
    setShowConfirmModal(true);
  };

  const confirmarExclusao = async () => {
    if (!usuario) {
      return;
    }

    // Verificar se o texto de confirmação está correto
    if (confirmationText !== 'DELETAR') {
      Alert.alert(
        'Confirmação Inválida',
        'Digite exatamente "DELETAR" para confirmar a exclusão da conta.'
      );
      return;
    }

    try {
      setLoading(true);
      setShowConfirmModal(false);

      await apiCall(`/usuarios/${encodeURIComponent(usuario.email)}`, 'DELETE');

      Alert.alert(
        'Conta Excluída',
        'A conta do usuário foi excluída permanentemente, junto com todos os workspaces, tarefas e dados relacionados.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setUsuario(null);
              setEmail('');
              setConfirmationText('');
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir usuário';
      
      if (errorMessage.includes('Token expirado') || errorMessage.includes('não autenticado')) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Erro', errorMessage);
        setShowConfirmModal(true); // Reabrir modal em caso de erro
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelarExclusao = () => {
    setShowConfirmModal(false);
    setConfirmationText('');
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>⚠️ Excluir Conta de Usuário</Text>
          <Text style={styles.description}>
            Esta ação é <Text style={styles.dangerText}>IRREVERSÍVEL</Text> e excluirá permanentemente:
          </Text>

          {/* Lista de consequências */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningTitle}>O que será excluído:</Text>
            <Text style={styles.warningItem}>• A conta do usuário</Text>
            <Text style={styles.warningItem}>• Todos os workspaces criados por ele</Text>
            <Text style={styles.warningItem}>• Todas as tarefas criadas por ele</Text>
            <Text style={styles.warningItem}>• Todas as categorias criadas por ele</Text>
            <Text style={styles.warningItem}>• Comentários feitos por você</Text>
          </View>

          {/* Campo de busca por email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email do Usuário *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder="Digite o email do usuário"
              placeholderTextColor="#6c757d"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!userEmail} // Se veio por parâmetro, não pode editar
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Botão de buscar */}
          {!userEmail && (
            <TouchableOpacity
              style={[styles.buttonSecondary, loadingUser && styles.buttonDisabled]}
              onPress={handleBuscar}
              disabled={loadingUser}
            >
              {loadingUser ? (
                <ActivityIndicator size="small" color="#6c757d" />
              ) : (
                <Text style={styles.buttonSecondaryText}>Buscar Usuário</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Dados do usuário encontrado */}
          {usuario && (
            <View style={styles.userDataContainer}>
              <Text style={styles.userDataTitle}>Usuário Encontrado:</Text>
              <View style={styles.userInfo}>
                <Text style={styles.userInfoLabel}>Nome:</Text>
                <Text style={styles.userInfoValue}>{usuario.nome}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userInfoLabel}>Email:</Text>
                <Text style={styles.userInfoValue}>{usuario.email}</Text>
              </View>
              {usuario.telefone && (
                <View style={styles.userInfo}>
                  <Text style={styles.userInfoLabel}>Telefone:</Text>
                  <Text style={styles.userInfoValue}>{usuario.telefone}</Text>
                </View>
              )}
            </View>
          )}

          {/* Botão de exclusão */}
          {usuario && (
            <TouchableOpacity
              style={[styles.dangerButton, loading && styles.buttonDisabled]}
              onPress={handleSolicitarExclusao}
              disabled={loading}
            >
              <Text style={styles.dangerButtonText}>🗑️ Excluir Conta Permanentemente</Text>
            </TouchableOpacity>
          )}

          {/* Botão voltar */}
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.buttonSecondaryText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Confirmação */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelarExclusao}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚠️ CONFIRMAÇÃO FINAL</Text>
            
            <Text style={styles.modalText}>
              Você está prestes a excluir permanentemente a conta de:
            </Text>
            <Text style={styles.modalUserName}>{usuario?.nome}</Text>
            <Text style={styles.modalUserEmail}>({usuario?.email})</Text>

            <Text style={styles.modalWarning}>
              Esta ação NÃO PODE SER DESFEITA e excluirá todos os dados relacionados a este usuário.
            </Text>

            <Text style={styles.modalConfirmText}>
              Digite <Text style={styles.confirmationWord}>DELETAR</Text> para confirmar:
            </Text>

            <TextInput
              style={[styles.confirmationInput, confirmationText === 'DELETAR' ? styles.confirmationInputValid : null]}
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder="Digite DELETAR"
              placeholderTextColor="#6c757d"
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalDangerButton, confirmationText !== 'DELETAR' && styles.buttonDisabled]}
                onPress={confirmarExclusao}
                disabled={loading || confirmationText !== 'DELETAR'}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalDangerButtonText}>Excluir Definitivamente</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={cancelarExclusao}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#ffffff',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#6c757d',
    lineHeight: 22,
  },
  dangerText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.3)',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
  },
  warningItem: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#404040',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 6,
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  buttonSecondaryText: {
    color: '#6c757d',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  userDataContainer: {
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(108, 117, 125, 0.3)',
  },
  userDataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#6c757d',
    width: 80,
    fontWeight: '600',
  },
  userInfoValue: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#404040',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#dc3545',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#6c757d',
    lineHeight: 22,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 20,
  },
  modalWarning: {
    fontSize: 14,
    textAlign: 'center',
    color: '#dc3545',
    marginBottom: 24,
    lineHeight: 20,
    fontWeight: '600',
  },
  modalConfirmText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#ffffff',
  },
  confirmationWord: {
    fontWeight: 'bold',
    color: '#dc3545',
  },
  confirmationInput: {
    borderWidth: 1.5,
    borderColor: '#404040',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmationInputValid: {
    borderColor: '#28a745',
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  modalDangerButton: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  modalDangerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalCancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DellUser;