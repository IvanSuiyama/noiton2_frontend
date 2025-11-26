package com.noiton2_frontend.database;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DBHelper extends SQLiteOpenHelper {

    private static final String DB_NAME = "offline.db";
    private static final int DB_VERSION = 1;

    public DBHelper(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {

        // Tabela de tarefas
        db.execSQL(
            "CREATE TABLE tasks (" +
                "id TEXT PRIMARY KEY," +
                "server_id TEXT," +
                "title TEXT," +
                "description TEXT," +
                "completed INTEGER DEFAULT 0," +
                "updated_at INTEGER," +
                "dirty INTEGER DEFAULT 0" +
            ");"
        );

        // Tabela de operações pendentes
        db.execSQL(
            "CREATE TABLE pending_ops (" +
                "op_id TEXT PRIMARY KEY," +
                "op_type TEXT," +
                "entity TEXT," +
                "entity_id TEXT," +
                "payload TEXT," +
                "client_ts INTEGER," +
                "retry_count INTEGER DEFAULT 0" +
            ");"
        );

        // Índices recomendados para performance
        db.execSQL("CREATE INDEX idx_pending_entity ON pending_ops(entity_id);");
        db.execSQL("CREATE INDEX idx_tasks_dirty ON tasks(dirty);");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Se no futuro precisar atualizar o schema,
        // você vai colocar migrações aqui, por exemplo:
        // if (oldVersion < 2) { ... }
    }
}
