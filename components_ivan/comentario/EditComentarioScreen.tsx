import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../router';
import { apiCall, getUserEmail } from '../../services/authService';

type EditComentarioScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditComentario'>;
type EditComentarioScreenRouteProp = RouteProp<RootStackParamList, 'EditComentario'>;

interface EditComentarioScreenProps {
  navigation: EditComentarioScreenNavigationProp;
  route: EditComentarioScreenRouteProp;
}

const EditComentarioScreen: React.FC<EditComentarioScreenProps> = ({ navigation, route }) => {
  const { comentario, id_tarefa, titulo_tarefa } = route.params;
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (comentario) {
      setDescricao(comentario.descricao || comentario.conteudo || '');
    }
  }, [comentario]);

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      Alert.alert('Erro', 'Por favor, digite uma descrição para o comentário.');
      return;
    }

    setCarregando(true);
    try {
      const userEmail = await getUserEmail();
      
      console.log('✏️ Dados do comentário sendo editado:', {
        id_comentario: comentario.id_comentario,
        email_original: comentario.email,
        email_atual: userEmail,
        descricao_original: comentario.descricao,
        nova_descricao: descricao.trim()
      });
      
      await apiCall(`/comentarios/${comentario.id_comentario}`, 'PUT', {
        descricao: descricao.trim(),
        email: userEmail, // Incluindo email explicitamente
      });

      Alert.alert(
        'Sucesso', 
        'Comentário atualizado com sucesso!',
        [
          { 
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Erro ao editar comentário:', error);
      Alert.alert('Erro', 'Erro ao atualizar comentário. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCancelar = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleCancelar}>
          <Text style={styles.backButtonText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Comentário</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info da Tarefa */}
        <View style={styles.tarefaInfo}>
          <Text style={styles.tarefaLabel}>Tarefa:</Text>
          <Text style={styles.tarefaTitulo}>{titulo_tarefa}</Text>
        </View>

        {/* Campo de Edição */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Comentário:</Text>
          <TextInput
            style={styles.textInput}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Digite seu comentário..."
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
            placeholderTextColor="#6c757d"
          />
          <Text style={styles.caracteresRestantes}>
            {descricao.length}/500 caracteres
          </Text>
        </View>

        {/* Botão de Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, (!descricao.trim() || carregando) && styles.saveButtonDisabled]}
          onPress={handleSalvar}
          disabled={carregando || !descricao.trim()}
        >
          <Text style={styles.saveButtonText}>
            {carregando ? '💾 Salvando...' : '💾 Salvar Alterações'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  
  backButton: {
    padding: 8,
  },
  
  backButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
  
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  
  headerSpacer: {
    width: 80,
  },
  
  content: {
    flex: 1,
    padding: 16,
  },

  tarefaInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },

  tarefaLabel: {
    color: '#6c757d',
    fontSize: 14,
    marginBottom: 4,
  },

  tarefaTitulo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  inputSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  
  textInput: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    textAlignVertical: 'top',
  },
  
  caracteresRestantes: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 8,
  },
  
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

  saveButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditComentarioScreen;