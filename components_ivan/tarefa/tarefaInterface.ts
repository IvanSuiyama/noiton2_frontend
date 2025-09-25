interface TarefaInterface {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  data_criacao?: Date;
  data_fim?: Date;
  status: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  concluida?: boolean;
  recorrente?: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  id_usuario: number;
  id_workspace: number;
  id_categoria?: number;
}

export default TarefaInterface;
