import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import { useIcons } from '../icons/IconContext';
import { getPontosUsuario, comprarItemLojinha } from '../../services/authService';
import { ThemeType } from '../theme/ThemeContext';

type LojinhaScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Lojinha'>;

type Props = {
  navigation: LojinhaScreenNavigationProp;
};

interface LojaItem {
  id: string;
  nome: string;
  preco: number;
  icone: string;
  tipo: 'avatar' | 'tema' | 'icone';
  categoria?: 'workspace' | 'membros' | 'usuario' | 'metricas';  
  descricao: string;
  themeType?: ThemeType;
  isUnlocked?: boolean;
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pontosContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pontosText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoContainer: {
    padding: 16,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  secaoContainer: {
    marginBottom: 24,
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemIcon: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemDescricao: {
    fontSize: 14,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTipo: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  precoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 32,
  },
  unlockedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

const LojinhaScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, unlockTheme } = useTheme();
  const { getAllIcons, unlockIcon, isIconUnlocked } = useIcons();
  const [pontos, setPontos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    carregarPontos();
  }, []);

  const carregarPontos = async () => {
    try {
      const pontosUsuario = await getPontosUsuario();
      setPontos(pontosUsuario);
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Converter ícones do contexto para itens da loja
  const iconItems = getAllIcons();
  const itensLoja: LojaItem[] = [
    // Ícones do contexto (convertidos para formato da loja)
    ...iconItems
      .filter(icon => icon.preco > 0) // Apenas ícones pagos
      .map(icon => ({
        id: icon.id,
        nome: icon.nome,
        preco: icon.preco,
        icone: icon.emoji,
        tipo: 'icone' as const,
        categoria: icon.cardType,
        descricao: icon.descricao,
        isUnlocked: isIconUnlocked(icon.id),
      })),
    
    // Temas
    {
      id: 'tema_trello',
      nome: 'Tema Trello',
      preco: 3.60,
      icone: '📋',
      tipo: 'tema',
      themeType: 'trello' as ThemeType,
      descricao: 'Tema inspirado no design do Trello'
    },
    {
      id: 'tema_noiton1',
      nome: 'Tema Noiton 1.0',
      preco: 10.00,
      icone: '🌟',
      tipo: 'tema',
      themeType: 'noiton1' as ThemeType,
      descricao: 'Tema premium da versão original do Noiton'
    },
  ];

  const comprarItem = async (item: LojaItem) => {
    // Verificar se já foi comprado
    if (item.isUnlocked && item.tipo === 'icone') {
      Alert.alert('Item já adquirido', 'Você já possui este ícone!');
      return;
    }

    if (pontos < item.preco) {
      Alert.alert(
        'Pontos Insuficientes',
        `Você precisa de P ${item.preco.toFixed(2)} para comprar este item. Você tem apenas P ${pontos.toFixed(2)}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirmar Compra',
      `Deseja comprar "${item.nome}" por P ${item.preco.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: async () => {
            try {
              const sucesso = await comprarItemLojinha(item.preco);
              
              if (sucesso) {
                // Se for um tema, desbloquear no sistema de temas
                if (item.tipo === 'tema' && item.themeType) {
                  try {
                    await unlockTheme(item.themeType);
                  } catch (unlockError) {
                    console.error('Erro ao desbloquear tema:', unlockError);
                  }
                }
                
                // Se for um ícone, desbloquear no sistema de ícones
                if (item.tipo === 'icone') {
                  try {
                    await unlockIcon(item.id);
                  } catch (unlockError) {
                    console.error('Erro ao desbloquear ícone:', unlockError);
                  }
                }
                
                // Recarregar pontos do backend após compra
                await carregarPontos();
                Alert.alert(
                  'Compra Realizada! 🎉',
                  `"${item.nome}" foi adicionado ao seu inventário!${
                    item.tipo === 'tema' 
                      ? '\n\nO tema foi desbloqueado e pode ser usado no seletor de temas!' 
                      : item.tipo === 'icone'
                      ? '\n\nO ícone foi desbloqueado! Configure nos cards através do menu de configurações.'
                      : ''
                  }\n\nP ${item.preco.toFixed(2)} foram debitados da sua conta.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Erro', 'Não foi possível processar a compra.');
              }
            } catch (error) {
              Alert.alert('Erro', 'Erro ao processar compra.');
            }
          }
        }
      ]
    );
  };

  const renderItem = (item: LojaItem) => {
    // Definir cor do container baseado no tipo e categoria
    let containerColor = theme.colors.info + '20';
    let textColor = theme.colors.info;
    let tipoLabel = '🎨 Tema';

    if (item.tipo === 'avatar') {
      containerColor = theme.colors.primary + '20';
      textColor = theme.colors.primary;
      tipoLabel = '👤 Avatar';
    } else if (item.tipo === 'icone') {
      switch (item.categoria) {
        case 'workspace':
          containerColor = theme.colors.primary + '20';
          textColor = theme.colors.primary;
          tipoLabel = '🏢 Workspace';
          break;
        case 'membros':
          containerColor = theme.colors.success + '20';
          textColor = theme.colors.success;
          tipoLabel = '👥 Membros';
          break;
        case 'usuario':
          containerColor = theme.colors.error + '20';
          textColor = theme.colors.error;
          tipoLabel = '👤 Usuário';
          break;
        case 'metricas':
          containerColor = theme.colors.info + '20';
          textColor = theme.colors.info;
          tipoLabel = '📊 Métricas';
          break;
      }
    }

    // Verificar se está desbloqueado
    const isUnlocked = item.isUnlocked || (item.tipo === 'icone' && isIconUnlocked(item.id));

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.itemCard, 
          { 
            backgroundColor: theme.colors.surface,
            opacity: isUnlocked ? 0.7 : 1.0
          }
        ]}
        onPress={() => comprarItem(item)}
        activeOpacity={0.7}
        disabled={isUnlocked}
      >
        <View style={styles.itemContent}>
          <View style={[
            styles.itemIconContainer,
            { backgroundColor: containerColor }
          ]}>
            <Text style={styles.itemIcon}>{item.icone}</Text>
            {isUnlocked && (
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedText}>✓</Text>
              </View>
            )}
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={[styles.itemNome, { color: theme.colors.text }]}>
              {item.nome} {isUnlocked ? '✓' : ''}
            </Text>
            <Text style={[styles.itemDescricao, { color: theme.colors.textSecondary }]}>
              {item.descricao}
              {isUnlocked ? ' (Já adquirido)' : ''}
            </Text>
            <View style={styles.itemFooter}>
              <View style={styles.tipoContainer}>
                <Text style={[
                  styles.itemTipo,
                  { 
                    color: textColor,
                    backgroundColor: containerColor
                  }
                ]}>
                  {tipoLabel}
                </Text>
              </View>
              <View style={[
                styles.precoContainer, 
                { 
                  backgroundColor: isUnlocked 
                    ? theme.colors.success + '20' 
                    : theme.colors.warning + '20' 
                }
              ]}>
                <Text style={[
                  styles.itemPreco, 
                  { 
                    color: isUnlocked 
                      ? theme.colors.success 
                      : theme.colors.warning 
                  }
                ]}>
                  {isUnlocked ? 'COMPRADO' : `P ${item.preco.toFixed(2)}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← Voltar</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>🏪 Lojinha</Text>
        
        <View style={[styles.pontosContainer, { backgroundColor: theme.colors.warning + '20' }]}>
          <Text style={[styles.pontosText, { color: theme.colors.warning }]}>
            P {loading ? '0.00' : pontos.toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoContainer}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            💡 Como ganhar pontos?
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            • Complete tarefas dentro do prazo: +0.5 pontos{'\n'}{'\n'}
            💡 Dica: Foque em completar tarefas no prazo!
          </Text>
        </View>

        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            👤 Ícones do Usuário
          </Text>
          {itensLoja.filter(item => item.tipo === 'icone' && item.categoria === 'usuario').map(renderItem)}
        </View>

        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            🏢 Ícones do Workspace
          </Text>
          {itensLoja.filter(item => item.tipo === 'icone' && item.categoria === 'workspace').map(renderItem)}
        </View>

        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            👥 Ícones dos Membros
          </Text>
          {itensLoja.filter(item => item.tipo === 'icone' && item.categoria === 'membros').map(renderItem)}
        </View>

        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            📊 Ícones das Métricas
          </Text>
          {itensLoja.filter(item => item.tipo === 'icone' && item.categoria === 'metricas').map(renderItem)}
        </View>

        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            🎨 Temas
          </Text>
          {itensLoja.filter(item => item.tipo === 'tema').map(renderItem)}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default LojinhaScreen;