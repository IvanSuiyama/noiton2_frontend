package com.noiton2_frontend.database;

import androidx.annotation.NonNull;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.UUID;

public class DBModule extends ReactContextBaseJavaModule {

    private final DBHelper dbHelper;

    public DBModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        dbHelper = new DBHelper(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "DBModule";
    }

    // ---------------------------------------------------------------------
    // 1. INSERT TASK
    // ---------------------------------------------------------------------
    @ReactMethod
    public void insertTask(String taskJson, Promise promise) {
        try {
            JSONObject task = new JSONObject(taskJson);
            String localId = UUID.randomUUID().toString();
            long now = System.currentTimeMillis();

            SQLiteDatabase db = dbHelper.getWritableDatabase();

            ContentValues cv = new ContentValues();
            cv.put("id", localId);
            cv.put("server_id", (String) null);
            cv.put("title", task.optString("title"));
            cv.put("description", task.optString("description"));
            cv.put("completed", task.optBoolean("completed", false) ? 1 : 0);
            cv.put("updated_at", now);
            cv.put("dirty", 1);

            db.insertOrThrow("tasks", null, cv);

            // Criar operação pendente
            ContentValues op = new ContentValues();
            op.put("op_id", UUID.randomUUID().toString());
            op.put("op_type", "CREATE");
            op.put("entity", "task");
            op.put("entity_id", localId);
            op.put("payload", taskJson);
            op.put("client_ts", now);

            db.insertOrThrow("pending_ops", null, op);

            promise.resolve(localId);

        } catch (Exception e) {
            promise.reject("INSERT_TASK_ERROR", e.getMessage());
        }
    }

    // ---------------------------------------------------------------------
    // 2. UPDATE TASK
    // ---------------------------------------------------------------------
    @ReactMethod
    public void updateTask(String taskJson, Promise promise) {
        try {
            JSONObject task = new JSONObject(taskJson);
            String id = task.getString("id");
            long now = System.currentTimeMillis();

            SQLiteDatabase db = dbHelper.getWritableDatabase();

            ContentValues cv = new ContentValues();
            cv.put("title", task.optString("title"));
            cv.put("description", task.optString("description"));
            cv.put("completed", task.optBoolean("completed", false) ? 1 : 0);
            cv.put("updated_at", now);
            cv.put("dirty", 1);

            db.update("tasks", cv, "id=?", new String[]{id});

            // Registrar operação pendente
            ContentValues op = new ContentValues();
            op.put("op_id", UUID.randomUUID().toString());
            op.put("op_type", "UPDATE");
            op.put("entity", "task");
            op.put("entity_id", id);
            op.put("payload", taskJson);
            op.put("client_ts", now);

            db.insertOrThrow("pending_ops", null, op);

            promise.resolve(true);

        } catch (Exception e) {
            promise.reject("UPDATE_TASK_ERROR", e.getMessage());
        }
    }

    // ---------------------------------------------------------------------
    // 3. DELETE TASK
    // ---------------------------------------------------------------------
    @ReactMethod
    public void deleteTask(String taskId, Promise promise) {
        try {
            long now = System.currentTimeMillis();
            SQLiteDatabase db = dbHelper.getWritableDatabase();

            // Deleta local
            db.delete("tasks", "id=?", new String[]{taskId});

            // Adiciona operação pendente
            ContentValues op = new ContentValues();
            op.put("op_id", UUID.randomUUID().toString());
            op.put("op_type", "DELETE");
            op.put("entity", "task");
            op.put("entity_id", taskId);
            op.put("payload", "{}");
            op.put("client_ts", now);

            db.insertOrThrow("pending_ops", null, op);

            promise.resolve(true);

        } catch (Exception e) {
            promise.reject("DELETE_TASK_ERROR", e.getMessage());
        }
    }

    // ---------------------------------------------------------------------
    // 4. OBTER TODAS AS TASKS (para carregar no app)
    // ---------------------------------------------------------------------
    @ReactMethod
    public void getAllTasks(Promise promise) {
        try {
            SQLiteDatabase db = dbHelper.getReadableDatabase();
            Cursor cursor = db.rawQuery("SELECT * FROM tasks", null);

            JSONArray arr = new JSONArray();

            while (cursor.moveToNext()) {
                JSONObject obj = new JSONObject();
                obj.put("id", cursor.getString(cursor.getColumnIndexOrThrow("id")));
                obj.put("server_id", cursor.getString(cursor.getColumnIndexOrThrow("server_id")));
                obj.put("title", cursor.getString(cursor.getColumnIndexOrThrow("title")));
                obj.put("description", cursor.getString(cursor.getColumnIndexOrThrow("description")));
                obj.put("completed", cursor.getInt(cursor.getColumnIndexOrThrow("completed")) == 1);
                obj.put("updated_at", cursor.getLong(cursor.getColumnIndexOrThrow("updated_at")));
                obj.put("dirty", cursor.getInt(cursor.getColumnIndexOrThrow("dirty")));

                arr.put(obj);
            }
            cursor.close();

            promise.resolve(arr.toString());

        } catch (Exception e) {
            promise.reject("GET_TASKS_ERROR", e.getMessage());
        }
    }

    // ---------------------------------------------------------------------
    // 5. PEGAR TODAS AS OPERAÇÕES PENDENTES (SyncModule usa isso)
    // ---------------------------------------------------------------------
    @ReactMethod
    public void getPendingOps(Promise promise) {
        try {
            SQLiteDatabase db = dbHelper.getReadableDatabase();
            Cursor cursor = db.rawQuery("SELECT * FROM pending_ops ORDER BY client_ts ASC", null);

            JSONArray arr = new JSONArray();
            while (cursor.moveToNext()) {
                JSONObject obj = new JSONObject();
                obj.put("op_id", cursor.getString(cursor.getColumnIndexOrThrow("op_id")));
                obj.put("op_type", cursor.getString(cursor.getColumnIndexOrThrow("op_type")));
                obj.put("entity", cursor.getString(cursor.getColumnIndexOrThrow("entity")));
                obj.put("entity_id", cursor.getString(cursor.getColumnIndexOrThrow("entity_id")));
                obj.put("payload", cursor.getString(cursor.getColumnIndexOrThrow("payload")));
                obj.put("client_ts", cursor.getLong(cursor.getColumnIndexOrThrow("client_ts")));
                obj.put("retry_count", cursor.getInt(cursor.getColumnIndexOrThrow("retry_count")));

                arr.put(obj);
            }
            cursor.close();

            promise.resolve(arr.toString());

        } catch (Exception e) {
            promise.reject("GET_PENDING_OPS_ERROR", e.getMessage());
        }
    }

    // ---------------------------------------------------------------------
    // 6. REMOVER OPERAÇÃO PENDENTE APÓS SUCESSO NO SYNC
    // ---------------------------------------------------------------------
    @ReactMethod
    public void removePendingOp(String opId, Promise promise) {
        try {
            SQLiteDatabase db = dbHelper.getWritableDatabase();
            db.delete("pending_ops", "op_id=?", new String[]{opId});
            promise.resolve(true);

        } catch (Exception e) {
            promise.reject("REMOVE_PENDING_OP_ERROR", e.getMessage());
        }
    }
}

