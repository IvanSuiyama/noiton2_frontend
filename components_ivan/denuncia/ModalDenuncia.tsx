import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { apiCall } from '../../services/authService';
import { CreateDenunciaInterface, DenunciaResponse } from './denunciaInterface';

interface ModalDenunciaProps {
  visible: boolean;
  onClose: () => void;
  idTarefa: number;
  tituloTarefa: string;
}

const ModalDenuncia: React.FC<ModalDenunciaProps> = ({
  visible,
  onClose,
  idTarefa,
  tituloTarefa
}) => {
  const { theme } = useTheme();
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const motivosComuns = [
    'Conteúdo inadequado ou ofensivo',
    'Spam ou conteúdo irrelevante',
    'Informações falsas ou enganosas',
    'Violação de direitos autorais',
    'Conteúdo duplicado',
    'Outro motivo'
  ];

  const selecionarMotivoComum = (motivoSelecionado: string) => {
    if (motivoSelecionado === 'Outro motivo') {
      setMotivo('');
    } else {
      setMotivo(motivoSelecionado);
    }
  };

  const enviarDenuncia = async () => {
    if (!motivo.trim()) {
      Alert.alert('Erro', 'Por favor, informe o motivo da denúncia');
      return;
    }

    if (motivo.trim().length < 10) {
      Alert.alert('Erro', 'Por favor, descreva melhor o motivo (mínimo 3 palavras)');
      return;
    }

    try {
      setLoading(true);

      const dadosDenuncia: CreateDenunciaInterface = {
        id_tarefa: idTarefa,
        motivo: motivo.trim()
      };

      const response: DenunciaResponse = await apiCall('/denuncias', 'POST', dadosDenuncia);

      console.log('🚨 Resposta da denúncia:', response);

      // Verifica se tem message com 'moderadores' (resposta de sucesso padrão do backend)
      if (response.message && response.message.includes('moderadores')) {
        Alert.alert(
          'Sucesso',
          response.message,
          [
            {
              text: 'OK',
              onPress: () => {
                setMotivo('');
                onClose();
              }
            }
          ]
        );
      } else if (response.success) {
        Alert.alert(
          'Sucesso', 
          response.message || 'Obrigado por denunciar! Nossos moderadores vão analisar o conteúdo dessa tarefa.',
          [
            {
              text: 'OK',
              onPress: () => {
                setMotivo('');
                onClose();
              }
            }
          ]
        );
      } else {
        console.log('❌ Denúncia não teve sucesso:', response.message);
        Alert.alert('Erro', response.message || 'Erro ao enviar denúncia');
      }

    } catch (error: any) {
      console.error('Erro ao enviar denúncia:', error);
      
      if (error.message?.includes('409')) {
        Alert.alert('Aviso', 'Você já denunciou esta tarefa anteriormente');
      } else {
        Alert.alert('Erro', 'Erro ao enviar denúncia. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMotivo('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              🚨 Denunciar Tarefa
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}>
              <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Info da Tarefa */}
            <View style={[styles.tarefaInfo, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.tarefaLabel, { color: theme.colors.textSecondary }]}>
                Tarefa:
              </Text>
              <Text style={[styles.tarefaTitulo, { color: theme.colors.text }]}>
                {tituloTarefa}
              </Text>
            </View>

            {/* Motivos Comuns */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Motivos comuns:
            </Text>
            <View style={styles.motivosContainer}>
              {motivosComuns.map((motivoComum) => (
                <TouchableOpacity
                  key={motivoComum}
                  style={[
                    styles.motivoButton,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: motivo === motivoComum ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                  onPress={() => selecionarMotivoComum(motivoComum)}
                  disabled={loading}>
                  <Text style={[
                    styles.motivoText,
                    { 
                      color: motivo === motivoComum ? theme.colors.primary : theme.colors.text
                    }
                  ]}>
                    {motivoComum}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Campo de Texto */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Descreva o problema:
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }
              ]}
              placeholder="Explique o motivo da denúncia (mínimo 3 palavras)..."
              placeholderTextColor={theme.colors.textSecondary}
              value={motivo}
              onChangeText={setMotivo}
              multiline={true}
              numberOfLines={6}
              maxLength={500}
              editable={!loading}
              scrollEnabled={true}
            />
            
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
              {motivo.length}/500 caracteres
            </Text>

          </ScrollView>

          {/* Footer com Botões */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={handleClose}
              disabled={loading}>
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                { 
                  backgroundColor: motivo.trim().length >= 5 ? theme.colors.error : theme.colors.border,
                  opacity: loading ? 0.7 : 1
                }
              ]}
              onPress={enviarDenuncia}
              disabled={motivo.trim().length < 5 || loading}>
              <Text style={styles.submitText}>
                {loading ? 'Enviando...' : '🚨 Denunciar'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  container: {
    width: '95%',
    maxWidth: 480,
    height: '85%',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingVertical: 24,
    paddingBottom: 30,
  },
  tarefaInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  tarefaLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tarefaTitulo: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  motivosContainer: {
    marginBottom: 24,
  },
  motivoButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  motivoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 180,
    maxHeight: 250,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 35,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModalDenuncia;