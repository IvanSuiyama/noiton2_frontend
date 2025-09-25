interface CategoriaInterface {
  id_categoria: number;
  nome: string;
  cor: string; // Obrigatório agora
  id_workspace: number; // Mudança: de id_usuario para id_workspace
}

export default CategoriaInterface;
