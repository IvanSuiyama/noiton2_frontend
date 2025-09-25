// Interface para comentários de tarefas - Atualizada para nova arquitetura
interface ComentarioInterface {
  id_comentario: number;
  conteudo: string; // Mudança: de 'texto' para 'conteudo'
  data_criacao: string; // Mudança: de Date para string (ISO)
  email_autor: string; // Mudança: de id_usuario para email_autor
  id_tarefa: number;
}

// Interface para criar novo comentário
export interface CriarComentarioInterface {
  conteudo: string;
  id_tarefa: number;
  email_autor: string; // Será obtido do token JWT
}

// Interface para atualizar comentário existente
export interface AtualizarComentarioInterface {
  conteudo: string;
}

export default ComentarioInterface;
