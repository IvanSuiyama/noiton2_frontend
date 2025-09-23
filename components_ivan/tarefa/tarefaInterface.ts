interface TarefaInterface {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  data_criacao?: Date;
  data_expiracao?: Date;
  status?: string;
  prioridade?: string;
  comentarios?: string;
  id_usuario: number;
  id_categoria?: number;
}

export default TarefaInterface;
