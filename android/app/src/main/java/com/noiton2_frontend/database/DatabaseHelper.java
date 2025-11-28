// android/app/src/main/java/com/yourapp/database/DatabaseHelper.java
package com.noiton2_frontend.database;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String TAG = "DatabaseHelper";
    
    private static final String DATABASE_NAME = "offline_cache.db";
    private static final int DATABASE_VERSION = 1;

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        createTables(db);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        Log.w(TAG, "Upgrading database from version " + oldVersion + " to " + newVersion);
        dropTables(db);
        onCreate(db);
    }

    private void createTables(SQLiteDatabase db) {
        try {
            // 1. Tabela usuarios
            String CREATE_USUARIOS_TABLE = "CREATE TABLE " + DatabaseContract.UsuarioEntry.TABLE_NAME + " (" +
                    DatabaseContract.UsuarioEntry.COLUMN_ID_USUARIO + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.UsuarioEntry.COLUMN_EMAIL + " TEXT UNIQUE NOT NULL," +
                    DatabaseContract.UsuarioEntry.COLUMN_SENHA + " TEXT NOT NULL," +
                    DatabaseContract.UsuarioEntry.COLUMN_TELEFONE + " TEXT UNIQUE," +
                    DatabaseContract.UsuarioEntry.COLUMN_NOME + " TEXT NOT NULL," +
                    DatabaseContract.UsuarioEntry.COLUMN_PONTOS + " REAL DEFAULT 0.0" +
                    ");";

            // 2. Tabela workspace
            String CREATE_WORKSPACE_TABLE = "CREATE TABLE " + DatabaseContract.WorkspaceEntry.TABLE_NAME + " (" +
                    DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.WorkspaceEntry.COLUMN_NOME + " TEXT," +
                    DatabaseContract.WorkspaceEntry.COLUMN_EQUIPE + " INTEGER DEFAULT 0," + // SQLite não tem BOOLEAN, usa INTEGER
                    DatabaseContract.WorkspaceEntry.COLUMN_CRIADOR + " TEXT NOT NULL" +
                    ");";

            // 3. Tabela usuario_workspace (relação)
            String CREATE_USUARIO_WORKSPACE_TABLE = "CREATE TABLE " + DatabaseContract.UsuarioWorkspaceEntry.TABLE_NAME + " (" +
                    DatabaseContract.UsuarioWorkspaceEntry.COLUMN_ID_USUARIO_WORKSPACE + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.UsuarioWorkspaceEntry.COLUMN_EMAIL + " TEXT NOT NULL," +
                    DatabaseContract.UsuarioWorkspaceEntry.COLUMN_ID_WORKSPACE + " INTEGER NOT NULL," +
                    "UNIQUE(" + DatabaseContract.UsuarioWorkspaceEntry.COLUMN_EMAIL + ", " + 
                    DatabaseContract.UsuarioWorkspaceEntry.COLUMN_ID_WORKSPACE + ")," +
                    "FOREIGN KEY (" + DatabaseContract.UsuarioWorkspaceEntry.COLUMN_EMAIL + ") REFERENCES " +
                    DatabaseContract.UsuarioEntry.TABLE_NAME + "(" + DatabaseContract.UsuarioEntry.COLUMN_EMAIL + ")," +
                    "FOREIGN KEY (" + DatabaseContract.UsuarioWorkspaceEntry.COLUMN_ID_WORKSPACE + ") REFERENCES " +
                    DatabaseContract.WorkspaceEntry.TABLE_NAME + "(" + DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE + ")" +
                    ");";

            // 4. Tabela categorias
            String CREATE_CATEGORIAS_TABLE = "CREATE TABLE " + DatabaseContract.CategoriaEntry.TABLE_NAME + " (" +
                    DatabaseContract.CategoriaEntry.COLUMN_ID_CATEGORIA + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.CategoriaEntry.COLUMN_NOME + " TEXT NOT NULL," +
                    DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE + " INTEGER NOT NULL," +
                    "UNIQUE(" + DatabaseContract.CategoriaEntry.COLUMN_NOME + ", " + 
                    DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE + ")," +
                    "FOREIGN KEY (" + DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE + ") REFERENCES " +
                    DatabaseContract.WorkspaceEntry.TABLE_NAME + "(" + DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE + ") ON DELETE CASCADE" +
                    ");";

            // 5. Tabela tarefas
            String CREATE_TAREFAS_TABLE = "CREATE TABLE " + DatabaseContract.TarefaEntry.TABLE_NAME + " (" +
                    DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.TarefaEntry.COLUMN_TITULO + " TEXT NOT NULL," +
                    DatabaseContract.TarefaEntry.COLUMN_DESCRICAO + " TEXT," +
                    DatabaseContract.TarefaEntry.COLUMN_DATA_FIM + " DATETIME," +
                    DatabaseContract.TarefaEntry.COLUMN_DATA_CRIACAO + " DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE + " TEXT CHECK(" + DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE + " IN ('alta', 'media', 'baixa', 'urgente')) DEFAULT 'media'," +
                    DatabaseContract.TarefaEntry.COLUMN_STATUS + " TEXT CHECK(" + DatabaseContract.TarefaEntry.COLUMN_STATUS + " IN ('a_fazer', 'em_andamento', 'concluido', 'atrasada')) DEFAULT 'a_fazer'," +
                    DatabaseContract.TarefaEntry.COLUMN_CONCLUIDA + " INTEGER DEFAULT 0," +
                    DatabaseContract.TarefaEntry.COLUMN_RECORRENTE + " INTEGER DEFAULT 0," +
                    DatabaseContract.TarefaEntry.COLUMN_RECORRENCIA + " TEXT CHECK(" + DatabaseContract.TarefaEntry.COLUMN_RECORRENCIA + " IN ('diaria', 'semanal', 'mensal'))," +
                    DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO + " INTEGER NOT NULL," +
                    "UNIQUE(" + DatabaseContract.TarefaEntry.COLUMN_TITULO + ", " + DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO + ")," +
                    "FOREIGN KEY (" + DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO + ") REFERENCES " +
                    DatabaseContract.UsuarioEntry.TABLE_NAME + "(" + DatabaseContract.UsuarioEntry.COLUMN_ID_USUARIO + ") ON DELETE CASCADE" +
                    ");";

            // 6. Tabela tarefa_workspace (relação)
            String CREATE_TAREFA_WORKSPACE_TABLE = "CREATE TABLE " + DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME + " (" +
                    DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA_WORKSPACE + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA + " INTEGER NOT NULL," +
                    DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE + " INTEGER NOT NULL," +
                    "UNIQUE(" + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA + ", " + 
                    DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE + ")," +
                    "FOREIGN KEY (" + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA + ") REFERENCES " +
                    DatabaseContract.TarefaEntry.TABLE_NAME + "(" + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + ") ON DELETE CASCADE," +
                    "FOREIGN KEY (" + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE + ") REFERENCES " +
                    DatabaseContract.WorkspaceEntry.TABLE_NAME + "(" + DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE + ") ON DELETE CASCADE" +
                    ");";

            // 7. Tabela tarefa_categoria (relação)
            String CREATE_TAREFA_CATEGORIA_TABLE = "CREATE TABLE " + DatabaseContract.TarefaCategoriaEntry.TABLE_NAME + " (" +
                    DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_TAREFA_CATEGORIA + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_TAREFA + " INTEGER NOT NULL," +
                    DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_CATEGORIA + " INTEGER NOT NULL," +
                    "UNIQUE(" + DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_TAREFA + ", " + 
                    DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_CATEGORIA + ")," +
                    "FOREIGN KEY (" + DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_TAREFA + ") REFERENCES " +
                    DatabaseContract.TarefaEntry.TABLE_NAME + "(" + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + ") ON DELETE CASCADE," +
                    "FOREIGN KEY (" + DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_CATEGORIA + ") REFERENCES " +
                    DatabaseContract.CategoriaEntry.TABLE_NAME + "(" + DatabaseContract.CategoriaEntry.COLUMN_ID_CATEGORIA + ") ON DELETE CASCADE" +
                    ");";

            // 8. Tabela comentarios
            String CREATE_COMENTARIOS_TABLE = "CREATE TABLE " + DatabaseContract.ComentarioEntry.TABLE_NAME + " (" +
                    DatabaseContract.ComentarioEntry.COLUMN_ID_COMENTARIO + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.ComentarioEntry.COLUMN_EMAIL + " TEXT NOT NULL," +
                    DatabaseContract.ComentarioEntry.COLUMN_ID_TAREFA + " INTEGER NOT NULL," +
                    DatabaseContract.ComentarioEntry.COLUMN_DESCRICAO + " TEXT NOT NULL," +
                    DatabaseContract.ComentarioEntry.COLUMN_DATA_CRIACAO + " DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    DatabaseContract.ComentarioEntry.COLUMN_DATA_ATUALIZACAO + " DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    "FOREIGN KEY (" + DatabaseContract.ComentarioEntry.COLUMN_EMAIL + ") REFERENCES " +
                    DatabaseContract.UsuarioEntry.TABLE_NAME + "(" + DatabaseContract.UsuarioEntry.COLUMN_EMAIL + ")," +
                    "FOREIGN KEY (" + DatabaseContract.ComentarioEntry.COLUMN_ID_TAREFA + ") REFERENCES " +
                    DatabaseContract.TarefaEntry.TABLE_NAME + "(" + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + ")" +
                    ");";

            // 9. Tabela anexos_tarefa
            String CREATE_ANEXOS_TABLE = "CREATE TABLE " + DatabaseContract.AnexoEntry.TABLE_NAME + " (" +
                    DatabaseContract.AnexoEntry.COLUMN_ID_ANEXO + " INTEGER PRIMARY KEY AUTOINCREMENT," +
                    DatabaseContract.AnexoEntry.COLUMN_ID_TAREFA + " INTEGER NOT NULL," +
                    DatabaseContract.AnexoEntry.COLUMN_TIPO_ARQUIVO + " TEXT CHECK(" + DatabaseContract.AnexoEntry.COLUMN_TIPO_ARQUIVO + " IN ('pdf', 'imagem')) NOT NULL," +
                    DatabaseContract.AnexoEntry.COLUMN_NOME_ARQUIVO + " TEXT NOT NULL," +
                    DatabaseContract.AnexoEntry.COLUMN_NOME_ORIGINAL + " TEXT NOT NULL," +
                    DatabaseContract.AnexoEntry.COLUMN_TAMANHO_ARQUIVO + " INTEGER NOT NULL," +
                    DatabaseContract.AnexoEntry.COLUMN_CAMINHO_ARQUIVO + " TEXT NOT NULL," +
                    DatabaseContract.AnexoEntry.COLUMN_DATA_UPLOAD + " DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    DatabaseContract.AnexoEntry.COLUMN_DATA_ATUALIZACAO + " DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    "UNIQUE(" + DatabaseContract.AnexoEntry.COLUMN_ID_TAREFA + ", " + DatabaseContract.AnexoEntry.COLUMN_TIPO_ARQUIVO + ")," +
                    "FOREIGN KEY (" + DatabaseContract.AnexoEntry.COLUMN_ID_TAREFA + ") REFERENCES " +
                    DatabaseContract.TarefaEntry.TABLE_NAME + "(" + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + ") ON DELETE CASCADE" +
                    ");";

            // 10. Tabela sync_metadata
            String CREATE_SYNC_TABLE = "CREATE TABLE " + DatabaseContract.SyncEntry.TABLE_NAME + " (" +
                    DatabaseContract.SyncEntry.COLUMN_TABLE_NAME + " TEXT PRIMARY KEY," +
                    DatabaseContract.SyncEntry.COLUMN_LAST_SYNC + " DATETIME," +
                    DatabaseContract.SyncEntry.COLUMN_PENDING_SYNC + " INTEGER DEFAULT 0" +
                    ");";

            // Executar todas as criações
            db.execSQL(CREATE_USUARIOS_TABLE);
            db.execSQL(CREATE_WORKSPACE_TABLE);
            db.execSQL(CREATE_USUARIO_WORKSPACE_TABLE);
            db.execSQL(CREATE_CATEGORIAS_TABLE);
            db.execSQL(CREATE_TAREFAS_TABLE);
            db.execSQL(CREATE_TAREFA_WORKSPACE_TABLE);
            db.execSQL(CREATE_TAREFA_CATEGORIA_TABLE);
            db.execSQL(CREATE_COMENTARIOS_TABLE);
            db.execSQL(CREATE_ANEXOS_TABLE);
            db.execSQL(CREATE_SYNC_TABLE);

            Log.i(TAG, "Todas as tabelas criadas com sucesso");

        } catch (Exception e) {
            Log.e(TAG, "Erro ao criar tabelas: " + e.getMessage());
        }
    }

    private void dropTables(SQLiteDatabase db) {
        try {
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.SyncEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.AnexoEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.ComentarioEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.TarefaCategoriaEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.TarefaEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.CategoriaEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.UsuarioWorkspaceEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.WorkspaceEntry.TABLE_NAME);
            db.execSQL("DROP TABLE IF EXISTS " + DatabaseContract.UsuarioEntry.TABLE_NAME);
            
            Log.i(TAG, "Todas as tabelas removidas");
        } catch (Exception e) {
            Log.e(TAG, "Erro ao remover tabelas: " + e.getMessage());
        }
    }

    public void clearDatabase() {
        SQLiteDatabase db = this.getWritableDatabase();
        dropTables(db);
        createTables(db);
        db.close();
    }

    public SQLiteDatabase getReadableDatabase() {
        return super.getReadableDatabase();
    }

    public SQLiteDatabase getWritableDatabase() {
        return super.getWritableDatabase();
    }
}
