import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
  Vibration
} from 'react-native';
import { NativeModules, NativeEventEmitter } from 'react-native';
import CadTarefa from './cadTarefa';
import { CriarTarefaInterface } from './tarefaMultiplaInterface';
import CategoriaInterface from '../categoria/categoriaInterface';
import { apiCall, getUserEmail, getUserId, getActiveWorkspaceId } from '../../services/authService';
import { useNavigation } from "@react-navigation/native";

const { VoiceAssistant } = NativeModules;
const voiceEmitter = new NativeEventEmitter(VoiceAssistant);

interface VoiceStep {
  step: number;
  field: string;
  question: string;
  validation?: (value: string) => boolean;
}

interface CadVoiceTarefaProps {
  onClose?: () => void;
}

const CadVoiceTarefa: React.FC<CadVoiceTarefaProps> = ({ onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(true); // Abrir automaticamente
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [voiceData, setVoiceData] = useState<Partial<CriarTarefaInterface>>({
    status: 'em_andamento', // Status padrão
    categorias_selecionadas: [] // Array vazio por padrão
  });
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaInterface[]>([]);
  const [workspaceAtual, setWorkspaceAtual] = useState<number>(1);
  const [userId, setUserId] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isAskingRecorrente, setIsAskingRecorrente] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation();


  // Fluxo sequencial de perguntas - ROTEIRO INTERATIVO
  const voiceSteps: VoiceStep[] = [
    {
      step: 1,
      field: 'titulo',
      question: 'Fale o título da tarefa para começarmos. Por exemplo: "Agendar consulta médica"'
    },
    {
      step: 2,
      field: 'descricao',
      question: 'Agora me fale a descrição desta tarefa. O que precisa ser feito exatamente?'
    },
    {
      step: 3,
      field: 'data_fim',
      question: 'Quer definir uma data limite? Se sim, fale a data no formato dia-mês-ano. Se não, diga "pular"'
    },
    {
      step: 4,
      field: 'prioridade',
      question: 'Qual a prioridade desta tarefa? Pode ser: baixa, média, alta ou urgente',
      validation: (value: string) => {
        const prioridades = ['baixa', 'media', 'média', 'alta', 'urgente'];
        return prioridades.some(p => value.toLowerCase().includes(p));
      }
    },
    {
      step: 5,
      field: 'recorrente',
      question: 'A tarefa é recorrente? Ou seja, deve se repetir periodicamente? Responda sim ou não'
    },
    {
      step: 6,
      field: 'recorrencia',
      question: 'Qual a frequência da recorrência? Pode ser: diária, semanal ou mensal'
    }
  ];

  // Mapeamentos para valores válidos
  const STATUS_MAP: { [key: string]: string } = {
    'a fazer': 'a_fazer',
    'fazer': 'a_fazer',
    'em andamento': 'em_andamento',
    'andamento': 'em_andamento',
    'concluído': 'concluido',
    'concluida': 'concluido',
    'pronto': 'concluido',
    'atrasada': 'atrasada',
    'atrasado': 'atrasada'
  };

  const PRIORIDADE_MAP: { [key: string]: string } = {
    'baixa': 'baixa',
    'baixo': 'baixa',
    'média': 'media',
    'medio': 'media',
    'alta': 'alta',
    'alto': 'alta',
    'urgente': 'urgente'
  };

  const RECORRENTE_MAP: { [key: string]: boolean } = {
    'sim': true,
    's': true,
    'yes': true,
    'não': false,
    'nao': false,
    'n': false,
    'no': false
  };

  const RECORRENCIA_MAP: { [key: string]: 'diaria' | 'semanal' | 'mensal' } = {
    'diária': 'diaria',
    'diaria': 'diaria',
    'semanal': 'semanal',
    'mensal': 'mensal'
  };

  // Buscar dados iniciais e iniciar fluxo automaticamente
  useEffect(() => {
    const inicializar = async () => {
      try {
        const [wsId, uId] = await Promise.all([
          getActiveWorkspaceId(),
          getUserId()
        ]);
        setWorkspaceAtual(wsId || 1);
        setUserId(uId || 1);
        
        // Buscar categorias
        const categorias = await apiCall(`/categorias/workspace/${wsId || 1}`, 'GET');
        setCategoriasDisponiveis(categorias);
        
        // Iniciar fluxo automaticamente após inicialização
        // Aumentar delay para garantir que o módulo de voz está pronto
        setTimeout(() => {
          console.log('🎆 Iniciando fluxo de voz automaticamente...');
          startVoiceFlow();
        }, 2000);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      }
    };
    inicializar();
  }, []);

  // Configurar listeners de voz
  useEffect(() => {
    const subscriptions = [
      voiceEmitter.addListener('onVoiceStart', () => {
        console.log('🎤 Iniciando captura de voz...');
        setIsListening(true);
        startPulseAnimation();
      }),
      voiceEmitter.addListener('onVoiceEnd', () => {
        console.log('🎤 Captura de voz finalizada');
        setIsListening(false);
        stopPulseAnimation();
      }),
      voiceEmitter.addListener('onVoiceError', (error: string) => {
        console.log('❌ ERRO DE VOZ DETALHADO:', {
          error: error,
          currentStep: currentStep,
          isListening: isListening,
          isProcessing: isProcessing,
          timestamp: new Date().toISOString()
        });
        
        setIsListening(false);
        setIsProcessing(false);
        stopPulseAnimation();
        
        // Não mostrar alert automaticamente para não interromper o fluxo
        // O timeout vai lidar com a repetição
      }),
      voiceEmitter.addListener('onVoiceResults', (results: any) => {
        console.log('🎯 Resultados de voz:', results);
        handleVoiceResults(results);
      })
    ];

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, [currentStep, voiceData, isAskingRecorrente]);

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

  const startVoiceFlow = async () => {
    try {
      console.log('🎆 Iniciando fluxo de voz...');
      
      // Verificar se o módulo está disponível antes de começar
      if (!VoiceAssistant) {
        console.error('❌ VoiceAssistant não disponível no startVoiceFlow');
        Alert.alert('Erro', 'Módulo de voz não está pronto');
        return;
      }
      
      setShowVoiceModal(true);
      setCurrentStep(0);
      setVoiceData({
        id_workspace: workspaceAtual,
        id_usuario: userId,
        status: 'a_fazer',
        prioridade: 'media',
        recorrente: false
      });
      
      // Falar introdução e iniciar primeira pergunta
      console.log('🗣️ Falando introdução...');
      VoiceAssistant.speak('Vamos criar uma tarefa!');
      
      // Aguardar menos tempo e iniciar primeira pergunta
      setTimeout(async () => {
        console.log('🎯 Introdução finalizada, iniciando primeira pergunta...');
        await nextStep();
      }, 6000);
    } catch (error) {
      console.error('Erro ao iniciar fluxo de voz:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o assistente de voz');
    }
  };

  const nextStep = async () => {
    try {
      if (currentStep < voiceSteps.length) {
        const nextStepIndex = currentStep;
        console.log(`🔄 NextStep chamado - CurrentStep: ${currentStep}, NextStepIndex: ${nextStepIndex}`);
        setCurrentStep(nextStepIndex + 1);
        
        const step = voiceSteps[nextStepIndex];
        if (!step) {
          console.error('❌ Step não encontrado no índice:', nextStepIndex);
          return;
        }
        console.log(`📝 Processando step ${step.step} - Field: ${step.field}`);
        setCurrentQuestion(step.question || '');
      
        // Aguardar mais tempo antes de fazer a pergunta para melhor fluxo
        setTimeout(async () => {
          // Verificar se devemos pular este step baseado em dados anteriores
          if (step.field === 'recorrencia' && voiceData.recorrente === false) {
            console.log('🚫 Pulando pergunta de frequência pois usuário disse que não é recorrente');
            // Como recorrencia é o último step, finalizar o fluxo
            console.log('🎉 Fluxo de voz finalizado! Criando tarefa...');
            VoiceAssistant.speak('Perfeito! Vou criar sua tarefa agora.');
            setTimeout(() => {
              cadastrarTarefa();
            }, 3000);
            return;
          }        // Casos especiais que precisam de tratamento diferente
        if (step.field === 'recorrente') {
          setIsAskingRecorrente(true);
          console.log(`🎙️ Fazendo pergunta de recorrência: ${step.question}`);
          VoiceAssistant.speak(step.question);
          setTimeout(() => {
            console.log('🎧 Iniciando escuta para recorrência...');
            startListening();
          }, 8000);
        } else if (step.field === 'titulo') {
          // Primeira pergunta (título)
          console.log(`🎙️ Fazendo primeira pergunta: ${step.question}`);
          VoiceAssistant.speak(step.question);
          setTimeout(() => {
            console.log('🎧 Iniciando escuta para título...');
            startListening();
          }, 8000);
        } else {
          console.log(`🎙️ Fazendo pergunta: ${step.question}`);
          VoiceAssistant.speak(step.question);
          setTimeout(() => {
            console.log(`🎧 Iniciando escuta para ${step.field}...`);
            startListening();
          }, step.field === 'data_fim' ? 9000 : 7000); // Mais tempo para data
        }
        }, 2000); // Menos tempo entre perguntas
      } else {
        // Fluxo finalizado, criar tarefa automaticamente
        console.log('🎉 Fluxo de voz finalizado! Criando tarefa...');
        VoiceAssistant.speak('Perfeito! Vou criar sua tarefa agora.');
        setTimeout(() => {
          finalizarCadastro();
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Erro no nextStep:', error);
    }
  };



  const handleVoiceResults = async (results: any) => {
    console.log('🗣️ Resultado de voz recebido:', results);
    
    setIsListening(false); // Parar indicação de escuta
    setIsProcessing(true);
    
    if (!results || !results.bestMatch) {
      console.error('❌ Resultado de voz inválido:', results);
      setIsProcessing(false);
      return;
    }
    
    const bestMatch = results.bestMatch.toLowerCase().trim();
    console.log('🎯 Melhor correspondência:', bestMatch);
    
    // Pequena pausa para processar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const currentStepData = voiceSteps[currentStep - 1];
      
      if (isAskingRecorrente) {
        await handleRecorrenteResponse(bestMatch);
      } else {
        await handleRegularStepResponse(currentStepData, bestMatch);
      }
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      VoiceAssistant.speak('Desculpe, não entendi. Vou repetir a pergunta.');
      setTimeout(async () => {
        setIsProcessing(false);
        await startListening();
      }, 11000);
    } finally {
      // Garantir que sempre limpe o processamento
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleRegularStepResponse = async (step: VoiceStep, response: string) => {
    let value = response;
    let isValid = true;

    // Validações específicas
    if (step.validation && !step.validation(response)) {
      VoiceAssistant.speak('Valor inválido. Por favor, responda com uma das opções informadas.');
      setTimeout(async () => {
        setIsProcessing(false);
        await startListening();
      }, 11000);
      return;
    }

    // Processar cada tipo de campo
    switch (step.field) {
      case 'titulo':
        setVoiceData(prev => ({ ...prev, titulo: value }));
        VoiceAssistant.speak(`Ótimo! Título "${value}" foi salvo.`);
        // Pausa antes da próxima pergunta
        setTimeout(() => {
          console.log('✅ Título salvo, avançando para descrição...');
          nextStep();
        }, 4000);
        return;

      case 'descricao':
        setVoiceData(prev => ({ ...prev, descricao: value }));
        VoiceAssistant.speak('Descrição salva com sucesso.');
        // Pausa antes da próxima pergunta
        setTimeout(() => {
          console.log('✅ Descrição salva, avançando para prazo...');
          nextStep();
        }, 4000);
        return;

      case 'data_fim':
        if (value.includes('pular') || value.includes('não') || value.includes('nao')) {
          setVoiceData(prev => ({ ...prev, data_fim: undefined }));
          VoiceAssistant.speak('Perfeito! Tarefa sem prazo definido.');
          setTimeout(() => {
            console.log('✅ Data pulada, avançando...');
            nextStep();
          }, 3500);
          return;
        }
        
        const dataConvertida = convertSpeechToDate(value);
        if (!dataConvertida) {
          VoiceAssistant.speak('Não consegui entender a data. Por favor, fale novamente no formato dia, mês e ano.');
          setTimeout(async () => {
            setIsProcessing(false);
            await startListening();
          }, 11000);
          return;
        }
        setVoiceData(prev => ({ ...prev, data_fim: dataConvertida }));
        VoiceAssistant.speak('Prazo definido.');
        setTimeout(() => {
          console.log('✅ Data salva, avançando...');
          nextStep();
        }, 3500);
        return;

      case 'recorrencia':
        const recorrencia = RECORRENCIA_MAP[value];
        if (!recorrencia) {
          VoiceAssistant.speak('Por favor, escolha entre: diária, semanal ou mensal.');
          setTimeout(async () => {
            setIsProcessing(false);
            await startListening();
          }, 11000);
          return;
        }
        setVoiceData(prev => ({ ...prev, recorrencia }));
        VoiceAssistant.speak(`Frequência ${recorrencia} definida.`);
        setTimeout(() => {
          console.log('✅ Frequência salva, avançando...');
          nextStep();
        }, 3500);
        return;

      case 'status':
        const status = STATUS_MAP[value] as 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
        setVoiceData(prev => ({ ...prev, status }));
        VoiceAssistant.speak('Status definido.');
        setTimeout(() => {
          console.log('✅ Status salvo, avançando...');
          nextStep();
        }, 3500);
        return;

      case 'prioridade':
        const prioridade = PRIORIDADE_MAP[value] as 'baixa' | 'media' | 'alta' | 'urgente';
        setVoiceData(prev => ({ ...prev, prioridade }));
        VoiceAssistant.speak('Prioridade definida.');
        setTimeout(() => {
          console.log('✅ Prioridade salva, avançando...');
          nextStep();
        }, 3500);
        return;
    }

    // Não avançar automaticamente - cada case controla sua própria transição
    console.log(`✅ Processamento de ${step.field} concluído`);
  };



  const handleRecorrenteResponse = async (response: string) => {
    const recorrente = RECORRENTE_MAP[response];
    if (recorrente === undefined) {
      VoiceAssistant.speak('Por favor, responda sim ou não.');
      setTimeout(async () => {
        setIsProcessing(false);
        await startListening();
      }, 11000);
      return;
    }

    setVoiceData(prev => ({ 
      ...prev, 
      recorrente
    }));

    if (recorrente) {
      VoiceAssistant.speak('Tarefa definida como recorrente. Agora vou perguntar a frequência.');
      setTimeout(() => {
        console.log('✅ Tarefa recorrente configurada, avançando para frequência...');
        setIsAskingRecorrente(false);
        nextStep();
      }, 4000);
    } else {
      VoiceAssistant.speak('Tarefa definida como não recorrente. Finalizando...');
      setTimeout(() => {
        console.log('✅ Tarefa não recorrente configurada, finalizando fluxo...');
        setIsAskingRecorrente(false);
        // Como não é recorrente, finalizar o fluxo e criar a tarefa
        console.log('🎉 Fluxo de voz finalizado! Criando tarefa...');
        VoiceAssistant.speak('Perfeito! Vou criar sua tarefa agora.');
        setTimeout(() => {
          finalizarCadastro();
        }, 3000);
      }, 5000);
    }
  };



  const convertSpeechToDate = (speech: string): string | null => {
    try {
      // Mapeamento de meses
      const meses: { [key: string]: number } = {
        'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
        'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
        'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
      };

      // Extrair números e palavras
      const words = speech.split(' ');
      let dia, mes, ano;

      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase();
        
        // Verificar se é dia
        if (!dia && !isNaN(parseInt(word, 10))) { // Adicionado radix 10
          const num = parseInt(word, 10); // Adicionado radix 10
          if (num >= 1 && num <= 31) {
            dia = num;
          }
        }
        
        // Verificar se é mês
        if (!mes && meses[word]) {
          mes = meses[word];
        }
        
        // Verificar se é ano (4 dígitos)
        if (!ano && word.length === 4 && !isNaN(parseInt(word, 10))) { // Adicionado radix 10
          const num = parseInt(word, 10); // Adicionado radix 10
          if (num >= 2000 && num <= 2100) {
            ano = num;
          }
        }
      }

      // Se não encontrou ano, usar ano atual
      if (!ano) {
        ano = new Date().getFullYear();
      }

      if (dia && mes && ano) {
        // Criar data no formato YYYY-MM-DDT23:59:00.000Z
        const data = new Date(ano, mes - 1, dia, 23, 59, 0);
        return data.toISOString();
      }

      return null;
    } catch (error) {
      console.error('Erro ao converter data:', error);
      return null;
    }
  };

  // Correções e melhorias no fluxo de criação de tarefas por voz

  // Adicionado tratamento para garantir que todos os campos obrigatórios sejam preenchidos antes de enviar a tarefa para a API.
  // Correção do erro de tipo para o campo `data_fim`
  const finalizarCadastro = async () => {
    try {
      VoiceAssistant.speak('Excelente! Agora vou processar a criação da sua tarefa. Aguarde um momento...');

      // Garantir que todos os campos obrigatórios estão preenchidos
      if (!voiceData.titulo || !voiceData.status || !voiceData.prioridade) {
        VoiceAssistant.speak('Ops! Preciso que você forneça pelo menos o título, status e prioridade da tarefa.');
        Alert.alert('Erro', 'Título, status e prioridade são obrigatórios.');
        return;
      }

      const tarefaCompleta: CriarTarefaInterface = {
        titulo: voiceData.titulo,
        descricao: voiceData.descricao,
        data_fim: voiceData.data_fim,
        status: voiceData.status,
        prioridade: voiceData.prioridade,
        recorrente: voiceData.recorrente || false,
        recorrencia: voiceData.recorrencia,
        id_workspace: voiceData.id_workspace || workspaceAtual,
        id_usuario: voiceData.id_usuario || userId,
        categorias_selecionadas: voiceData.categorias_selecionadas || []
      };

      // Enviar tarefa para a API
      const response = await apiCall('/tarefas', 'POST', tarefaCompleta);

      // Se chegou até aqui, a tarefa foi criada com sucesso (response existe)
      if (response) {
        console.log('✅ Tarefa criada com sucesso:', response);
        VoiceAssistant.speak(`Parabéns! A tarefa "${voiceData.titulo}" foi criada com sucesso! Você pode encontrá-la na sua lista de tarefas.`);
        setTimeout(() => {
          Alert.alert('Sucesso', 'Tarefa criada por voz com sucesso!');
          setShowVoiceModal(false);
          resetVoiceFlow();
          if (onClose) {
            onClose();
          }
        }, 6000);
      } else {
        throw new Error('Resposta vazia da API');
      }
    } catch (error) {
      console.error('Erro ao finalizar cadastro:', error);
      VoiceAssistant.speak('Desculpe, houve um erro ao criar a tarefa. Vou tentar novamente ou você pode criar manualmente.');
      Alert.alert('Erro', 'Não foi possível criar a tarefa');
    }
  };

  // Garantir que o módulo VoiceAssistant está integrado corretamente
  useEffect(() => {
    console.log('🔍 Verificando módulo VoiceAssistant...');
    
    if (!VoiceAssistant) {
      console.error('❌ Módulo VoiceAssistant não encontrado');
      Alert.alert('Erro', 'Módulo de assistente de voz não encontrado.');
    } else {
      console.log('✅ Módulo VoiceAssistant disponível');
      
      // Verificar métodos disponíveis
      console.log('🔧 Métodos VoiceAssistant:', {
        startListening: typeof VoiceAssistant.startListening,
        stopListening: typeof VoiceAssistant.stopListening,
        speak: typeof VoiceAssistant.speak,
        stopSpeaking: typeof VoiceAssistant.stopSpeaking
      });
    }
  }, []);

  const resetVoiceFlow = () => {
    setCurrentStep(0);
    setVoiceData({
      status: 'em_andamento',
      categorias_selecionadas: []
    });
    setIsAskingRecorrente(false);
    setCurrentQuestion('');
    setIsListening(false);
    stopPulseAnimation();
  };

  const startListening = async () => {
    try {
      console.log('🎤 Tentando iniciar escuta...');
      
      // Verificar se VoiceAssistant está disponível
      if (!VoiceAssistant) {
        console.error('❌ VoiceAssistant não disponível');
        Alert.alert('Erro', 'Módulo de voz não disponível');
        return;
      }

      // Verificar se já está ouvindo
      if (isListening) {
        console.log('⚠️ Já está ouvindo, ignorando nova solicitação');
        return;
      }

      // Verificar se está processando
      if (isProcessing) {
        console.log('⚠️ Ainda processando resposta anterior, aguardando...');
        return;
      }

      console.log('🛑 Garantindo que não há fala ativa...');
      
      // Parar qualquer fala antes de começar a escutar
      try {
        VoiceAssistant.stopSpeaking();
      } catch (stopError) {
        console.log('⚠️ Erro ao parar fala (pode não estar falando):', stopError);
      }
      
      // Delay maior para garantir que a fala parou completamente
      setTimeout(() => {
        try {
          console.log('🎤 Iniciando captura de áudio...');
          setIsListening(true);
          VoiceAssistant.startListening();
          console.log('✅ StartListening chamado com sucesso');
        } catch (innerError) {
          console.error('❌ Erro interno ao iniciar escuta:', innerError);
          setIsListening(false);
        }
      }, 1500); // Aumentei para 1.5s para garantir
      
    } catch (error) {
      console.error('❌ Erro ao iniciar escuta:', error);
      setIsListening(false);
      Alert.alert('Erro', 'Não foi possível iniciar o reconhecimento de voz');
    }
  };

  const stopVoiceFlow = () => {
    try {
      console.log('🛑 Parando fluxo de voz...');
      
      if (VoiceAssistant) {
        VoiceAssistant.stopListening();
        VoiceAssistant.stopSpeaking();
      }
      
      setIsListening(false);
      setIsProcessing(false);
      setShowVoiceModal(false);
      resetVoiceFlow();
      
      console.log('✅ Fluxo de voz parado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao parar fluxo de voz:', error);
    }
  };

  return (
    <Modal
    visible={showVoiceModal}
    transparent
    animationType="slide"
    onRequestClose={stopVoiceFlow}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        
        <Text style={styles.modalTitle}>🎤 Criar Tarefa por Voz</Text>

        <View style={styles.voiceStatus}>
          <Animated.View 
            style={[
              styles.voiceIndicator,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Text style={styles.voiceIcon}>
              {isListening ? '🎤' : (isProcessing ? '⏳' : '🤖')}
            </Text>
          </Animated.View>

          <Text style={styles.statusText}>
            {isListening ? 'Ouvindo sua resposta...' : 
             isProcessing ? 'Processando...' : 'Aguarde a pergunta...'}
          </Text>

          {currentQuestion && (
            <Text style={styles.questionText}>{currentQuestion}</Text>
          )}

          <Text style={styles.progressText}>
            Passo {currentStep} de {voiceSteps.length}
          </Text>
          
          {/* Mostrar dados coletados */}
          {voiceData.titulo && (
            <View style={styles.dataContainer}>
              <Text style={styles.dataText}>✓ Título: {voiceData.titulo}</Text>
              {voiceData.descricao && <Text style={styles.dataText}>✓ Descrição: {voiceData.descricao}</Text>}
              {voiceData.data_fim && <Text style={styles.dataText}>✓ Prazo definido</Text>}
              {voiceData.status && <Text style={styles.dataText}>✓ Status: {voiceData.status}</Text>}
            </View>
          )}
        </View>

        {isProcessing && (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={stopVoiceFlow}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          {!isListening && !isProcessing && currentStep > 0 && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={startListening}
            >
              <Text style={styles.retryButtonText}>Repetir Pergunta</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  voiceButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  voiceButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    width: '90%',
    maxWidth: 420,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  voiceStatus: {
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
  },
  voiceIndicator: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  voiceIcon: {
    fontSize: 35,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 15,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  progressText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  dataContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginTop: 15,
  },
  dataText: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 5,
    fontWeight: '500',
  },
  loader: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  cancelButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CadVoiceTarefa;