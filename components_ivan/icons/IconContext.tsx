import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CardType = 'usuario' | 'workspace' | 'membros' | 'metricas';

export interface IconItem {
  id: string;
  emoji: string;
  nome: string;
  preco: number;
  cardType: CardType;
  descricao: string;
}

interface IconContextType {
  // Estados
  unlockedIcons: string[];
  activeIcons: Record<CardType, string>;
  
  // Funções
  unlockIcon: (iconId: string) => Promise<void>;
  setActiveIcon: (cardType: CardType, iconId: string) => Promise<void>;
  getActiveIcon: (cardType: CardType) => string;
  isIconUnlocked: (iconId: string) => boolean;
  getAvailableIcons: (cardType: CardType) => IconItem[];
  getAllIcons: () => IconItem[];
}

const IconContext = createContext<IconContextType | undefined>(undefined);

// Ícones disponíveis para cada card
const AVAILABLE_ICONS: IconItem[] = [
  // Ícones do Card Usuário
  {
    id: 'user_default',
    emoji: '👤',
    nome: 'Usuário Padrão',
    preco: 0,
    cardType: 'usuario',
    descricao: 'Ícone padrão gratuito'
  },
  {
    id: 'user_man',
    emoji: '👨',
    nome: 'Homem',
    preco: 1.50,
    cardType: 'usuario',
    descricao: 'Avatar masculino'
  },
  {
    id: 'user_woman',
    emoji: '👩',
    nome: 'Mulher',
    preco: 1.50,
    cardType: 'usuario',
    descricao: 'Avatar feminino'
  },
  {
    id: 'user_crown',
    emoji: '👑',
    nome: 'Coroa Real',
    preco: 4.50,
    cardType: 'usuario',
    descricao: 'Ícone premium VIP'
  },
  {
    id: 'user_diamond',
    emoji: '💎',
    nome: 'Diamante',
    preco: 3.25,
    cardType: 'usuario',
    descricao: 'Ícone precioso'
  },

  // Ícones do Card Workspace
  {
    id: 'workspace_default',
    emoji: '🏢',
    nome: 'Empresa Padrão',
    preco: 0,
    cardType: 'workspace',
    descricao: 'Ícone padrão gratuito'
  },
  {
    id: 'workspace_briefcase',
    emoji: '💼',
    nome: 'Maleta',
    preco: 2.00,
    cardType: 'workspace',
    descricao: 'Ícone profissional'
  },
  {
    id: 'workspace_home',
    emoji: '🏠',
    nome: 'Casa',
    preco: 1.75,
    cardType: 'workspace',
    descricao: 'Workspace pessoal'
  },
  {
    id: 'workspace_rocket',
    emoji: '🚀',
    nome: 'Foguete',
    preco: 3.50,
    cardType: 'workspace',
    descricao: 'Startup inovadora'
  },
  {
    id: 'workspace_star',
    emoji: '⭐',
    nome: 'Estrela',
    preco: 2.75,
    cardType: 'workspace',
    descricao: 'Workspace de destaque'
  },

  // Ícones do Card Membros
  {
    id: 'members_default',
    emoji: '👥',
    nome: 'Equipe Padrão',
    preco: 0,
    cardType: 'membros',
    descricao: 'Ícone padrão gratuito'
  },
  {
    id: 'members_family',
    emoji: '👨‍👩‍👧‍👦',
    nome: 'Família',
    preco: 3.25,
    cardType: 'membros',
    descricao: 'Equipe familiar'
  },
  {
    id: 'members_handshake',
    emoji: '🤝',
    nome: 'Aperto de Mão',
    preco: 2.50,
    cardType: 'membros',
    descricao: 'Parceria e colaboração'
  },
  {
    id: 'members_team',
    emoji: '👨‍💼👩‍💼',
    nome: 'Equipe Profissional',
    preco: 4.00,
    cardType: 'membros',
    descricao: 'Time de negócios'
  },
  {
    id: 'members_network',
    emoji: '🌐',
    nome: 'Rede Global',
    preco: 3.75,
    cardType: 'membros',
    descricao: 'Equipe internacional'
  },

  // Ícones do Card Métricas
  {
    id: 'metrics_default',
    emoji: '📊',
    nome: 'Gráfico Padrão',
    preco: 0,
    cardType: 'metricas',
    descricao: 'Ícone padrão gratuito'
  },
  {
    id: 'metrics_chart_up',
    emoji: '📈',
    nome: 'Gráfico Crescente',
    preco: 2.25,
    cardType: 'metricas',
    descricao: 'Crescimento positivo'
  },
  {
    id: 'metrics_chart_down',
    emoji: '📉',
    nome: 'Gráfico Decrescente',
    preco: 2.25,
    cardType: 'metricas',
    descricao: 'Análise de tendência'
  },
  {
    id: 'metrics_target',
    emoji: '🎯',
    nome: 'Alvo',
    preco: 4.10,
    cardType: 'metricas',
    descricao: 'Foco em objetivos'
  },
  {
    id: 'metrics_trophy',
    emoji: '🏆',
    nome: 'Troféu',
    preco: 3.90,
    cardType: 'metricas',
    descricao: 'Conquistas e metas'
  },
];

