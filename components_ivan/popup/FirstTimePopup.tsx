import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';

const {width, height} = Dimensions.get('window');

type Props = {
  visible: boolean;
  onCreateWorkspace: () => void;
  onClose: () => void;
};

const FirstTimePopup: React.FC<Props> = ({
  visible,
  onCreateWorkspace,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Ícone de boas-vindas */}
          <View style={styles.iconContainer}>
            <Text style={styles.welcomeIcon}>🎉</Text>
          </View>

          {/* Título e mensagem */}
          <Text style={styles.title}>Bem-vindo ao Noiton2!</Text>
          <Text style={styles.message}>
            Como é sua primeira vez aqui, você precisa criar um workspace para
            começar a organizar suas tarefas e projetos.
          </Text>

          {/* Informações sobre workspace */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📁</Text>
              <Text style={styles.infoText}>
                Organize suas páginas e projetos
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>
                Colabore com sua equipe (opcional)
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🚀</Text>
              <Text style={styles.infoText}>
                Aumente sua produtividade
              </Text>
            </View>
          </View>

          {/* Botões */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateWorkspace}>
              <Text style={styles.createButtonText}>Criar Workspace</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipButtonText}>Pular por agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: Math.min(width - 40, 400),
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoContainer: {
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  buttonsContainer: {
    gap: 12,
  },
  createButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)', // Cinza transparente
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6c757d',
    fontSize: 16,
  },
});

export default FirstTimePopup;