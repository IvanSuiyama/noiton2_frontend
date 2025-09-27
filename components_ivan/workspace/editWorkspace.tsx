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
import { apiCall, setActiveWorkspace } from '../../services/authService';

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

  // Busca workspace correto entre todos do usuário logado
  const buscarDadosWorkspace = async () => {
    try {
      setLoadingInitial(true);
      // Busca todos os workspaces do usuário logado
      const todos = await apiCall(`/workspaces/email/${encodeURIComponent(userEmail)}`, 'GET');
      // Filtra pelo nome e, se possível, pelo criador
      let encontrado = null;
      if (Array.isArray(todos)) {
        encontrado = todos.find((ws: any) => ws.nome === workspaceName && (ws.criador === userEmail || true));
        // Se não encontrar pelo criador, pega só pelo nome
        if (!encontrado) {
          encontrado = todos.find((ws: any) => ws.nome === workspaceName);
        }
      }
      if (encontrado) {
        setWorkspace(encontrado);
        setOriginalName(encontrado.nome);
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
      };

      // Atualiza workspace por ID (rota backend)
      const response = await apiCall(
        `/workspaces/${workspace.id_workspace}`,
        'PUT',
        dadosParaEnvio
      );

      if (response) {
        // Atualiza o nome salvo no AsyncStorage para refletir o novo nome
        await setActiveWorkspace(workspace.id_workspace || 0, workspace.nome);
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