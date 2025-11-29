import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { apiCall } from '../../services/authService';
import ComentarioInterface, { CreateComentarioInterface, EditComentarioInterface } from './comentarioInterface';
import networkinManager from '../../services/networkinManager';
import syncManager from '../../services/syncManager';

interface RouteParams {
  id_tarefa: number;
  titulo: string;
}

const CadComentario: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { id_tarefa, titulo } = route.params as RouteParams;

  const [comentarios, setComentarios] = useState<ComentarioInterface[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEditando, setTextoEditando] = useState('');

  useEffect(() => {
    carregarComentarios();
  }, []);

  const carregarComentarios = async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/comentarios/tarefa/${id_tarefa}`);
      setComentarios(response || []);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os comentários');
    } finally {
      setLoading(false);
    }
  };

  const salvarComentarioOffline = async (dadosComentario: CreateComentarioInterface) => {
    try {
      // Adicionar à fila de sincronização
      await syncManager.addToQueue({
        action: 'CREATE',
        entity: 'comentario',
        data: dadosComentario
      });
      
      setNovoComentario('');
      console.log('💬 Comentário adicionado à fila de sincronização offline');
      Alert.alert(
        '📴 Salvo Offline',
        'Seu comentário foi salvo localmente e será enviado quando você estiver online.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro ao salvar comentário offline:', error);
      Alert.alert('Erro', 'Falha ao salvar comentário offline.');
      throw error;
    }
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim()) {
      Alert.alert('Atenção', 'Digite um comentário antes de enviar');
      return;
    }

    if (novoComentario.trim().length < 3) {
      Alert.alert('Atenção', 'O comentário deve ter pelo menos 3 caracteres');
      return;
    }

    try {
      setEnviando(true);

      const dadosComentario: CreateComentarioInterface = {
        id_tarefa,
        descricao: novoComentario.trim()
      };

      const isOnline = networkinManager.checkOnlineStatus();
      
      if (isOnline) {
        try {
          // Tentar enviar online
          await apiCall('/comentarios', 'POST', dadosComentario);
          
          setNovoComentario('');
          await carregarComentarios(); // Recarregar para mostrar o novo comentário
          
          Alert.alert('Sucesso', 'Comentário adicionado com sucesso!');
        } catch (apiError) {
          console.log('📴 Falha na API, salvando offline...');
          await salvarComentarioOffline(dadosComentario);
        }
      } else {
        // Modo offline
        console.log('📴 Modo offline - salvando comentário para sincronização posterior');
        await salvarComentarioOffline(dadosComentario);
      }
    } catch (error: any) {
      console.error('Erro ao enviar comentário:', error);
      Alert.alert('Erro', 'Não foi possível enviar o comentário');
    } finally {
      setEnviando(false);
    }
  };

  const iniciarEdicao = (comentario: ComentarioInterface) => {
    setEditandoId(comentario.id_comentario);
    setTextoEditando(comentario.descricao);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setTextoEditando('');
  };

  const salvarEdicao = async (id_comentario: number) => {
    if (!textoEditando.trim() || textoEditando.trim().length < 3) {
      Alert.alert('Atenção', 'O comentário deve ter pelo menos 3 caracteres');
      return;
    }

    try {
      const dadosEdicao: EditComentarioInterface = {
        descricao: textoEditando.trim()
      };

      await apiCall(`/comentarios/${id_comentario}`, 'PUT', dadosEdicao);
      
      setEditandoId(null);
      setTextoEditando('');
      await carregarComentarios();
      
      Alert.alert('Sucesso', 'Comentário editado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao editar comentário:', error);
      if (error.message?.includes('403')) {
        Alert.alert('Erro', 'Você só pode editar seus próprios comentários');
      } else {
        Alert.alert('Erro', 'Não foi possível editar o comentário');
      }
    }
  };

  const deletarComentario = async (comentario: ComentarioInterface) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja deletar este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiCall(`/comentarios/${comentario.id_comentario}`, 'DELETE', {
                email: comentario.email
              });
              
              await carregarComentarios();
              Alert.alert('Sucesso', 'Comentário deletado com sucesso!');
            } catch (error: any) {
              console.error('Erro ao deletar comentário:', error);
              if (error.message?.includes('403')) {
                Alert.alert('Erro', 'Você só pode deletar seus próprios comentários');
              } else {
                Alert.alert('Erro', 'Não foi possível deletar o comentário');
              }
            }
          }
        }
      ]
    );
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderComentario = ({ item }: { item: ComentarioInterface }) => (
    <View style={[styles.comentarioCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      
      {/* Header do comentário */}
      <View style={styles.comentarioHeader}>
        <View style={styles.autorInfo}>
          <Text style={[styles.autorEmail, { color: theme.colors.primary }]}>
            {item.email}
          </Text>
          <Text style={[styles.dataComentario, { color: theme.colors.textSecondary }]}>
            {formatarData(item.data_criacao)}
            {item.data_atualizacao !== item.data_criacao && ' (editado)'}
          </Text>
        </View>
        
        <View style={styles.acoesComentario}>
          <TouchableOpacity
            onPress={() => iniciarEdicao(item)}
            style={styles.acaoButton}>
            <Text style={styles.acaoIcon}>✏️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => deletarComentario(item)}
            style={styles.acaoButton}>
            <Text style={styles.acaoIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo do comentário */}
      {editandoId === item.id_comentario ? (
        <View style={styles.editandoContainer}>
          <TextInput
            style={[
              styles.editandoInput,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }
            ]}
            value={textoEditando}
            onChangeText={setTextoEditando}
            placeholder="Edite seu comentário..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            autoFocus
          />
          
          <View style={styles.editandoAcoes}>
            <TouchableOpacity
              onPress={cancelarEdicao}
              style={[styles.editandoBotao, { borderColor: theme.colors.border }]}>
              <Text style={[styles.editandoBotaoTexto, { color: theme.colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => salvarEdicao(item.id_comentario)}
              style={[styles.editandoBotao, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.editandoBotaoTextoSalvar}>
                Salvar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={[styles.comentarioTexto, { color: theme.colors.text }]}>
          {item.descricao}
        </Text>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { color: theme.colors.textSecondary }]}>💬</Text>
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        Nenhum comentário ainda.{'\n'}Seja o primeiro a comentar!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltarButton}>
          <Text style={[styles.voltarTexto, { color: theme.colors.primary }]}>← Voltar</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Comentários</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {titulo}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        {/* Lista de comentários */}
        <View style={styles.listaContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Carregando comentários...
              </Text>
            </View>
          ) : (
            <FlatList
              data={comentarios}
              keyExtractor={(item) => item.id_comentario.toString()}
              renderItem={renderComentario}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyState}
            />
          )}
        </View>

        {/* Input para novo comentário */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[
              styles.comentarioInput,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }
            ]}
            placeholder="Escreva um comentário..."
            placeholderTextColor={theme.colors.textSecondary}
            value={novoComentario}
            onChangeText={setNovoComentario}
            multiline
            maxLength={1000}
            editable={!enviando}
          />
          
          <TouchableOpacity
            onPress={enviarComentario}
            disabled={enviando || !novoComentario.trim()}
            style={[
              styles.enviarButton,
              {
                backgroundColor: novoComentario.trim() && !enviando 
                  ? theme.colors.primary 
                  : theme.colors.border,
                opacity: enviando ? 0.7 : 1
              }
            ]}>
            <Text style={styles.enviarButtonText}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  voltarButton: {
    marginRight: 16,
  },
  voltarTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  listaContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  comentarioCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  comentarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  autorInfo: {
    flex: 1,
  },
  autorEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataComentario: {
    fontSize: 12,
    marginTop: 2,
  },
  acoesComentario: {
    flexDirection: 'row',
    gap: 8,
  },
  acaoButton: {
    padding: 4,
  },
  acaoIcon: {
    fontSize: 16,
  },
  comentarioTexto: {
    fontSize: 16,
    lineHeight: 24,
  },
  editandoContainer: {
    gap: 12,
  },
  editandoInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editandoAcoes: {
    flexDirection: 'row',
    gap: 12,
  },
  editandoBotao: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  editandoBotaoTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  editandoBotaoTextoSalvar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
    alignItems: 'flex-end',
  },
  comentarioInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  enviarButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CadComentario;