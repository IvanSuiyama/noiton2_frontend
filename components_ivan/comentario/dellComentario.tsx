import React from 'react';
import { Alert } from 'react-native';
import { apiCall, getUserEmail } from '../../services/authService';
import ComentarioInterface from './comentarioInterface';

interface DellComentarioProps {
  comentario: ComentarioInterface;
  onDelete: (comentarioId: number) => void;
}

// Função utilitária para confirmar e deletar comentário
export const confirmarDeletarComentario = async (
  comentario: ComentarioInterface,
  onDelete: (comentarioId: number) => void
) => {
  Alert.alert(
    'Confirmar Exclusão',
    `Tem certeza que deseja excluir este comentário?\n\n"${comentario.descricao.substring(0, 50)}${comentario.descricao.length > 50 ? '...' : ''}"`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deletarComentarioComAuthService(comentario, onDelete),
      },
    ]
  );
};

// Função para deletar comentário usando apiCall e incluindo email no body
const deletarComentario = async (
  comentario: ComentarioInterface,
  onDelete: (comentarioId: number) => void
) => {
  try {
    const email = await getUserEmail();
    if (!email) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    console.log('🗑️ Excluindo comentário:', comentario.id_comentario, 'Email:', email);
    
    // Backend espera o email no corpo para validar o autor
    await apiCall(`/comentarios/${comentario.id_comentario}`, 'DELETE', { email });

    onDelete(comentario.id_comentario);
    Alert.alert('Sucesso', 'Comentário excluído com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro ao deletar comentário:', error);
    Alert.alert('Erro', error.message || 'Erro ao excluir comentário');
  }
};

// Função alternativa usando apiCall garantindo envio do email
export const deletarComentarioComAuthService = async (
  comentario: ComentarioInterface,
  onDelete: (comentarioId: number) => void
) => {
  try {
    const email = await getUserEmail();
    if (!email) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    console.log('🗑️ Excluindo comentário com AuthService:', comentario.id_comentario, 'Email:', email);
    
    await apiCall(`/comentarios/${comentario.id_comentario}`, 'DELETE', { email });
    onDelete(comentario.id_comentario);
    Alert.alert('Sucesso', 'Comentário excluído com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro ao deletar comentário:', error);
    Alert.alert('Erro', error.message || 'Erro ao excluir comentário');
  }
};

// Hook personalizado para gerenciar exclusão de comentários
export const useDellComentario = () => {
  const confirmarEDeletar = async (
    comentario: ComentarioInterface,
    onDelete: (comentarioId: number) => void
  ) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir este comentário?\n\n"${comentario.descricao.substring(0, 50)}${comentario.descricao.length > 50 ? '...' : ''}"`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const email = await getUserEmail();
              if (!email) {
                Alert.alert('Erro', 'Usuário não autenticado');
                return;
              }

              console.log('🗑️ Excluindo comentário via Hook:', comentario.id_comentario, 'Email:', email);
              
              await apiCall(`/comentarios/${comentario.id_comentario}`, 'DELETE', { email });
              onDelete(comentario.id_comentario);
              Alert.alert('Sucesso', 'Comentário excluído com sucesso!');
            } catch (error: any) {
              console.error('❌ Erro ao deletar comentário:', error);
              Alert.alert('Erro', error.message || 'Erro ao excluir comentário');
            }
          },
        },
      ]
    );
  };

  return { confirmarEDeletar };
};

export default {
  confirmarDeletarComentario,
  deletarComentarioComAuthService,
  useDellComentario,
};