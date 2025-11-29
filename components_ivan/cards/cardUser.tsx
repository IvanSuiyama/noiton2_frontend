import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  getUserEmail,
  apiCall,
} from '../../services/authService';
import { databaseService } from '../../services/databaseService';
import { networkMonitor } from '../../services/networkinManager';
import ThemeSelector from '../theme/ThemeSelector';
import { useTheme } from '../theme/ThemeContext';
import { useIcons } from '../icons/IconContext';

type CardUserNavigationProp = StackNavigationProp<RootStackParamList>;

interface CardUserProps {
  navigation: CardUserNavigationProp;
}

const CardUser: React.FC<CardUserProps> = ({ navigation }) => {
  const { theme } = useTheme();
  
  // Usar IconContext com verificação de segurança
  let iconContext;
  try {
    iconContext = useIcons();
  } catch (error) {
    console.warn('IconContext não disponível, usando ícone padrão');
    iconContext = null;
  }
  
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const email = await getUserEmail();
      setUserEmail(email || 'usuario@email.com');
      setUserName(email?.split('@')[0] || 'Usuário');

      if (email) {
        const isOnline = await networkMonitor.checkNetworkStatus();
        
        if (isOnline) {
          // Modo online - buscar da API
          try {
            console.log('👤 Carregando dados do usuário online...');
            const userData = await apiCall(`/usuarios/email/${encodeURIComponent(email)}`);
            setUserFullName(userData.nome || userName);
            setUserPhone(userData.telefone || '');
            
            // Salvar no cache local para uso offline
            try {
              await databaseService.saveUsuario({
                email: email,
                nome: userData.nome || userName,
                telefone: userData.telefone || ''
              });
            } catch (cacheError) {
              console.warn('Erro ao salvar usuário no cache:', cacheError);
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário online:', error);
            // Fallback para dados offline se API falhar
            await loadOfflineUserData(email);
          }
        } else {
          // Modo offline - buscar do SQLite
          console.log('👤 Carregando dados do usuário offline...');
          await loadOfflineUserData(email);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const loadOfflineUserData = async (email: string) => {
    try {
      const result = await databaseService.getUsuarioByEmail(email);
      if (result.success && result.data) {
        const userData = result.data;
        setUserFullName(userData.nome || userName);
        setUserPhone(userData.telefone || '');
        console.log('👤 Dados do usuário carregados do cache offline');
      } else {
        // Se não há dados offline, usar dados básicos do email
        setUserFullName(userName);
        setUserPhone('');
        console.log('👤 Nenhum dado offline encontrado, usando dados básicos');
      }
    } catch (error) {
      console.error('Erro ao carregar dados offline do usuário:', error);
      setUserFullName(userName);
      setUserPhone('');
    }
  };

  const handleEditUser = () => {
    setShowUserModal(false);
    navigation.navigate('EditUsuario', { userEmail });
  };

  const handleDeleteUser = () => {
    setShowUserModal(false);
    navigation.navigate('DellUser', { userEmail });
  };

  const handleLogoff = async () => {
    setShowUserModal(false);
    try {
      await AsyncStorage.clear();
    } catch (e) {

    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  return (
    <View>
      {}
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => setShowUserModal(true)}
      >
        <View style={[styles.userIcon, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.userIconText, { color: theme.colors.text }]}>
            {iconContext?.getActiveIcon ? iconContext.getActiveIcon('usuario') : '👤'}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showUserModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserModal(false)}>

          <View style={[styles.userDropdown, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.userDropdownHeader, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.userAvatar, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.userAvatarText, { color: theme.colors.text }]}>
                  {(userFullName || userName).charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.userDetails}>
                <Text style={styles.userDropdownName}>{userFullName || userName}</Text>
                <Text style={styles.userDropdownEmail}>{userEmail}</Text>
                {userPhone && (
                  <Text style={styles.userDropdownPhone}>📞 {userPhone}</Text>
                )}
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEditUser}>
                <Text style={styles.actionButtonIcon}>✏️</Text>
                <Text style={styles.actionButtonText}>Editar Perfil</Text>
              </TouchableOpacity>

              <View style={styles.themeSelectorContainer}>
                <ThemeSelector showLabel={true} />
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLogoff}>
                <Text style={styles.actionButtonIcon}>🚪</Text>
                <Text style={styles.actionButtonText}>Sair</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteActionButton]}
                onPress={handleDeleteUser}>
                <Text style={styles.actionButtonIcon}>🗑️</Text>
                <Text style={[styles.actionButtonText, styles.deleteActionText]}>Excluir Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({

  userCard: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 8,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 16,
  },
  userDropdown: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 300,
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  userDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userDropdownName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  userDropdownEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  userDropdownPhone: {
    fontSize: 13,
    color: '#6c757d',
  },
  separator: {
    height: 1,
    backgroundColor: '#3a3a3a',
    marginVertical: 12,
  },
  actionButtonsContainer: {
    gap: 8,
  },
  themeSelectorContainer: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
  },
  deleteActionButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.3)',
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  deleteActionText: {
    color: '#ff6b6b',
  },
});

export default CardUser;
