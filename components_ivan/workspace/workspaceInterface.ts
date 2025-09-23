interface WorkspaceInterface {
  id_workspace: number;
  nome?: string;
  equipe?: boolean;
  criador: string;
}

interface UsuarioWorkspaceInterface {
  id_usuario_workspace: number;
  email: string;
  id_workspace: number;
}

interface TarefaWorkspaceInterface {
  id_tarefa_workspace: number;
  id_tarefa: number;
  id_workspace: number;
}

export default WorkspaceInterface;
export type {UsuarioWorkspaceInterface, TarefaWorkspaceInterface};