const STORAGE_KEYS = {
  UNLOCKED_ICONS: 'unlocked_icons',
  ACTIVE_ICONS: 'active_icons',
};

interface IconProviderProps {
  children: ReactNode;
}

export const IconProvider: React.FC<IconProviderProps> = ({ children }) => {
  const [unlockedIcons, setUnlockedIcons] = useState<string[]>([]);
  const [activeIcons, setActiveIconsState] = useState<Record<CardType, string>>({
    usuario: 'user_default',
    workspace: 'workspace_default',
    membros: 'members_default',
    metricas: 'metrics_default',
  });

  // Carregar dados salvos na inicialização
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      // Carregar ícones desbloqueados
      const savedUnlockedIcons = await AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED_ICONS);
      if (savedUnlockedIcons) {
        const unlockedList = JSON.parse(savedUnlockedIcons);
        setUnlockedIcons(unlockedList);
      } else {
        // Primeira vez: desbloquear ícones padrão gratuitos
        const defaultIcons = ['user_default', 'workspace_default', 'members_default', 'metrics_default'];
        setUnlockedIcons(defaultIcons);
        await AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED_ICONS, JSON.stringify(defaultIcons));
      }

      // Carregar ícones ativos
      const savedActiveIcons = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_ICONS);
      if (savedActiveIcons) {
        const activeIconsData = JSON.parse(savedActiveIcons);
        setActiveIconsState(activeIconsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos ícones:', error);
      // Em caso de erro, usar valores padrão
      const defaultIcons = ['user_default', 'workspace_default', 'members_default', 'metrics_default'];
      setUnlockedIcons(defaultIcons);
    }
  };

  const unlockIcon = async (iconId: string): Promise<void> => {
    try {
      if (!unlockedIcons.includes(iconId)) {
        const newUnlockedIcons = [...unlockedIcons, iconId];
        setUnlockedIcons(newUnlockedIcons);
        await AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED_ICONS, JSON.stringify(newUnlockedIcons));
      }
    } catch (error) {
      console.error('Erro ao desbloquear ícone:', error);
      throw error;
    }
  };

  const setActiveIcon = async (cardType: CardType, iconId: string): Promise<void> => {
    try {
      // Verificar se o ícone está desbloqueado
      if (!unlockedIcons.includes(iconId)) {
        throw new Error('Ícone não desbloqueado');
      }

      const newActiveIcons = { ...activeIcons, [cardType]: iconId };
      setActiveIconsState(newActiveIcons);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_ICONS, JSON.stringify(newActiveIcons));
    } catch (error) {
      console.error('Erro ao definir ícone ativo:', error);
      throw error;
    }
  };

  const getActiveIcon = (cardType: CardType): string => {
    const iconId = activeIcons[cardType];
    const icon = AVAILABLE_ICONS.find(i => i.id === iconId);
    return icon ? icon.emoji : '❓';
  };

  const isIconUnlocked = (iconId: string): boolean => {
    return unlockedIcons.includes(iconId);
  };

  const getAvailableIcons = (cardType: CardType): IconItem[] => {
    return AVAILABLE_ICONS.filter(icon => icon.cardType === cardType);
  };

  const getAllIcons = (): IconItem[] => {
    return AVAILABLE_ICONS;
  };

  const contextValue: IconContextType = {
    unlockedIcons,
    activeIcons,
    unlockIcon,
    setActiveIcon,
    getActiveIcon,
    isIconUnlocked,
    getAvailableIcons,
    getAllIcons,
  };

  return (
    <IconContext.Provider value={contextValue}>
      {children}
    </IconContext.Provider>
  );
};

export const useIcons = (): IconContextType => {
  const context = useContext(IconContext);
  if (context === undefined) {
    throw new Error('useIcons deve ser usado dentro de um IconProvider');
  }
  return context;
};

export default IconContext;