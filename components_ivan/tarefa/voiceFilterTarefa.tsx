import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { NativeModules, NativeEventEmitter } from 'react-native';

const { VoiceAssistant } = NativeModules;
const voiceEmitter = new NativeEventEmitter(VoiceAssistant);

interface VoiceFilterTarefaProps {
  visible: boolean;
  onClose: () => void;
  onFilter: (filtros: { palavras_chave?: string; termo_original?: string }) => void;
}

const VoiceFilterTarefa: React.FC<VoiceFilterTarefaProps> = ({ 
  visible, 
  onClose, 
  onFilter 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [step, setStep] = useState<'waiting' | 'listening' | 'processing'>('waiting');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Configurar listeners de voz
  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscriptions = [
      voiceEmitter.addListener('onVoiceStart', () => {
        console.log('🎤 Iniciando captura de voz para filtro...');
        setIsListening(true);
        setStep('listening');
        startPulseAnimation();
      }),
      voiceEmitter.addListener('onVoiceEnd', () => {
        console.log('🎤 Captura de voz finalizada para filtro');
        setIsListening(false);
        setStep('processing');
        stopPulseAnimation();
      }),
      voiceEmitter.addListener('onVoiceError', (error: string) => {
        console.log('❌ Erro de voz no filtro:', error);
        setIsListening(false);
        setStep('waiting');
        stopPulseAnimation();
        
        let errorMessage = error;
        let showRetryButton = true;
        
        // Personalizar mensagem baseada no tipo de erro
        if (error === 'Erro no cliente') {
          errorMessage = 'Erro no sistema de reconhecimento. Pode ser um problema de permissão ou conflito de áudio.';
        } else if (error === 'Sem permissão de microfone') {
          errorMessage = 'Permissão de microfone necessária. Vá nas configurações do app para ativar.';
          showRetryButton = false;
        } else if (error === 'Não entendi nada') {
          errorMessage = 'Não consegui ouvir nada. Fale mais alto e claro.';
        } else if (error === 'O sistema está ocupado') {
          errorMessage = 'Sistema de voz ocupado. Aguarde um momento e tente novamente.';
        }
        
        Alert.alert(
          'Erro de Voz', 
          errorMessage,
          showRetryButton ? [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tentar Novamente', onPress: () => {
              setTimeout(() => startListening(), 1000);
            }}
          ] : [{ text: 'OK' }]
        );
      }),
      voiceEmitter.addListener('onVoiceResults', (results: any) => {
        console.log('🎯 Resultados de voz para filtro:', results);
        handleVoiceResults(results);
      })
    ];

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, [visible]);

  // Iniciar fluxo quando modal é aberto
  useEffect(() => {
    if (visible) {
      startVoiceFilter();
    } else {
      resetFilter();
    }
  }, [visible]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startVoiceFilter = async () => {
    try {
      setStep('waiting');
      setCurrentQuestion('Fale apenas a palavra-chave para buscar');
      
      // 1️⃣ Primeiro parar qualquer TTS em andamento
      if (VoiceAssistant) {
        VoiceAssistant.stopSpeaking();
      }
      
      // 2️⃣ Aguardar um momento para garantir que o áudio está livre
      setTimeout(() => {
        // 3️⃣ Falar a instrução simplificada
        VoiceAssistant.speak('Fale a palavra-chave para buscar tarefas relacionadas');
        
        // 4️⃣ Aguardar o TTS terminar antes de iniciar a escuta
        setTimeout(() => {
          startListening();
        }, 6000); // Tempo menor já que a frase é mais curta
      }, 500);
      
    } catch (error) {
      console.error('Erro ao iniciar filtro de voz:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o filtro por voz');
      onClose();
    }
  };

  const handleVoiceResults = async (results: any) => {
    setIsProcessing(true);
    setStep('processing');
    
    try {
      const bestMatch = results.bestMatch?.trim();
      
      if (!bestMatch || bestMatch.length < 2) {
        VoiceAssistant.speak('Não consegui entender. Tente novamente.');
        setStep('waiting');
        setTimeout(() => startListening(), 1500);
        return;
      }

      // Normalizar a busca - converter para lowercase para busca case-insensitive
      const searchTerm = bestMatch.toLowerCase();
      
      console.log('🔍 Filtrando tarefas por:', bestMatch, '(normalizado:', searchTerm, ')');
      
      // Aplicar filtro com a palavra-chave capturada (normalizada) + termo original
      const filtros = {
        palavras_chave: searchTerm,        // Para busca case-insensitive
        termo_original: bestMatch          // Para mostrar no input com capitalização
      };

      VoiceAssistant.speak(`Buscando por: ${bestMatch}`);
      
      // Chamar callback para aplicar o filtro
      onFilter(filtros);
      
      // Fechar modal após aplicar filtro
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao processar filtro por voz:', error);
      VoiceAssistant.speak('Erro ao processar. Tente novamente.');
      setStep('waiting');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        console.log('🎤 Permissão de microfone:', granted ? 'CONCEDIDA' : 'NEGADA');
        return granted;
      } catch (error) {
        console.error('Erro ao verificar permissão de microfone:', error);
        return false;
      }
    }
    return true; // iOS não precisa verificar aqui
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permissão de Microfone',
            message: 'O app precisa acessar o microfone para reconhecimento de voz.',
            buttonPositive: 'Permitir'
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Erro ao solicitar permissão de microfone:', error);
        return false;
      }
    }
    return true; // iOS
  };

  const startListening = async () => {
    try {
      console.log('🎤 Tentando iniciar escuta...');
      
      // Verificar se o módulo está disponível
      if (!VoiceAssistant || !VoiceAssistant.startListening) {
        throw new Error('Módulo de voz não disponível');
      }

      // 1️⃣ Verificar permissão de microfone
      const hasPermission = await checkMicrophonePermission();
      
      if (!hasPermission) {
        console.log('⚠️ Permissão de microfone não concedida, solicitando...');
        
        const permissionGranted = await requestMicrophonePermission();
        
        if (!permissionGranted) {
          Alert.alert(
            'Permissão Necessária',
            'Para usar o filtro por voz, é necessário conceder permissão de microfone. Vá nas configurações do app e ative a permissão.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Configurações', onPress: () => {
                // Aqui você pode abrir as configurações do app se quiser
                onClose();
              }}
            ]
          );
          return;
        }
      }

      // 2️⃣ Certificar que não há TTS rodando
      VoiceAssistant.stopSpeaking();
      
      // 3️⃣ Aguardar um momento antes de iniciar a escuta
      setTimeout(() => {
        VoiceAssistant.startListening();
        setStep('listening');
        console.log('🎤 Escuta iniciada com sucesso');
      }, 300);
      
    } catch (error) {
      console.error('❌ Erro ao iniciar escuta:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o reconhecimento de voz. Tente novamente.');
      setStep('waiting');
    }
  };

  const resetFilter = () => {
    setStep('waiting');
    setIsListening(false);
    setIsProcessing(false);
    setCurrentQuestion('');
    stopPulseAnimation();
    
    // Parar qualquer operação de voz em andamento
    if (VoiceAssistant) {
      try {
        VoiceAssistant.stopListening();
        VoiceAssistant.stopSpeaking();
      } catch (error) {
        console.warn('Erro ao parar assistente de voz:', error);
      }
    }
  };

  const handleCancel = () => {
    resetFilter();
    onClose();
  };

  const getStatusText = () => {
    switch (step) {
      case 'listening':
        return 'Ouvindo...';
      case 'processing':
        return 'Processando...';
      default:
        return 'Aguardando...';
    }
  };

  const getStatusIcon = () => {
    switch (step) {
      case 'listening':
        return '🎤';
      case 'processing':
        return '⏳';
      default:
        return '🔍';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <Text style={styles.modalTitle}>Buscar Tarefas por Voz</Text>

          <View style={styles.voiceStatus}>
            <Animated.View 
              style={[
                styles.voiceIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Text style={styles.voiceIcon}>
                {getStatusIcon()}
              </Text>
            </Animated.View>

            <Text style={styles.statusText}>
              {getStatusText()}
            </Text>

            <Text style={styles.questionText}>
              {currentQuestion || 'Fale apenas a palavra-chave para buscar'}
            </Text>
          </View>

          {isProcessing && (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            {step === 'waiting' && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={startListening}
              >
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  voiceStatus: {
    alignItems: 'center',
    marginBottom: 30,
  },
  voiceIndicator: {
    marginBottom: 16,
  },
  voiceIcon: {
    fontSize: 60,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  questionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  loader: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default VoiceFilterTarefa;