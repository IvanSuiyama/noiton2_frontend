// ExemploUsoCache.tsx - Exemplo de como usar o cache offline
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import useCacheOffline from './useCacheOffline';

const ExemploUsoCache: React.FC = () => {
  const { theme } = useTheme();
  const { saveTarefaOffline, getPendingOperations, syncNow } = useCacheOffline();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    const pending = await getPendingOperations();
    setPendingCount(pending.length);
  };

  const handleSaveTarefa = async () => {
    const success = await saveTarefaOffline({
      titulo: 'Tarefa Offline Exemplo',
      descricao: 'Esta tarefa foi criada offline',
      id_workspace: 1,
      id_usuario: 1,
      prioridade: 'MEDIA',
    });

    if (success) {
      Alert.alert('✅ Sucesso', 'Tarefa salva offline!');
      loadPendingCount();
    } else {
      Alert.alert('❌ Erro', 'Falha ao salvar tarefa offline');
    }
  };

  const handleSync = async () => {
    await syncNow();
    Alert.alert('🔄 Sincronização', 'Sincronização iniciada');
    setTimeout(loadPendingCount, 2000); // Recarregar após 2 segundos
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        📱 Exemplo Cache Offline
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Operações pendentes: {pendingCount}
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={handleSaveTarefa}
      >
        <Text style={styles.buttonText}>
          📝 Salvar Tarefa Offline
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.success }]}
        onPress={handleSync}
      >
        <Text style={styles.buttonText}>
          🔄 Sincronizar Agora
        </Text>
      </TouchableOpacity>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          💡 Este componente demonstra como usar o cache offline.
          {'\n'}
          • Salve operações quando estiver offline
          {'\n'}
          • Sincronize quando a conexão retornar
          {'\n'}
          • Monitor automático de conectividade ativo
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ExemploUsoCache;