// Interface para comentários de tarefas - Alinhada com backend
interface ComentarioInterface {
  id_comentario: number;
  email: string;
  id_tarefa: number;
  descricao: string;
  data_criacao: string;
  data_atualizacao: string;
  
  // Campos adicionais (se houver joins no backend)
  nome_usuario?: string;
  titulo_tarefa?: string;
}

// Interface para criar novo comentário
export interface CreateComentarioInterface {
  id_tarefa: number;
  descricao: string;
  // email será obtido automaticamente do token JWT
}

// Interface para editar comentário
export interface EditComentarioInterface {
  descricao: string;
}

// Interface para resposta da API
export interface ComentarioResponse {
  success: boolean;
  message?: string;
  data?: ComentarioInterface | ComentarioInterface[];
}

export default ComentarioInterface;
