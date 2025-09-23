interface ComentarioInterface {
  id_comentario: number;
  texto: string;
  data_criacao: Date;
  id_usuario: number;
  id_tarefa: number;
}

export default ComentarioInterface;
