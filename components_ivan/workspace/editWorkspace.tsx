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
  Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import WorkspaceInterface from './workspaceInterface';
import UserInterface from '../usuario/userInterface';
import SelectUsuario from '../usuario/selectUsuario';
import { apiCall } from '../../services/authService';

interface RouteParams {
  workspaceName: string;
  userEmail: string;
}

const EditWorkspace: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { workspaceName, userEmail } = route.params as RouteParams;

  const [workspace, setWorkspace] = useState<WorkspaceInterface>({
    nome: '',
    equipe: false,
    criador: '',
    emails: [],
  });

  const [originalName, setOriginalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Buscar dados do workspace ao carregar o componente
  useEffect(() => {
    buscarDadosWorkspace();
  }, []);

  const buscarDadosWorkspace = async () => {
    try {
      setLoadingInitial(true);
      const response = await apiCall(`/workspace/nome/${workspaceName}`, 'GET');

      if (response) {
        setWorkspace(response);
        setOriginalName(response.nome);
      } else {
        Alert.alert('Erro', 'Workspace não encontrado');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao buscar workspace:', error);
      Alert.alert('Erro', 'Erro ao carregar dados do workspace');
      navigation.goBack();
    } finally {
      setLoadingInitial(false);
    }
  };

  const validarFormulario = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validar nome
    if (!workspace.nome.trim()) {
      newErrors.nome = 'Nome do workspace é obrigatório';
    } else if (workspace.nome.trim().length < 3) {
      newErrors.nome = 'Nome deve ter pelo menos 3 caracteres';
    }

    // Validar emails (pelo menos o criador deve estar presente)
    if (workspace.emails.length === 0) {
      newErrors.emails = 'Deve ter pelo menos um membro no workspace';
    } else if (!workspace.emails.includes(workspace.criador)) {
      newErrors.emails = 'O criador deve estar na lista de membros';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) {
      return;
    }

    // Verificar se é o criador
    if (workspace.criador !== userEmail) {
      Alert.alert('Erro', 'Apenas o criador do workspace pode editá-lo');
      return;
    }

    try {
      setLoading(true);

      // Preparar dados para envio
      const dadosParaEnvio = {
        nome: workspace.nome,
        equipe: workspace.equipe,
      };

      const response = await apiCall(
        `/workspace/${originalName}`,
        'PUT',
        dadosParaEnvio
      );

      if (response) {
        Alert.alert('Sucesso', 'Workspace editado com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Erro', 'Erro ao editar workspace');
      }
    } catch (error) {
      console.error('Erro ao editar workspace:', error);
      Alert.alert('Erro', 'Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarMembro = (user: UserInterface) => {
    if (!workspace.emails.includes(user.email)) {
      setWorkspace({
        ...workspace,
        emails: [...workspace.emails, user.email],
      });
    }
    setShowUserSelector(false);
  };

  const handleRemoverMembro = (email: string) => {
    if (email === workspace.criador) {
      Alert.alert('Aviso', 'Não é possível remover o criador do workspace');
      return;
    }

    Alert.alert(
      'Confirmar Remoção',
      `Tem certeza que deseja remover ${email} do workspace?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setWorkspace({
              ...workspace,
              emails: workspace.emails.filter((e) => e !== email),
            });
          },
        },
      ]
    );
  };

  if (loadingInitial) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6c757d" />
        <Text style={styles.loadingText}>Carregando dados do workspace...</Text>
      </View>
    );
  }

  // Se não é o criador, mostrar apenas visualização
  if (workspace.criador !== userEmail) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>📋 Visualizar Workspace</Text>
            <Text style={styles.description}>
              Você não tem permissão para editar este workspace.
            </Text>

            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyLabel}>Nome:</Text>
              <Text style={styles.readOnlyValue}>{workspace.nome}</Text>

              <Text style={styles.readOnlyLabel}>Tipo:</Text>
              <Text style={styles.readOnlyValue}>
                {workspace.equipe
                  ? 'Workspace em Equipe'
                  : 'Workspace Individual'}
              </Text>

              <Text style={styles.readOnlyLabel}>Criador:</Text>
              <Text style={styles.readOnlyValue}>{workspace.criador}</Text>

              <Text style={styles.readOnlyLabel}>
                Membros ({workspace.emails.length}):
              </Text>
              {workspace.emails.map((email, index) => (
                <Text key={index} style={styles.readOnlyMemberItem}>
                  • {email} {email === workspace.criador && '(Criador)'}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonSecondaryText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showUserSelector) {
    return (
      <View style={styles.container}>
        <View style={styles.selectorHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowUserSelector(false)}
          >
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.selectorTitle}>Adicionar Membro</Text>
        </View>
        <SelectUsuario
          onSelectUser={handleAdicionarMembro}
          excludeEmails={workspace.emails}
          showActions={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>✏️ Editar Workspace</Text>
          <Text style={styles.description}>
            Atualize as informações do seu workspace.
          </Text>

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome do Workspace *</Text>
            <TextInput
              style={[styles.input, errors.nome ? styles.inputError : null]}
              value={workspace.nome}
              onChangeText={(text) =>
                setWorkspace({ ...workspace, nome: text })
              }
              placeholder="Digite o nome do workspace"
              placeholderTextColor="#6c757d"
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>

          {/* Switch Equipe */}
          <View style={styles.switchContainer}>
            <View style={styles.switchContent}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Workspace em Equipe</Text>
                <Text style={styles.switchDescription}>
                  {workspace.equipe
                    ? 'Este workspace permite colaboração entre múltiplos usuários'
                    : 'Este é um workspace individual para uso pessoal'}
                </Text>
              </View>
              <Switch
                value={workspace.equipe}
                onValueChange={(value) =>
                  setWorkspace({ ...workspace, equipe: value })
                }
                trackColor={{ false: '#404040', true: 'rgba(108, 117, 125, 0.8)' }}
                thumbColor={workspace.equipe ? '#ffffff' : '#6c757d'}
              />
            </View>
          </View>

          {/* Informações do Criador */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoIcon}>👑</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Criador do Workspace</Text>
              <Text style={styles.infoText}>{workspace.criador}</Text>
            </View>
          </View>

          {/* Lista de Membros */}
          <View style={styles.membersSection}>
            <View style={styles.membersSectionHeader}>
              <Text style={styles.membersTitle}>
                👥 Membros ({workspace.emails.length})
              </Text>
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={() => setShowUserSelector(true)}
              >
                <Text style={styles.addMemberButtonText}>+ Adicionar</Text>
              </TouchableOpacity>
            </View>

            {errors.emails && <Text style={styles.errorText}>{errors.emails}</Text>}

            <View style={styles.membersList}>
              {workspace.emails.map((email, index) => (
                <View key={index} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberEmail}>{email}</Text>
                    {email === workspace.criador && (
                      <Text style={styles.creatorBadge}>👑 Criador</Text>
                    )}
                  </View>
                  {email !== workspace.criador && (
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() => handleRemoverMembro(email)}
                    >
                      <Text style={styles.removeMemberButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Aviso sobre edição */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Apenas o nome e o tipo podem ser alterados. Para modificar membros,
              use os botões de adicionar/remover acima.
            </Text>
          </View>

          {/* Botões */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSalvar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.buttonSecondaryText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>* Campos obrigatórios</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 32,
    color: '#6c757d',
    lineHeight: 22,
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
  switchContainer: {
    marginBottom: 24,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 117, 125, 0.2)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(108, 117, 125, 0.5)',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
  },
  membersSection: {
    marginBottom: 24,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addMemberButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addMemberButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  membersList: {
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  creatorBadge: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  removeMemberButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    borderRadius: 6,
    padding: 6,
    marginLeft: 12,
  },
  removeMemberButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  button: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
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
  buttonDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.4)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
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
  requiredText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  // Seletor de usuários
  selectorHeader: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  selectorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Visualização apenas leitura
  readOnlyContainer: {
    gap: 16,
  },
  readOnlyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
  },
  readOnlyMemberItem: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
});

export default EditWorkspace;