import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { apiCall, getToken } from '../../services/authService';
interface CardMembrosProps {
  idWorkspace: number;
  membros: string[];
  criador: string;
  isEquipe: boolean;
  onMembrosAtualizados?: (novosMembros: string[]) => void;
}

const CardMembros: React.FC<CardMembrosProps> = ({ idWorkspace, membros, criador, isEquipe, onMembrosAtualizados }) => {
  const [novoEmail, setNovoEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [listaMembros, setListaMembros] = useState<string[]>(membros);

  if (!isEquipe) {
    return null;
  }

  const validarEmail = async (email: string) => {
    try{
        const emailcadastrado = await apiCall(`/usuarios/email/${(email)}`, 'GET');
        return emailcadastrado.exists;
    } catch {
        console.log('Email não cadastrado no aplicativo.')
    }
    
  };

  const adicionarMembro = async () => {
    const emailValido = await validarEmail(novoEmail);
    if (!emailValido) {
      Alert.alert('Email inválido', 'Este email não possui conta cadastrada em nosso sistema.');
      return;
    }
    if (listaMembros.includes(novoEmail)) {
      Alert.alert('Já é membro', 'Este email já faz parte do workspace.');
      return;
    }
    setLoading(true);
    try {
      await apiCall(`/workspaces/${idWorkspace}/adicionar-email`, 'POST', { emailNovo: novoEmail });
      const novos = [...listaMembros, novoEmail];
      setListaMembros(novos);
      setNovoEmail('');
      onMembrosAtualizados && onMembrosAtualizados(novos);
      Alert.alert('Sucesso', 'Membro adicionado!');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao adicionar membro.');
    } finally {
      setLoading(false);
    }
  };

  const removerMembro = async (email: string) => {
    if (email === criador) {
      return;
    }
    setLoading(true);
    try {
  await apiCall(`/workspaces/${idWorkspace}/remover-email`, 'DELETE', { emailRuim: email });
      const novos = listaMembros.filter(e => e !== email);
      setListaMembros(novos);
      onMembrosAtualizados && onMembrosAtualizados(novos);
      Alert.alert('Sucesso', 'Membro removido!');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao remover membro.');
    } finally {
      setLoading(false);
    }
  };

  const renderMembro = ({ item }: { item: string }) => (
    <View style={styles.membroRow}>
      <Text style={{ marginRight: 8, fontSize: 18 }}>{item === criador ? '👑' : '👤'}</Text>
      <Text style={styles.membroEmail}>{item}</Text>
      <Text style={styles.membroTipo}>{item === criador ? ' (Criador)' : ' (Membro)'}</Text>
      {item !== criador && (
        <TouchableOpacity style={styles.removerBtn} onPress={() => removerMembro(item)} disabled={loading}>
          <Text style={{ fontSize: 18 }}>❌</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={{ fontSize: 22, marginRight: 8 }}>👥</Text>
        <Text style={styles.title}>Membros do Workspace</Text>
      </View>
      <FlatList
        data={listaMembros}
        keyExtractor={item => item}
        renderItem={renderMembro}
        style={styles.lista}
      />
      <View style={styles.addContainer}>
        <TextInput
          style={styles.input}
          placeholder="Adicionar email de membro"
          placeholderTextColor="#6c757d"
          value={novoEmail}
          onChangeText={setNovoEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TouchableOpacity style={styles.addBtn} onPress={adicionarMembro} disabled={loading}>
          <Text style={{ fontSize: 18, color: '#fff' }}>➕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#23272b',
    borderRadius: 12,
    padding: 18,
    marginTop: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#404040',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lista: {
    marginBottom: 12,
  },
  membroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  membroEmail: {
    color: '#fff',
    fontSize: 15,
  },
  membroTipo: {
    color: '#6c757d',
    fontSize: 13,
    marginLeft: 6,
  },
  removerBtn: {
    marginLeft: 10,
    padding: 4,
  },
  addContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    marginRight: 8,
  },
  addBtn: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CardMembros;
