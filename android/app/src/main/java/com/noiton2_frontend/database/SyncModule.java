package com.noiton2_frontend.database;

import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.AsyncTask;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SyncModule extends ReactContextBaseJavaModule {

    private final DBHelper dbHelper;
    private boolean syncing = false;

    public SyncModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        dbHelper = new DBHelper(reactContext);

        registerNetworkCallback(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "SyncModule";
    }

    // -------------------------------------------------------------------------
    // REGISTRA MONITORAMENTO DE Wi-Fi
    // -------------------------------------------------------------------------
    private void registerNetworkCallback(ReactApplicationContext context) {
        try {
            ConnectivityManager cm =
                    (ConnectivityManager) context.getSystemService(ConnectivityManager.class);

            cm.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(@NonNull Network network) {
                    if (isWifiConnected()) {
                        emitEvent("onWifiConnected", null);
                        startSyncInternal();
                    }
                }

                @Override
                public void onLost(@NonNull Network network) {
                    emitEvent("onWifiDisconnected", null);
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean isWifiConnected() {
        try {
            ConnectivityManager cm =
                    (ConnectivityManager) getReactApplicationContext().getSystemService(ConnectivityManager.class);

            Network network = cm.getActiveNetwork();
            if (network == null) return false;

            NetworkCapabilities caps = cm.getNetworkCapabilities(network);
            if (caps == null) return false;

            return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);

        } catch (Exception e) {
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // CHAMADO PELO JS (OU AUTOMATICAMENTE PELO WIFI)
    // -------------------------------------------------------------------------
    @ReactMethod
    public void startSync(Promise promise) {
        startSyncInternal();
        promise.resolve(true);
    }

    private void startSyncInternal() {
        if (!isWifiConnected()) return;
        if (syncing) return;

        syncing = true;

        emitEvent("onSyncStart", null);

        new SyncTask().execute();
    }

    // -------------------------------------------------------------------------
    // AsyncTask QUE FAZ O SYNC REAL
    // -------------------------------------------------------------------------
    private class SyncTask extends AsyncTask<Void, Void, Boolean> {

        private String errorMsg = null;

        @Override
        protected Boolean doInBackground(Void... voids) {
            try {

                DBModule dbModule = new DBModule(getReactApplicationContext());

                // Buscar todas as operações pendentes
                final Object lock = new Object();
                final String[] pendingOpsJson = new String[1];

                dbModule.getPendingOps(new Promise() {
                    @Override
                    public void resolve(Object value) {
                        pendingOpsJson[0] = value.toString();
                        synchronized (lock) {
                            lock.notify();
                        }
                    }

                    @Override
                    public void reject(String code, String message) {
                        errorMsg = message;
                        synchronized (lock) {
                            lock.notify();
                        }
                    }

                    @Override
                    public void reject(String code, Throwable e) { }

                    @Override
                    public void reject(String code, String message, Throwable e) { }

                    @Override
                    public void reject(Throwable reason) { }
                });

                synchronized (lock) { lock.wait(); }

                if (pendingOpsJson[0] == null) return true;

                JSONArray ops = new JSONArray(pendingOpsJson[0]);

                // Se não houver nada para sincronizar
                if (ops.length() == 0) {
                    System.out.println("📭 Nenhuma operação pendente para sincronizar");
                    return true;
                }

                System.out.println("📦 Enviando " + ops.length() + " operações em lote para o backend");

                // Enviar todas as operações de uma vez
                boolean success = sendAllOperationsToServer(ops);

                if (!success) {
                    errorMsg = "Erro ao enviar operações em lote para o servidor";
                    return false;
                }

                System.out.println("✅ Operações enviadas com sucesso! Limpando banco local...");

                // Se o envio foi bem-sucedido, limpar todas as operações do banco local
                for (int i = 0; i < ops.length(); i++) {
                    JSONObject op = ops.getJSONObject(i);
                    final String opId = op.getString("op_id");
                    final Object lock2 = new Object();

                    dbModule.removePendingOp(opId, new Promise() {
                        @Override
                        public void resolve(Object value) {
                            synchronized (lock2) {
                                lock2.notify();
                            }
                        }

                        @Override
                        public void reject(String code, String message) {
                            synchronized (lock2) {
                                lock2.notify();
                            }
                        }

                        @Override public void reject(String code, Throwable e) { }
                        @Override public void reject(String code, String message, Throwable e) { }
                        @Override public void reject(Throwable reason) { }
                    });

                    synchronized (lock2) { lock2.wait(); }
                }

                System.out.println("🧹 Banco local limpo. Sincronização completa!");

                return true;

            } catch (Exception e) {
                errorMsg = e.getMessage();
                return false;
            }
        }

        @Override
        protected void onPostExecute(Boolean success) {
            syncing = false;

            if (success) {
                emitEvent("onSyncSuccess", null);
            } else {
                WritableMap data = Arguments.createMap();
                data.putString("error", errorMsg);
                emitEvent("onSyncError", data);
            }
        }
    }

    // -------------------------------------------------------------------------
    // ENVIA TODAS AS OPERAÇÕES PARA O BACKEND EM LOTE
    // -------------------------------------------------------------------------
    private boolean sendAllOperationsToServer(JSONArray operations) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("http://192.168.15.14:3000/sync/offline");

            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000); // Aumentado para operações em lote
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            // Enviar array completo de operações
            OutputStream out = new BufferedOutputStream(conn.getOutputStream());
            out.write(operations.toString().getBytes());
            out.flush();
            out.close();

            System.out.println("📤 Enviando " + operations.length() + " operações para o backend...");

            int status = conn.getResponseCode();

            if (status >= 200 && status < 300) {
                // Ler resposta de sucesso
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream())
                );
                StringBuilder sb = new StringBuilder();
                String line;

                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }

                System.out.println("✅ Resposta do backend: " + sb.toString());
                return true;
            }

            // Ler erro para debug
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getErrorStream())
            );
            StringBuilder sb = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }

            System.out.println("❌ Erro backend: " + sb.toString());
            return false;

        } catch (Exception e) {
            System.out.println("❌ Erro de conexão: " + e.getMessage());
            return false;

        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    // -------------------------------------------------------------------------
    // EMITIR EVENTOS PARA O REACT NATIVE
    // -------------------------------------------------------------------------
    private void emitEvent(String eventName, WritableMap data) {
        try {
            getReactApplicationContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, data);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

