// android/app/src/main/java/com/yourapp/database/DatabaseContract.java
package com.noiton2_frontend.database;

import android.provider.BaseColumns;

public class DatabaseContract {

    private DatabaseContract() {}

    // Usuários
    public static class UsuarioEntry implements BaseColumns {
        public static final String TABLE_NAME = "usuarios";
        public static final String COLUMN_ID_USUARIO = "id_usuario";
        public static final String COLUMN_EMAIL = "email";
        public static final String COLUMN_SENHA = "senha";
        public static final String COLUMN_TELEFONE = "telefone";
        public static final String COLUMN_NOME = "nome";
        public static final String COLUMN_PONTOS = "pontos";
    }

    // Workspace
    public static class WorkspaceEntry implements BaseColumns {
        public static final String TABLE_NAME = "workspace";
        public static final String COLUMN_ID_WORKSPACE = "id_workspace";
        public static final String COLUMN_NOME = "nome";
        public static final String COLUMN_EQUIPE = "equipe";
        public static final String COLUMN_CRIADOR = "criador";
    }

    // Usuario-Workspace (relação)
    public static class UsuarioWorkspaceEntry implements BaseColumns {
        public static final String TABLE_NAME = "usuario_workspace";
        public static final String COLUMN_ID_USUARIO_WORKSPACE = "id_usuario_workspace";
        public static final String COLUMN_EMAIL = "email";
        public static final String COLUMN_ID_WORKSPACE = "id_workspace";
    }

    // Categorias
    public static class CategoriaEntry implements BaseColumns {
        public static final String TABLE_NAME = "categorias";
        public static final String COLUMN_ID_CATEGORIA = "id_categoria";
        public static final String COLUMN_NOME = "nome";
        public static final String COLUMN_ID_WORKSPACE = "id_workspace";
    }

    // Tarefas
    public static class TarefaEntry implements BaseColumns {
        public static final String TABLE_NAME = "tarefas";
        public static final String COLUMN_ID_TAREFA = "id_tarefa";
        public static final String COLUMN_TITULO = "titulo";
        public static final String COLUMN_DESCRICAO = "descricao";
        public static final String COLUMN_DATA_FIM = "data_fim";
        public static final String COLUMN_DATA_CRIACAO = "data_criacao";
        public static final String COLUMN_PRIORIDADE = "prioridade";
        public static final String COLUMN_STATUS = "status";
        public static final String COLUMN_CONCLUIDA = "concluida";
        public static final String COLUMN_RECORRENTE = "recorrente";
        public static final String COLUMN_RECORRENCIA = "recorrencia";
        public static final String COLUMN_ID_USUARIO = "id_usuario";
    }

    // Tarefa-Workspace (relação)
    public static class TarefaWorkspaceEntry implements BaseColumns {
        public static final String TABLE_NAME = "tarefa_workspace";
        public static final String COLUMN_ID_TAREFA_WORKSPACE = "id_tarefa_workspace";
        public static final String COLUMN_ID_TAREFA = "id_tarefa";
        public static final String COLUMN_ID_WORKSPACE = "id_workspace";
    }

    // Tarefa-Categoria (relação)
    public static class TarefaCategoriaEntry implements BaseColumns {
        public static final String TABLE_NAME = "tarefa_categoria";
        public static final String COLUMN_ID_TAREFA_CATEGORIA = "id_tarefa_categoria";
        public static final String COLUMN_ID_TAREFA = "id_tarefa";
        public static final String COLUMN_ID_CATEGORIA = "id_categoria";
    }

    // Comentários
    public static class ComentarioEntry implements BaseColumns {
        public static final String TABLE_NAME = "comentarios";
        public static final String COLUMN_ID_COMENTARIO = "id_comentario";
        public static final String COLUMN_EMAIL = "email";
        public static final String COLUMN_ID_TAREFA = "id_tarefa";
        public static final String COLUMN_DESCRICAO = "descricao";
        public static final String COLUMN_DATA_CRIACAO = "data_criacao";
        public static final String COLUMN_DATA_ATUALIZACAO = "data_atualizacao";
    }

    // Anexos
    public static class AnexoEntry implements BaseColumns {
        public static final String TABLE_NAME = "anexos_tarefa";
        public static final String COLUMN_ID_ANEXO = "id_anexo";
        public static final String COLUMN_ID_TAREFA = "id_tarefa";
        public static final String COLUMN_TIPO_ARQUIVO = "tipo_arquivo";
        public static final String COLUMN_NOME_ARQUIVO = "nome_arquivo";
        public static final String COLUMN_NOME_ORIGINAL = "nome_original";
        public static final String COLUMN_TAMANHO_ARQUIVO = "tamanho_arquivo";
        public static final String COLUMN_CAMINHO_ARQUIVO = "caminho_arquivo";
        public static final String COLUMN_DATA_UPLOAD = "data_upload";
        public static final String COLUMN_DATA_ATUALIZACAO = "data_atualizacao";
    }

    // Sync metadata
    public static class SyncEntry implements BaseColumns {
        public static final String TABLE_NAME = "sync_metadata";
        public static final String COLUMN_TABLE_NAME = "table_name";
        public static final String COLUMN_LAST_SYNC = "last_sync";
        public static final String COLUMN_PENDING_SYNC = "pending_sync";
    }
}
