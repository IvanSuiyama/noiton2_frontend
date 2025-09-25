import React from 'react';
import { Alert } from 'react-native';
import { apiCall } from '../../services/authService';

interface DellTarefaProps {
  id_tarefa: number;
  titulo: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Função para deletar uma tarefa e todos os relacionamentos
 * Remove da tarefa_categoria, tarefa_responsavel, comentários e por fim a tarefa
 */
export const deletarTarefa = async ({ 
  id_tarefa, 
  titulo, 
  onSuccess, 
  onError 
}: DellTarefaProps) => {
  Alert.alert(
    'Confirmar Exclusão',
    `Tem certeza que deseja excluir a tarefa "${titulo}"?\n\nEsta ação não pode ser desfeita e removerá:\n• A tarefa\n• Todos os responsáveis\n• Todas as categorias atribuídas\n• Todos os comentários`,
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
            await apiCall(`/tarefas/${id_tarefa}`, 'DELETE');
            
            Alert.alert(
              'Sucesso',
              `A tarefa "${titulo}" foi excluída com sucesso!`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (onSuccess) {
                      onSuccess();
                    }
                  },
                }
              ]
            );
          } catch (error: any) {
            const errorMessage = error.message || 'Erro desconhecido ao excluir tarefa';
            
            Alert.alert(
              'Erro ao Excluir',
              errorMessage,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (onError) {
                      onError(errorMessage);
                    }
                  },
                }
              ]
            );
          }
        },
      },
    ]
  );
};

/**
 * Hook para usar a função de deletar tarefa
 */
export const useDeletarTarefa = () => {
  return deletarTarefa;
};

export default deletarTarefa;
