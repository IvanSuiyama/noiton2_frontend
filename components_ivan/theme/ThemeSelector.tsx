import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme, ThemeType } from './ThemeContext';
import { comprarItemLojinha, getPontosUsuario } from '../../services/authService';

interface ThemeSelectorProps {
  showLabel?: boolean;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ showLabel = true }) => {
  const { 
    theme, 
    currentThemeType, 
    setThemeByType, 
    getAllThemes, 
    isThemeUnlocked, 
    unlockTheme 
  } = useTheme();
  
  const [showModal, setShowModal] = useState(false);
  const [unlockedThemes, setUnlockedThemes] = useState<ThemeType[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showModal) {
      loadThemeStatus();
    }
  }, [showModal]);

  const loadThemeStatus = async () => {
    try {
      const allThemes = getAllThemes();
      const points = await getPontosUsuario();
      setUserPoints(points);
      
      const unlocked: ThemeType[] = [];
      for (const themeInfo of allThemes) {
        const isUnlocked = await isThemeUnlocked(themeInfo.type);
        if (isUnlocked) {
          unlocked.push(themeInfo.type);
        }
      }
      setUnlockedThemes(unlocked);
    } catch (error) {
      console.error('Erro ao carregar status dos temas:', error);
    }
  };

  const handleThemeSelect = async (themeType: ThemeType) => {
    try {
      await setThemeByType(themeType);
      setShowModal(false);
      Alert.alert('Sucesso', `Tema "${getThemeName(themeType)}" aplicado!`);
    } catch (error) {
      Alert.alert('Erro', 'Este tema precisa ser comprado primeiro!');
    }
  };

  const handleThemePurchase = async (themeType: ThemeType, price: number) => {
    if (userPoints < price) {
      Alert.alert(
        'Pontos Insuficientes',
        `Você precisa de P ${price.toFixed(2)} para comprar este tema. Você tem apenas P ${userPoints.toFixed(2)}.`
      );
      return;
    }

    Alert.alert(
      'Confirmar Compra',
      `Deseja comprar o tema "${getThemeName(themeType)}" por P ${price.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: async () => {
            setLoading(true);
            try {
              // Simular compra (em um sistema real, seria um endpoint específico)
              const success = await comprarItemLojinha(price);
              
              if (success) {
                await unlockTheme(themeType);
                await loadThemeStatus(); // Recarregar status
                Alert.alert(
                  'Compra Realizada! 🎉',
                  `Tema "${getThemeName(themeType)}" foi desbloqueado!\\n\\nNota: Sistema de compras em desenvolvimento. Os pontos foram mantidos para demonstração.`
                );
              } else {
                Alert.alert('Erro', 'Não foi possível processar a compra.');
              }
            } catch (error) {
              Alert.alert('Erro', 'Erro ao processar compra.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getThemeName = (themeType: ThemeType): string => {
    const themeInfo = getAllThemes().find(t => t.type === themeType);
    return themeInfo?.name || themeType;
  };

  const getThemeIcon = (themeType: ThemeType): string => {
    switch (themeType) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'trello': return '📋';
      case 'noiton1': return '🌟';
      default: return '🎨';
    }
  };

  const renderThemeOption = (themeInfo: { type: ThemeType; name: string; theme: any; price: number; isPremium: boolean }) => {
    const isUnlocked = unlockedThemes.includes(themeInfo.type);
    const isCurrentTheme = currentThemeType === themeInfo.type;
    const canAfford = userPoints >= themeInfo.price;

    return (
      <TouchableOpacity
        key={themeInfo.type}
        style={[
          styles.themeOption,
          { 
            backgroundColor: themeInfo.theme.colors.surface,
            borderColor: isCurrentTheme ? themeInfo.theme.colors.primary : themeInfo.theme.colors.border,
            borderWidth: isCurrentTheme ? 2 : 1,
          }
        ]}
        onPress={() => {
          if (isUnlocked) {
            handleThemeSelect(themeInfo.type);
          } else if (themeInfo.isPremium) {
            handleThemePurchase(themeInfo.type, themeInfo.price);
          }
        }}
        disabled={loading}
      >
        <View style={styles.themeHeader}>
          <View style={styles.themeIconContainer}>
            <Text style={styles.themeIcon}>{getThemeIcon(themeInfo.type)}</Text>
          </View>
          <View style={styles.themeInfo}>
            <Text style={[styles.themeName, { color: themeInfo.theme.colors.text }]}>
              {themeInfo.name}
            </Text>
            {themeInfo.isPremium && (
              <Text style={[styles.themePrice, { color: themeInfo.theme.colors.warning }]}>
                P {themeInfo.price.toFixed(2)}
              </Text>
            )}
          </View>
          <View style={styles.themeStatus}>
            {isCurrentTheme && (
              <Text style={[styles.currentBadge, { color: themeInfo.theme.colors.primary }]}>
                ✓ Atual
              </Text>
            )}
            {!isUnlocked && themeInfo.isPremium && (
              <Text style={[styles.lockedBadge, { color: canAfford ? theme.colors.warning : theme.colors.error }]}>
                {canAfford ? '🔓 Comprar' : '🔒 Bloqueado'}
              </Text>
            )}
            {isUnlocked && !isCurrentTheme && (
              <Text style={[styles.unlockedBadge, { color: theme.colors.success }]}>
                ✓ Desbloqueado
              </Text>
            )}
          </View>
        </View>
        
        <View style={[styles.themePreview, { backgroundColor: themeInfo.theme.colors.background }]}>
          <View style={[styles.previewCard, { backgroundColor: themeInfo.theme.colors.surface }]}>
            <Text style={[styles.previewText, { color: themeInfo.theme.colors.text }]}>
              Texto Principal
            </Text>
            <Text style={[styles.previewTextSecondary, { color: themeInfo.theme.colors.textSecondary }]}>
              Texto Secundário
            </Text>
            <View style={styles.previewColors}>
              <View style={[styles.colorDot, { backgroundColor: themeInfo.theme.colors.primary }]} />
              <View style={[styles.colorDot, { backgroundColor: themeInfo.theme.colors.success }]} />
              <View style={[styles.colorDot, { backgroundColor: themeInfo.theme.colors.warning }]} />
              <View style={[styles.colorDot, { backgroundColor: themeInfo.theme.colors.error }]} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.selectorButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.selectorIcon}>{getThemeIcon(currentThemeType)}</Text>
        {showLabel && (
          <Text style={[styles.selectorText, { color: theme.colors.text }]}>
            {getThemeName(currentThemeType)}
          </Text>
        )}
        <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Selecionar Tema
              </Text>
              <View style={styles.pointsContainer}>
                <Text style={[styles.pointsText, { color: theme.colors.warning }]}>
                  P {userPoints.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.themesContainer} showsVerticalScrollIndicator={false}>
              {getAllThemes().map(renderThemeOption)}
              
              <View style={styles.infoContainer}>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  💡 Dica: Complete tarefas no prazo para ganhar pontos e desbloquear novos temas!
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  selectorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  chevron: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pointsContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  themesContainer: {
    padding: 16,
  },
  themeOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  themeIconContainer: {
    marginRight: 12,
  },
  themeIcon: {
    fontSize: 24,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  themePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeStatus: {
    alignItems: 'flex-end',
  },
  currentBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lockedBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  unlockedBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  themePreview: {
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
  },
  previewCard: {
    borderRadius: 6,
    padding: 12,
  },
  previewText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewTextSecondary: {
    fontSize: 12,
    marginBottom: 8,
  },
  previewColors: {
    flexDirection: 'row',
    gap: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ThemeSelector;