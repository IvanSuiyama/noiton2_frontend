// Interface para tarefa com múltiplos responsáveis - Nova Arquitetura
export default interface TarefaMultiplaInterface {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  data_fim?: string;
  data_criacao: string;
  status: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  recorrente: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  id_workspace: number;
  id_usuario: number;
  categorias: {
    id_categoria: number;
    nome: string;
    cor: string;
  }[];
  // Novos campos de permissão vindos do backend
  nivel_acesso?: number; // 0=criador, 1=editor, 2=visualizador
  pode_editar?: boolean;
  pode_apagar?: boolean;
  criador_email?: string; // Email do criador da tarefa
}

// Interface para criar nova tarefa (sem id_tarefa e data_criacao)
export interface CriarTarefaInterface {
  titulo: string;
  descricao?: string;
  data_fim?: string;
  status: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  recorrente: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  id_workspace: number;
  id_usuario: number;
  categorias_selecionadas: number[]; // Array de IDs das categorias (relacionamento via tarefa_categoria)
}

// Interface para atualizar tarefa existente
export interface AtualizarTarefaInterface {
  titulo?: string;
  descricao?: string;
  data_fim?: string;
  status?: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  recorrente?: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  categorias_selecionadas?: number[]; // Array de IDs das categorias (relacionamento via tarefa_categoria)
}

// Interface para permissões de tarefa
export interface PermissaoTarefaInterface {
  id_permissao: number;
  id_tarefa: number;
  id_usuario: number;
  nivel_acesso: number; // 0=criador, 1=editor, 2=visualizador
  data_criacao: string;
  // Dados do usuário (vindos do backend via JOIN)
  nome?: string;
  email?: string;
}

// Interface para minha permissão em uma tarefa
export interface MinhaPermissaoInterface {
  nivel_acesso: number;
  descricao: string;
  pode_visualizar: boolean;
  pode_editar: boolean;
  pode_apagar: boolean;
}

// Interface para adicionar/atualizar permissão
export interface AdicionarPermissaoInterface {
  id_usuario: number;
  nivel_acesso: number; // 0=criador, 1=editor, 2=visualizador
}