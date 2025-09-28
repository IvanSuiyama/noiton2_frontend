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