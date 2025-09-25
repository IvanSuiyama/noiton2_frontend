import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiCall, isAuthenticated } from '../../services/authService';
import UserInterface from './userInterface';

// Obter dimensões da tela para responsividade
const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface SelectUsuarioProps {
  onSelectUser?: (user: UserInterface) => void;
  multiSelect?: boolean;
  selectedUsers?: UserInterface[];
  excludeEmails?: string[];
  showActions?: boolean;
}

const SelectUsuario: React.FC<SelectUsuarioProps> = ({
  onSelectUser,
  multiSelect = false,
  selectedUsers = [],
  excludeEmails = [],
  showActions = true,
}) => {
  const navigation = useNavigation();

  const [usuarios, setUsuarios] = useState<UserInterface[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<UserInterface[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUsersList, setSelectedUsersList] = useState<UserInterface[]>(selectedUsers);

  // Buscar todos os usuários ao carregar o componente
  useEffect(() => {
    const verificarAutenticacaoECarregarDados = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          Alert.alert(
            'Erro de Autenticação',
            'Você não está autenticado. Faça login novamente.',
            [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
          return;
        }
        
        await buscarUsuarios();
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        Alert.alert('Erro', 'Erro ao verificar autenticação');
        navigation.goBack();
      }
    };

    verificarAutenticacaoECarregarDados();
  }, []);

  // Aplicar filtros quando a lista de usuários ou texto de busca mudar
  useEffect(() => {
    aplicarFiltros();
  }, [usuarios, searchText, excludeEmails]);

  const buscarUsuarios = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await apiCall('/usuarios');
      setUsuarios(data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar usuários';
      
      if (errorMessage.includes('Token expirado') || errorMessage.includes('não autenticado')) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = usuarios;

    // Excluir emails específicos
    if (excludeEmails.length > 0) {
      filtered = filtered.filter(user => !excludeEmails.includes(user.email));
    }

    // Aplicar filtro de busca
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.nome.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.telefone && user.telefone.includes(search))
      );
    }

    setFilteredUsuarios(filtered);
  };

  const handleRefresh = useCallback(() => {
    buscarUsuarios(true);
  }, []);

  const handleSelectUser = (user: UserInterface) => {
    if (multiSelect) {
      const isSelected = selectedUsersList.some(u => u.email === user.email);
      let newSelection;

      if (isSelected) {
        newSelection = selectedUsersList.filter(u => u.email !== user.email);
      } else {
        newSelection = [...selectedUsersList, user];
      }

      setSelectedUsersList(newSelection);
      onSelectUser && onSelectUser(user);
    } else {
      onSelectUser && onSelectUser(user);
    }
  };

  const handleEditUser = (user: UserInterface) => {
    (navigation as any).navigate('EditUsuario', { userEmail: user.email });
  };

  const handleDeleteUser = (user: UserInterface) => {
    (navigation as any).navigate('DellUser', { userEmail: user.email });
  };

  const isUserSelected = (user: UserInterface): boolean => {
    return selectedUsersList.some(u => u.email === user.email);
  };

  const clearSelection = () => {
    setSelectedUsersList([]);
  };

  const getSelectedCount = (): number => {
    return selectedUsersList.length;
  };

  const renderUserItem = ({ item }: { item: UserInterface }) => {
    const isSelected = isUserSelected(item);

    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          isSelected && styles.userCardSelected,
          multiSelect && styles.userCardMultiSelect
        ]}
        onPress={() => handleSelectUser(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {/* Avatar placeholder */}
          <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
            <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
              {item.nome.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Informações do usuário */}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, isSelected && styles.userNameSelected]}>
              {item.nome}
            </Text>
            <Text style={[styles.userEmail, isSelected && styles.userEmailSelected]}>
              {item.email}
            </Text>
            {item.telefone && (
              <Text style={[styles.userPhone, isSelected && styles.userPhoneSelected]}>
                📞 {item.telefone}
              </Text>
            )}
          </View>

          {/* Indicador de seleção */}
          {multiSelect && (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          )}
        </View>

        {/* Ações do usuário */}
        {showActions && !multiSelect && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditUser(item)}
            >
              <Text style={styles.actionButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerActionButton]}
              onPress={() => handleDeleteUser(item)}
            >
              <Text style={styles.actionButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>👤</Text>
      <Text style={styles.emptyStateTitle}>
        {searchText ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
      </Text>
      <Text style={styles.emptyStateDescription}>
        {searchText 
          ? 'Tente ajustar os termos de busca'
          : 'Cadastre o primeiro usuário para começar'
        }
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>👥 Selecionar Usuários</Text>
      
      {/* Campo de busca */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nome, email ou telefone..."
          placeholderTextColor="#6c757d"
        />
        {searchText && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchText('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Informações da seleção */}
      {multiSelect && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionCount}>
            {getSelectedCount()} usuário(s) selecionado(s)
          </Text>
          {getSelectedCount() > 0 && (
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.clearSelectionText}>Limpar seleção</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contador de resultados */}
      <Text style={styles.resultCount}>
        {filteredUsuarios.length} usuário(s) encontrado(s)
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6c757d" />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredUsuarios}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.email}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6c757d']}
            tintColor="#6c757d"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet' : 'phone'} // Force re-render quando mudar orientação
        columnWrapperStyle={isTablet ? styles.row : undefined}
        getItemLayout={(data, index) => ({
          length: isTablet ? 140 : 120,
          offset: (isTablet ? 140 : 120) * index,
          index,
        })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Botão flutuante para adicionar usuário */}
      {showActions && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => (navigation as any).navigate('CadUsuario')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Espaço para o FAB
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  header: {
    marginBottom: 20,
    ...(isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 50,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 48,
    textAlignVertical: 'center',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#6c757d',
    fontSize: 16,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectionCount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearSelectionText: {
    color: '#6c757d',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  resultCount: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  userCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#404040',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(isTablet && { 
      flex: 0.48, 
      marginHorizontal: 4,
      minHeight: 120,
    }),
  },
  userCardSelected: {
    borderColor: '#6c757d',
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
  },
  userCardMultiSelect: {
    marginRight: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarSelected: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  avatarTextSelected: {
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userNameSelected: {
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  userEmailSelected: {
    color: '#6c757d',
  },
  userPhone: {
    fontSize: 12,
    color: '#6c757d',
  },
  userPhoneSelected: {
    color: '#6c757d',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
    borderRadius: 8,
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  dangerActionButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
  },
  actionButtonText: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: isTablet ? 30 : 20,
    width: isTablet ? 64 : 56,
    height: isTablet ? 64 : 56,
    borderRadius: isTablet ? 32 : 28,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
  },
});

export default SelectUsuario;