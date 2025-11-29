// android/app/src/main/java/com/noiton2_frontend/sync/SyncService.java
package com.noiton2_frontend.sync;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;

import com.noiton2_frontend.database.DatabaseHelper;
import com.noiton2_frontend.database.DatabaseContract;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@ReactModule(name = SyncService.NAME)
public class SyncService extends ReactContextBaseJavaModule {
    public static final String NAME = "SyncService";
    private static final String TAG = "SyncService";
    
    private final ReactApplicationContext reactContext;
    private DatabaseHelper databaseHelper;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    public SyncService(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.databaseHelper = new DatabaseHelper(reactContext);
        this.connectivityManager = (ConnectivityManager) reactContext.getSystemService(Context.CONNECTIVITY_SERVICE);
        setupNetworkMonitoring();
    }

    @Override
    public String getName() {
        return NAME;
    }

    /**
     * Configura monitoramento de rede
     */
    private void setupNetworkMonitoring() {
        try {
            NetworkRequest networkRequest = new NetworkRequest.Builder()
                    .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                    .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
                    .build();

            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(Network network) {
                    Log.i(TAG, "Rede disponível - WiFi ou Dados móveis");
                    syncPendingChanges();
                }

                @Override
                public void onLost(Network network) {
                    Log.i(TAG, "Rede perdida - Modo offline");
                    setOfflineMode(true);
                }
            };

            connectivityManager.registerNetworkCallback(networkRequest, networkCallback);
            Log.i(TAG, "Monitoramento de rede configurado");

        } catch (Exception e) {
            Log.e(TAG, "Erro ao configurar monitoramento de rede: " + e.getMessage());
        }
    }

    // =====================================================
    // 🌐 MÉTODOS DE REDE
    // =====================================================

    @ReactMethod
    public void isWifiConnected(Promise promise) {
        try {
            if (connectivityManager != null) {
                NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(
                        connectivityManager.getActiveNetwork()
                );
                
                boolean isWifi = capabilities != null && 
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
                
                promise.resolve(isWifi);
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao verificar WiFi: " + e.getMessage());
            promise.reject("WIFI_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        try {
            if (connectivityManager != null) {
                NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(
                        connectivityManager.getActiveNetwork()
                );
                
                boolean isConnected = capabilities != null && 
                    (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                     capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
                
                promise.resolve(isConnected);
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao verificar conexão: " + e.getMessage());
            promise.reject("CONNECTION_ERROR", e.getMessage());
        }
    }

    // =====================================================
    // 🗃️ MÉTODOS DO BANCO DE DADOS
    // =====================================================

    /**
     * Salva dados completos da sincronização (ALINHADO COM SEU BACKEND)
     */
    @ReactMethod
    public void saveFullSyncData(String dataJson, Promise promise) {
        SQLiteDatabase db = null;
        try {
            db = databaseHelper.getWritableDatabase();
            db.beginTransaction();

            JSONObject data = new JSONObject(dataJson);
            
            // Limpar dados antigos
            clearAllData(db);

            // 🟢 SALVAR WORKSPACES (do seu backend)
            if (data.has("workspaces")) {
                JSONArray workspaces = data.getJSONArray("workspaces");
                Log.i(TAG, "Salvando " + workspaces.length() + " workspaces");
                for (int i = 0; i < workspaces.length(); i++) {
                    saveWorkspace(db, workspaces.getJSONObject(i));
                }
            }

            // 🟢 CRIAR ASSOCIAÇÕES USUÁRIO-WORKSPACE
            // Quando sincronizamos, todos os workspaces retornados são do usuário logado
            if (data.has("workspaces") && data.has("user_email")) {
                String userEmail = data.getString("user_email");
                JSONArray workspaces = data.getJSONArray("workspaces");
                Log.i(TAG, "Criando " + workspaces.length() + " associações usuário-workspace para " + userEmail);
                for (int i = 0; i < workspaces.length(); i++) {
                    JSONObject workspace = workspaces.getJSONObject(i);
                    saveUsuarioWorkspace(db, userEmail, workspace.getInt("id_workspace"));
                }
            }

            // 🟢 SALVAR CATEGORIAS (do seu backend)
            if (data.has("categorias")) {
                JSONArray categorias = data.getJSONArray("categorias");
                Log.i(TAG, "Salvando " + categorias.length() + " categorias");
                for (int i = 0; i < categorias.length(); i++) {
                    saveCategoria(db, categorias.getJSONObject(i));
                }
            }

            // 🟢 SALVAR TAREFAS (do seu backend)
            if (data.has("tarefas")) {
                JSONArray tarefas = data.getJSONArray("tarefas");
                Log.i(TAG, "📋 Iniciando sincronização de " + tarefas.length() + " tarefas");
                
                for (int i = 0; i < tarefas.length(); i++) {
                    JSONObject tarefa = tarefas.getJSONObject(i);
                    
                    int idTarefa = tarefa.getInt("id_tarefa");
                    String titulo = tarefa.getString("titulo");
                    
                    Log.i(TAG, "📋 [" + (i+1) + "/" + tarefas.length() + "] Copiando tarefa ID " + idTarefa + ": " + titulo);
                    Log.i(TAG, "📋 Dados completos: " + tarefa.toString());
                    
                    // Salvar tarefa principal
                    saveTarefa(db, tarefa);
                    Log.i(TAG, "✅ Tarefa ID " + idTarefa + " salva no SQLite");
                    
                    // Criar associação tarefa-workspace se tiver id_workspace
                    if (tarefa.has("id_workspace")) {
                        int idWorkspace = tarefa.getInt("id_workspace");
                        saveTarefaWorkspace(db, idTarefa, idWorkspace);
                        Log.i(TAG, "🔗 Associação tarefa-workspace criada: tarefa " + idTarefa + " -> workspace " + idWorkspace);
                    }
                    
                    // Criar associações tarefa-categoria se tiver categorias
                    if (tarefa.has("categorias") && !tarefa.isNull("categorias")) {
                        JSONArray categorias = tarefa.getJSONArray("categorias");
                        Log.i(TAG, "🏷️ Associando " + categorias.length() + " categorias à tarefa " + idTarefa);
                        for (int j = 0; j < categorias.length(); j++) {
                            int idCategoria = categorias.getInt(j);
                            saveTarefaCategoria(db, idTarefa, idCategoria);
                            Log.i(TAG, "🏷️ Categoria " + idCategoria + " associada à tarefa " + idTarefa);
                        }
                    } else {
                        Log.i(TAG, "ℹ️ Tarefa " + idTarefa + " sem categorias associadas");
                    }
                }
                
                Log.i(TAG, "✅ Sincronização de tarefas concluída: " + tarefas.length() + " tarefas processadas");
            }

            // 🟢 SALVAR COMENTÁRIOS (do seu backend)
            if (data.has("comentarios")) {
                JSONArray comentarios = data.getJSONArray("comentarios");
                Log.i(TAG, "Salvando " + comentarios.length() + " comentarios");
                for (int i = 0; i < comentarios.length(); i++) {
                    saveComentario(db, comentarios.getJSONObject(i));
                }
            }

            // 🟢 SALVAR ANEXOS (do seu backend)
            if (data.has("anexos")) {
                JSONArray anexos = data.getJSONArray("anexos");
                Log.i(TAG, "Salvando " + anexos.length() + " anexos");
                for (int i = 0; i < anexos.length(); i++) {
                    saveAnexo(db, anexos.getJSONObject(i));
                }
            }

            db.setTransactionSuccessful();
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("message", "Dados sincronizados com sucesso");
            
            promise.resolve(result);
            Log.i(TAG, "✅ Dados de sync salvos no SQLite - Alinhado com backend");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao salvar dados sync: " + e.getMessage());
            promise.reject("SAVE_SYNC_ERROR", e.getMessage());
        } finally {
            if (db != null) {
                db.endTransaction();
            }
        }
    }

    /**
     * Executa operação genérica no banco
     */
    @ReactMethod
    public void executeDbOperation(String operation, String dataJson, Promise promise) {
        try {
            SQLiteDatabase db = databaseHelper.getWritableDatabase();
            JSONObject data = dataJson != null && !dataJson.isEmpty() ? new JSONObject(dataJson) : new JSONObject();
            WritableMap result = new WritableNativeMap();

            switch (operation) {
                case "get_workspaces_by_user":
                    result = getWorkspacesByUser(db, data.getString("email"));
                    break;
                    
                case "get_tarefas_by_workspace":
                    result = getTarefasByWorkspace(db, data.getInt("workspaceId"));
                    break;
                    
                case "get_tarefas_by_user":
                    result = getTarefasByUser(db, data.getInt("userId"));
                    break;
                    
                case "get_tarefa_by_id":
                    result = getTarefaById(db, data.getInt("id"));
                    break;
                    
                case "get_categorias_by_workspace":
                    result = getCategoriasByWorkspace(db, data.getInt("workspaceId"));
                    break;
                    
                case "get_comentarios_by_tarefa":
                    result = getComentariosByTarefa(db, data.getInt("tarefaId"));
                    break;
                    
                case "get_anexos_by_tarefa":
                    result = getAnexosByTarefa(db, data.getInt("tarefaId"));
                    break;
                    
                case "save_tarefa":
                    result = saveTarefaOperation(db, data);
                    break;
                    
                case "update_tarefa":
                    result = updateTarefaOperation(db, data);
                    break;
                    
                case "save_comentario":
                    result = saveComentarioOperation(db, data);
                    break;
                    
                case "get_all_user_data":
                    result = getAllUserData(db, data.getString("email"));
                    break;
                    
                case "get_database_stats":
                    result = getDatabaseStatsOperation(db);
                    break;
                    
                case "list_all_tarefas":
                    result = listAllTarefas(db);
                    break;
                    
                case "save_usuario":
                    result = saveUsuarioOperation(db, data);
                    break;
                    
                default:
                    result.putBoolean("success", false);
                    result.putString("error", "Operação não suportada: " + operation);
                    break;
            }

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Erro na operação " + operation + ": " + e.getMessage());
            WritableMap errorResult = new WritableNativeMap();
            errorResult.putBoolean("success", false);
            errorResult.putString("error", e.getMessage());
            promise.resolve(errorResult);
        }
    }

    /**
     * Limpa o banco SQLite
     */
    @ReactMethod
    public void clearLocalDatabase(Promise promise) {
        try {
            databaseHelper.clearDatabase();
            Log.i(TAG, "Banco local limpo com sucesso");
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("message", "Banco limpo com sucesso");
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao limpar banco local: " + e.getMessage());
            promise.reject("CLEAR_DB_ERROR", e.getMessage());
        }
    }

    /**
     * Retorna informações do banco local
     */
    @ReactMethod
    public void getDatabaseInfo(Promise promise) {
        try {
            WritableMap info = new WritableNativeMap();
            info.putString("name", databaseHelper.getDatabaseName());
            info.putString("path", reactContext.getDatabasePath(databaseHelper.getDatabaseName()).getPath());
            
            promise.resolve(info);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar info do banco: " + e.getMessage());
            promise.reject("DB_INFO_ERROR", e.getMessage());
        }
    }

    // =====================================================
    // 🔧 MÉTODOS PRIVADOS - OPERAÇÕES DE BANCO
    // =====================================================

    private void clearAllData(SQLiteDatabase db) {
        db.delete(DatabaseContract.ComentarioEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.AnexoEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.TarefaCategoriaEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.TarefaEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.CategoriaEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.UsuarioWorkspaceEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.WorkspaceEntry.TABLE_NAME, null, null);
        db.delete(DatabaseContract.UsuarioEntry.TABLE_NAME, null, null);
    }

    // 🟢 SALVAR WORKSPACE
    private void saveWorkspace(SQLiteDatabase db, JSONObject workspace) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE, workspace.getInt("id_workspace"));
        values.put(DatabaseContract.WorkspaceEntry.COLUMN_NOME, workspace.getString("nome"));
        values.put(DatabaseContract.WorkspaceEntry.COLUMN_EQUIPE, workspace.getBoolean("equipe") ? 1 : 0);
        values.put(DatabaseContract.WorkspaceEntry.COLUMN_CRIADOR, workspace.getString("criador"));
        
        db.insertWithOnConflict(DatabaseContract.WorkspaceEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 SALVAR CATEGORIA
    private void saveCategoria(SQLiteDatabase db, JSONObject categoria) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.CategoriaEntry.COLUMN_ID_CATEGORIA, categoria.getInt("id_categoria"));
        values.put(DatabaseContract.CategoriaEntry.COLUMN_NOME, categoria.getString("nome"));
        values.put(DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE, categoria.getInt("id_workspace"));
        
        db.insertWithOnConflict(DatabaseContract.CategoriaEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 SALVAR TAREFA
    private void saveTarefa(SQLiteDatabase db, JSONObject tarefa) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA, tarefa.getInt("id_tarefa"));
        values.put(DatabaseContract.TarefaEntry.COLUMN_TITULO, tarefa.getString("titulo"));
        values.put(DatabaseContract.TarefaEntry.COLUMN_DESCRICAO, tarefa.optString("descricao"));
        values.put(DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO, tarefa.getInt("id_usuario"));
        
        // Campos opcionais
        if (tarefa.has("data_fim") && !tarefa.isNull("data_fim")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_DATA_FIM, tarefa.getString("data_fim"));
        }
        if (tarefa.has("prioridade") && !tarefa.isNull("prioridade")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE, tarefa.getString("prioridade"));
        }
        if (tarefa.has("status") && !tarefa.isNull("status")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_STATUS, tarefa.getString("status"));
        }
        if (tarefa.has("concluida")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_CONCLUIDA, tarefa.getBoolean("concluida") ? 1 : 0);
        }
        if (tarefa.has("recorrente")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_RECORRENTE, tarefa.getBoolean("recorrente") ? 1 : 0);
        }
        if (tarefa.has("recorrencia") && !tarefa.isNull("recorrencia")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_RECORRENCIA, tarefa.getString("recorrencia"));
        }

        db.insertWithOnConflict(DatabaseContract.TarefaEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 ATUALIZAR TAREFA POR ID
    private void updateTarefa(SQLiteDatabase db, JSONObject data) throws JSONException {
        int id = data.getInt("id");
        ContentValues values = new ContentValues();
        
        // Atualizar apenas os campos fornecidos
        if (data.has("titulo") && !data.isNull("titulo")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_TITULO, data.getString("titulo"));
        }
        if (data.has("descricao")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_DESCRICAO, data.optString("descricao"));
        }
        if (data.has("data_fim")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_DATA_FIM, data.optString("data_fim"));
        }
        if (data.has("prioridade")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE, data.optString("prioridade"));
        }
        if (data.has("status")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_STATUS, data.optString("status"));
        }
        if (data.has("concluida")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_CONCLUIDA, data.getBoolean("concluida") ? 1 : 0);
        }
        if (data.has("recorrente")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_RECORRENTE, data.getBoolean("recorrente") ? 1 : 0);
        }
        if (data.has("recorrencia")) {
            values.put(DatabaseContract.TarefaEntry.COLUMN_RECORRENCIA, data.optString("recorrencia"));
        }

        String whereClause = DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + " = ?";
        String[] whereArgs = {String.valueOf(id)};
        
        int rowsAffected = db.update(DatabaseContract.TarefaEntry.TABLE_NAME, values, whereClause, whereArgs);
        
        if (rowsAffected == 0) {
            throw new RuntimeException("Tarefa não encontrada para atualizar: ID " + id);
        }
    }

    // 🟢 SALVAR COMENTÁRIO
    private void saveComentario(SQLiteDatabase db, JSONObject comentario) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.ComentarioEntry.COLUMN_ID_COMENTARIO, comentario.getInt("id_comentario"));
        values.put(DatabaseContract.ComentarioEntry.COLUMN_EMAIL, comentario.getString("email"));
        values.put(DatabaseContract.ComentarioEntry.COLUMN_ID_TAREFA, comentario.getInt("id_tarefa"));
        values.put(DatabaseContract.ComentarioEntry.COLUMN_DESCRICAO, comentario.getString("descricao"));
        
        // Campos opcionais
        if (comentario.has("data_criacao") && !comentario.isNull("data_criacao")) {
            values.put(DatabaseContract.ComentarioEntry.COLUMN_DATA_CRIACAO, comentario.getString("data_criacao"));
        }
        if (comentario.has("data_atualizacao") && !comentario.isNull("data_atualizacao")) {
            values.put(DatabaseContract.ComentarioEntry.COLUMN_DATA_ATUALIZACAO, comentario.getString("data_atualizacao"));
        }

        db.insertWithOnConflict(DatabaseContract.ComentarioEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 SALVAR ANEXO
    private void saveAnexo(SQLiteDatabase db, JSONObject anexo) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.AnexoEntry.COLUMN_ID_ANEXO, anexo.getInt("id_anexo"));
        values.put(DatabaseContract.AnexoEntry.COLUMN_ID_TAREFA, anexo.getInt("id_tarefa"));
        values.put(DatabaseContract.AnexoEntry.COLUMN_TIPO_ARQUIVO, anexo.getString("tipo_arquivo"));
        values.put(DatabaseContract.AnexoEntry.COLUMN_NOME_ARQUIVO, anexo.getString("nome_arquivo"));
        values.put(DatabaseContract.AnexoEntry.COLUMN_NOME_ORIGINAL, anexo.getString("nome_original"));
        values.put(DatabaseContract.AnexoEntry.COLUMN_TAMANHO_ARQUIVO, anexo.getInt("tamanho_arquivo"));
        values.put(DatabaseContract.AnexoEntry.COLUMN_CAMINHO_ARQUIVO, anexo.getString("caminho_arquivo"));
        
        // Campos opcionais
        if (anexo.has("data_upload") && !anexo.isNull("data_upload")) {
            values.put(DatabaseContract.AnexoEntry.COLUMN_DATA_UPLOAD, anexo.getString("data_upload"));
        }
        if (anexo.has("data_atualizacao") && !anexo.isNull("data_atualizacao")) {
            values.put(DatabaseContract.AnexoEntry.COLUMN_DATA_ATUALIZACAO, anexo.getString("data_atualizacao"));
        }

        db.insertWithOnConflict(DatabaseContract.AnexoEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 SALVAR ASSOCIAÇÃO USUÁRIO-WORKSPACE
    private void saveUsuarioWorkspace(SQLiteDatabase db, String email, int idWorkspace) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.UsuarioWorkspaceEntry.COLUMN_EMAIL, email);
        values.put(DatabaseContract.UsuarioWorkspaceEntry.COLUMN_ID_WORKSPACE, idWorkspace);
        
        db.insertWithOnConflict(DatabaseContract.UsuarioWorkspaceEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 SALVAR ASSOCIAÇÃO TAREFA-WORKSPACE
    private void saveTarefaWorkspace(SQLiteDatabase db, int idTarefa, int idWorkspace) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA, idTarefa);
        values.put(DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE, idWorkspace);
        
        db.insertWithOnConflict(DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // 🟢 SALVAR ASSOCIAÇÃO TAREFA-CATEGORIA
    private void saveTarefaCategoria(SQLiteDatabase db, int idTarefa, int idCategoria) throws JSONException {
        ContentValues values = new ContentValues();
        values.put(DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_TAREFA, idTarefa);
        values.put(DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_CATEGORIA, idCategoria);
        
        db.insertWithOnConflict(DatabaseContract.TarefaCategoriaEntry.TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // =====================================================
    // 🔍 MÉTODOS DE CONSULTA
    // =====================================================

    private WritableMap getWorkspacesByUser(SQLiteDatabase db, String email) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            String query = "SELECT w.* FROM " + DatabaseContract.WorkspaceEntry.TABLE_NAME + " w " +
                          "INNER JOIN " + DatabaseContract.UsuarioWorkspaceEntry.TABLE_NAME + " uw " +
                          "ON w." + DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE + " = uw." + DatabaseContract.UsuarioWorkspaceEntry.COLUMN_ID_WORKSPACE + " " +
                          "WHERE uw." + DatabaseContract.UsuarioWorkspaceEntry.COLUMN_EMAIL + " = ?";
            
            cursor = db.rawQuery(query, new String[]{email});
            
            WritableArray workspaces = new WritableNativeArray();
            while (cursor.moveToNext()) {
                WritableMap workspace = new WritableNativeMap();
                workspace.putInt("id_workspace", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.WorkspaceEntry.COLUMN_ID_WORKSPACE)));
                workspace.putString("nome", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.WorkspaceEntry.COLUMN_NOME)));
                workspace.putBoolean("equipe", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.WorkspaceEntry.COLUMN_EQUIPE)) == 1);
                workspace.putString("criador", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.WorkspaceEntry.COLUMN_CRIADOR)));
                workspaces.pushMap(workspace);
            }
            
            result.putBoolean("success", true);
            result.putArray("data", workspaces);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar workspaces: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }

    private WritableMap getTarefasByWorkspace(SQLiteDatabase db, int workspaceId) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            String query = "SELECT t.* FROM " + DatabaseContract.TarefaEntry.TABLE_NAME + " t " +
                          "INNER JOIN " + DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME + " tw " +
                          "ON t." + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + " = tw." + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA + " " +
                          "WHERE tw." + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(workspaceId)});
            
            WritableArray tarefas = new WritableNativeArray();
            while (cursor.moveToNext()) {
                WritableMap tarefa = new WritableNativeMap();
                tarefa.putInt("id_tarefa", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA)));
                tarefa.putString("titulo", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_TITULO)));
                tarefa.putString("descricao", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_DESCRICAO)));
                tarefa.putInt("id_usuario", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO)));
                tarefa.putInt("id_workspace", workspaceId); // ✅ Adicionar id_workspace ao resultado
                
                // Campos opcionais
                int dataFimIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_DATA_FIM);
                if (dataFimIndex >= 0 && !cursor.isNull(dataFimIndex)) {
                    tarefa.putString("data_fim", cursor.getString(dataFimIndex));
                }
                
                int prioridadeIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE);
                if (prioridadeIndex >= 0 && !cursor.isNull(prioridadeIndex)) {
                    tarefa.putString("prioridade", cursor.getString(prioridadeIndex));
                }
                
                int statusIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_STATUS);
                if (statusIndex >= 0 && !cursor.isNull(statusIndex)) {
                    tarefa.putString("status", cursor.getString(statusIndex));
                }
                
                int concluidaIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_CONCLUIDA);
                if (concluidaIndex >= 0) {
                    tarefa.putBoolean("concluida", cursor.getInt(concluidaIndex) == 1);
                }
                
                tarefas.pushMap(tarefa);
            }
            
            result.putBoolean("success", true);
            result.putArray("data", tarefas);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar tarefas: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }

    private WritableMap getTarefasByUser(SQLiteDatabase db, int userId) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            String query = "SELECT * FROM " + DatabaseContract.TarefaEntry.TABLE_NAME + " WHERE " + 
                          DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(userId)});
            
            WritableArray tarefas = new WritableNativeArray();
            while (cursor.moveToNext()) {
                WritableMap tarefa = new WritableNativeMap();
                tarefa.putInt("id_tarefa", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA)));
                tarefa.putString("titulo", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_TITULO)));
                tarefa.putString("descricao", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_DESCRICAO)));
                tarefa.putInt("id_usuario", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO)));
                tarefas.pushMap(tarefa);
            }
            
            result.putBoolean("success", true);
            result.putArray("data", tarefas);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar tarefas por usuário: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }
    
    /**
     * 🔍 BUSCAR TAREFA POR ID ESPECÍFICO
     * Método essencial para editTarefa e visualizaTarefa
     */
    private WritableMap getTarefaById(SQLiteDatabase db, int tarefaId) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            Log.i(TAG, "🔍 Buscando tarefa por ID: " + tarefaId);
            
            // Query principal da tarefa com JOIN para pegar id_workspace
            String query = "SELECT t.*, tw." + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE + " as id_workspace " +
                          "FROM " + DatabaseContract.TarefaEntry.TABLE_NAME + " t " +
                          "LEFT JOIN " + DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME + " tw " +
                          "ON t." + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + " = tw." + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA + " " +
                          "WHERE t." + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(tarefaId)});
            
            if (cursor.moveToFirst()) {
                WritableMap tarefa = new WritableNativeMap();
                
                // Campos obrigatórios
                tarefa.putInt("id_tarefa", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA)));
                tarefa.putString("titulo", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_TITULO)));
                tarefa.putString("descricao", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_DESCRICAO)));
                tarefa.putInt("id_usuario", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO)));
                
                // ID do workspace
                int workspaceIndex = cursor.getColumnIndex("id_workspace");
                if (workspaceIndex >= 0 && !cursor.isNull(workspaceIndex)) {
                    tarefa.putInt("id_workspace", cursor.getInt(workspaceIndex));
                }
                
                // Campos opcionais
                int dataFimIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_DATA_FIM);
                if (dataFimIndex >= 0 && !cursor.isNull(dataFimIndex)) {
                    tarefa.putString("data_fim", cursor.getString(dataFimIndex));
                }
                
                int prioridadeIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE);
                if (prioridadeIndex >= 0 && !cursor.isNull(prioridadeIndex)) {
                    tarefa.putString("prioridade", cursor.getString(prioridadeIndex));
                } else {
                    tarefa.putString("prioridade", "media"); // valor padrão
                }
                
                int statusIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_STATUS);
                if (statusIndex >= 0 && !cursor.isNull(statusIndex)) {
                    tarefa.putString("status", cursor.getString(statusIndex));
                } else {
                    tarefa.putString("status", "a_fazer"); // valor padrão
                }
                
                int concluidaIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_CONCLUIDA);
                if (concluidaIndex >= 0) {
                    tarefa.putBoolean("concluida", cursor.getInt(concluidaIndex) == 1);
                } else {
                    tarefa.putBoolean("concluida", false);
                }
                
                int recorrenteIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_RECORRENTE);
                if (recorrenteIndex >= 0) {
                    tarefa.putBoolean("recorrente", cursor.getInt(recorrenteIndex) == 1);
                } else {
                    tarefa.putBoolean("recorrente", false);
                }
                
                int recorrenciaIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_RECORRENCIA);
                if (recorrenciaIndex >= 0 && !cursor.isNull(recorrenciaIndex)) {
                    tarefa.putString("recorrencia", cursor.getString(recorrenciaIndex));
                }
                
                // Buscar categorias associadas
                WritableArray categorias = getCategoriasByTarefaId(db, tarefaId);
                tarefa.putArray("categorias", categorias);
                
                // Permissões padrão para modo offline
                tarefa.putBoolean("pode_editar", true);
                tarefa.putBoolean("pode_apagar", true);
                tarefa.putString("nivel_acesso", "full");
                
                Log.i(TAG, "✅ Tarefa " + tarefaId + " encontrada: " + cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_TITULO)));
                
                result.putBoolean("success", true);
                result.putMap("data", tarefa);
            } else {
                Log.w(TAG, "❌ Tarefa " + tarefaId + " não encontrada no SQLite");
                result.putBoolean("success", false);
                result.putString("error", "Tarefa não encontrada");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao buscar tarefa por ID " + tarefaId + ": " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }
    
    /**
     * 🏷️ BUSCAR CATEGORIAS DE UMA TAREFA ESPECÍFICA
     */
    private WritableArray getCategoriasByTarefaId(SQLiteDatabase db, int tarefaId) {
        WritableArray categorias = new WritableNativeArray();
        Cursor cursor = null;
        
        try {
            String query = "SELECT c.* FROM " + DatabaseContract.CategoriaEntry.TABLE_NAME + " c " +
                          "INNER JOIN " + DatabaseContract.TarefaCategoriaEntry.TABLE_NAME + " tc " +
                          "ON c." + DatabaseContract.CategoriaEntry.COLUMN_ID_CATEGORIA + " = tc." + DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_CATEGORIA + " " +
                          "WHERE tc." + DatabaseContract.TarefaCategoriaEntry.COLUMN_ID_TAREFA + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(tarefaId)});
            
            while (cursor.moveToNext()) {
                WritableMap categoria = new WritableNativeMap();
                categoria.putInt("id_categoria", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.CategoriaEntry.COLUMN_ID_CATEGORIA)));
                categoria.putString("nome", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.CategoriaEntry.COLUMN_NOME)));
                categoria.putInt("id_workspace", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE)));
                categorias.pushMap(categoria);
            }
            
            Log.i(TAG, "🏷️ Encontradas " + categorias.size() + " categorias para tarefa " + tarefaId);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar categorias da tarefa " + tarefaId + ": " + e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return categorias;
    }

    /**
     * 🗃️ LISTAR TODAS AS TAREFAS PARA DEBUG
     * Usado para verificar quais tarefas estão no SQLite
     */
    private WritableMap listAllTarefas(SQLiteDatabase db) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            Log.i(TAG, "🗃️ Listando TODAS as tarefas no SQLite para debug...");
            
            // Query para listar todas as tarefas com informações de workspace
            String query = "SELECT t.*, tw." + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_WORKSPACE + " as id_workspace " +
                          "FROM " + DatabaseContract.TarefaEntry.TABLE_NAME + " t " +
                          "LEFT JOIN " + DatabaseContract.TarefaWorkspaceEntry.TABLE_NAME + " tw " +
                          "ON t." + DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA + " = tw." + DatabaseContract.TarefaWorkspaceEntry.COLUMN_ID_TAREFA;
            
            cursor = db.rawQuery(query, null);
            
            WritableArray tarefas = new WritableNativeArray();
            int count = 0;
            
            while (cursor.moveToNext()) {
                count++;
                WritableMap tarefa = new WritableNativeMap();
                
                int idTarefa = cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_TAREFA));
                String titulo = cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_TITULO));
                
                tarefa.putInt("id_tarefa", idTarefa);
                tarefa.putString("titulo", titulo);
                tarefa.putString("descricao", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_DESCRICAO)));
                tarefa.putInt("id_usuario", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.TarefaEntry.COLUMN_ID_USUARIO)));
                
                // ID do workspace se existir
                int workspaceIndex = cursor.getColumnIndex("id_workspace");
                if (workspaceIndex >= 0 && !cursor.isNull(workspaceIndex)) {
                    tarefa.putInt("id_workspace", cursor.getInt(workspaceIndex));
                } else {
                    tarefa.putString("id_workspace", "NULL");
                }
                
                // Status e prioridade
                int statusIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_STATUS);
                if (statusIndex >= 0 && !cursor.isNull(statusIndex)) {
                    tarefa.putString("status", cursor.getString(statusIndex));
                } else {
                    tarefa.putString("status", "NULL");
                }
                
                int prioridadeIndex = cursor.getColumnIndex(DatabaseContract.TarefaEntry.COLUMN_PRIORIDADE);
                if (prioridadeIndex >= 0 && !cursor.isNull(prioridadeIndex)) {
                    tarefa.putString("prioridade", cursor.getString(prioridadeIndex));
                } else {
                    tarefa.putString("prioridade", "NULL");
                }
                
                tarefas.pushMap(tarefa);
                
                Log.i(TAG, "📋 [" + count + "] Tarefa: ID=" + idTarefa + ", Título=" + titulo + 
                          ", Workspace=" + (workspaceIndex >= 0 && !cursor.isNull(workspaceIndex) ? 
                          cursor.getInt(workspaceIndex) : "NULL"));
            }
            
            Log.i(TAG, "✅ Total de tarefas no SQLite: " + count);
            
            result.putBoolean("success", true);
            result.putArray("data", tarefas);
            result.putInt("total", count);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao listar todas as tarefas: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }
    
    private WritableMap getCategoriasByWorkspace(SQLiteDatabase db, int workspaceId) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            String query = "SELECT * FROM " + DatabaseContract.CategoriaEntry.TABLE_NAME + " WHERE " + 
                          DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(workspaceId)});
            
            WritableArray categorias = new WritableNativeArray();
            while (cursor.moveToNext()) {
                WritableMap categoria = new WritableNativeMap();
                categoria.putInt("id_categoria", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.CategoriaEntry.COLUMN_ID_CATEGORIA)));
                categoria.putString("nome", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.CategoriaEntry.COLUMN_NOME)));
                categoria.putInt("id_workspace", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.CategoriaEntry.COLUMN_ID_WORKSPACE)));
                categorias.pushMap(categoria);
            }
            
            result.putBoolean("success", true);
            result.putArray("data", categorias);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar categorias: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }
    
    private WritableMap getComentariosByTarefa(SQLiteDatabase db, int tarefaId) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            String query = "SELECT * FROM " + DatabaseContract.ComentarioEntry.TABLE_NAME + " WHERE " + 
                          DatabaseContract.ComentarioEntry.COLUMN_ID_TAREFA + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(tarefaId)});
            
            WritableArray comentarios = new WritableNativeArray();
            while (cursor.moveToNext()) {
                WritableMap comentario = new WritableNativeMap();
                comentario.putInt("id_comentario", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.ComentarioEntry.COLUMN_ID_COMENTARIO)));
                comentario.putString("email", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.ComentarioEntry.COLUMN_EMAIL)));
                comentario.putInt("id_tarefa", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.ComentarioEntry.COLUMN_ID_TAREFA)));
                comentario.putString("descricao", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.ComentarioEntry.COLUMN_DESCRICAO)));
                comentarios.pushMap(comentario);
            }
            
            result.putBoolean("success", true);
            result.putArray("data", comentarios);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar comentários: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }
    
    private WritableMap getAnexosByTarefa(SQLiteDatabase db, int tarefaId) {
        WritableMap result = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            String query = "SELECT * FROM " + DatabaseContract.AnexoEntry.TABLE_NAME + " WHERE " + 
                          DatabaseContract.AnexoEntry.COLUMN_ID_TAREFA + " = ?";
            
            cursor = db.rawQuery(query, new String[]{String.valueOf(tarefaId)});
            
            WritableArray anexos = new WritableNativeArray();
            while (cursor.moveToNext()) {
                WritableMap anexo = new WritableNativeMap();
                anexo.putInt("id_anexo", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.AnexoEntry.COLUMN_ID_ANEXO)));
                anexo.putInt("id_tarefa", cursor.getInt(cursor.getColumnIndexOrThrow(DatabaseContract.AnexoEntry.COLUMN_ID_TAREFA)));
                anexo.putString("nome_arquivo", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.AnexoEntry.COLUMN_NOME_ARQUIVO)));
                anexo.putString("caminho_arquivo", cursor.getString(cursor.getColumnIndexOrThrow(DatabaseContract.AnexoEntry.COLUMN_CAMINHO_ARQUIVO)));
                anexos.pushMap(anexo);
            }
            
            result.putBoolean("success", true);
            result.putArray("data", anexos);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar anexos: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        
        return result;
    }

    private WritableMap saveTarefaOperation(SQLiteDatabase db, JSONObject data) throws JSONException {
        WritableMap result = new WritableNativeMap();
        try {
            saveTarefa(db, data);
            result.putBoolean("success", true);
            result.putString("message", "Tarefa salva com sucesso");
        } catch (Exception e) {
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        }
        return result;
    }

    private WritableMap updateTarefaOperation(SQLiteDatabase db, JSONObject data) throws JSONException {
        WritableMap result = new WritableNativeMap();
        try {
            updateTarefa(db, data);
            result.putBoolean("success", true);
            result.putString("message", "Tarefa atualizada com sucesso");
        } catch (Exception e) {
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        }
        return result;
    }

    private WritableMap saveComentarioOperation(SQLiteDatabase db, JSONObject data) throws JSONException {
        WritableMap result = new WritableNativeMap();
        try {
            saveComentario(db, data);
            result.putBoolean("success", true);
            result.putString("message", "Comentário salvo com sucesso");
        } catch (Exception e) {
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        }
        return result;
    }

    private WritableMap saveUsuarioOperation(SQLiteDatabase db, JSONObject data) throws JSONException {
        WritableMap result = new WritableNativeMap();
        try {
            // Criar um usuário básico com os dados fornecidos
            ContentValues values = new ContentValues();
            
            if (data.has("email")) {
                values.put("email", data.getString("email"));
            }
            if (data.has("nome")) {
                values.put("nome", data.getString("nome"));
            } else if (data.has("email")) {
                // Extrair nome do email como fallback
                String email = data.getString("email");
                String nome = email.split("@")[0];
                values.put("nome", nome);
            }
            if (data.has("telefone")) {
                values.put("telefone", data.getString("telefone"));
            }

            // Por enquanto, apenas aceitar a operação sem salvar em tabela específica
            // pois o usuário pode já estar associado via usuario_workspace
            result.putBoolean("success", true);
            result.putString("message", "Usuário processado com sucesso");
        } catch (Exception e) {
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        }
        return result;
    }

    private WritableMap getAllUserData(SQLiteDatabase db, String email) {
        WritableMap result = new WritableNativeMap();
        
        try {
            WritableMap data = new WritableNativeMap();
            
            // Buscar workspaces
            WritableMap workspacesResult = getWorkspacesByUser(db, email);
            if (workspacesResult.getBoolean("success")) {
                data.putArray("workspaces", workspacesResult.getArray("data"));
            }
            
            // Buscar outras entidades...
            data.putArray("categorias", new WritableNativeArray());
            data.putArray("tarefas", new WritableNativeArray());
            data.putArray("comentarios", new WritableNativeArray());
            data.putArray("anexos", new WritableNativeArray());
            
            result.putBoolean("success", true);
            result.putMap("data", data);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar todos os dados: " + e.getMessage());
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
        }
        
        return result;
    }

    private WritableMap getDatabaseStatsOperation(SQLiteDatabase db) {
        WritableMap stats = new WritableNativeMap();
        Cursor cursor = null;
        
        try {
            // Contar workspaces
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + DatabaseContract.WorkspaceEntry.TABLE_NAME, null);
            cursor.moveToFirst();
            stats.putInt("workspaces", cursor.getInt(0));
            cursor.close();

            // Contar categorias
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + DatabaseContract.CategoriaEntry.TABLE_NAME, null);
            cursor.moveToFirst();
            stats.putInt("categorias", cursor.getInt(0));
            cursor.close();

            // Contar tarefas
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + DatabaseContract.TarefaEntry.TABLE_NAME, null);
            cursor.moveToFirst();
            stats.putInt("tarefas", cursor.getInt(0));
            cursor.close();

            // Contar comentários
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + DatabaseContract.ComentarioEntry.TABLE_NAME, null);
            cursor.moveToFirst();
            stats.putInt("comentarios", cursor.getInt(0));
            cursor.close();

            // Contar anexos
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + DatabaseContract.AnexoEntry.TABLE_NAME, null);
            cursor.moveToFirst();
            stats.putInt("anexos", cursor.getInt(0));
            cursor.close();

            stats.putBoolean("success", true);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao obter estatísticas: " + e.getMessage());
            stats.putBoolean("success", false);
            stats.putString("error", e.getMessage());
        } finally {
            if (cursor != null && !cursor.isClosed()) {
                cursor.close();
            }
        }
        
        return stats;
    }

    // =====================================================
    // 🔄 MÉTODOS DE SINCRONIZAÇÃO
    // =====================================================

    private void syncPendingChanges() {
        Log.i(TAG, "Iniciando sincronização de mudanças pendentes...");
        // TODO: Implementar quando tivermos operações pendentes
    }

    private void setOfflineMode(boolean offline) {
        Log.i(TAG, "Modo offline: " + offline);
        // TODO: Notificar React Native
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (connectivityManager != null && networkCallback != null) {
            connectivityManager.unregisterNetworkCallback(networkCallback);
        }
    }
}