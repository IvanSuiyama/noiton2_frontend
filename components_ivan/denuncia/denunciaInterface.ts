// Interface para denúncias
export interface DenunciaInterface {
  id_denuncia: number;
  id_tarefa: number;
  id_usuario_denunciante: number;
  motivo: string;
  status: 'pendente' | 'analisada' | 'rejeitada' | 'aprovada';
  data_criacao: string;
  data_analise?: string;
  id_moderador?: number;
  observacoes_moderador?: string;
  
  // Campos adicionais vindos do backend (joins)
  titulo_tarefa?: string;
  nome_denunciante?: string;
  nome_workspace?: string;
}

// Interface para criar nova denúncia
export interface CreateDenunciaInterface {
  id_tarefa: number;
  motivo: string;
}

// Interface para resposta da API
export interface DenunciaResponse {
  success: boolean;
  message?: string;
  data?: DenunciaInterface | DenunciaInterface[];
  total?: number;
}

// Interface para estatísticas de denúncias
export interface DenunciaStats {
  por_status: {
    pendente: number;
    analisada: number;
    rejeitada: number;
    aprovada: number;
  };
  total: number;
}

export default DenunciaInterface;