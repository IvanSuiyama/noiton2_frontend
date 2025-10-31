package com.noiton2_frontend;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.widget.Toast;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

public class FilePickerModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final int FILE_PICKER_REQUEST_CODE = 999;
    private Promise pickerPromise;

    public FilePickerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
    }

    @Override
    public String getName() {
        return "FilePickerModule";
    }

    @ReactMethod
    public void pickFile(String type, Promise promise) {
        pickerPromise = promise;

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);

        if (type.equals("image")) {
            intent.setType("image/*");
        } else {
            intent.setType("application/pdf");
        }

        Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.startActivityForResult(intent, FILE_PICKER_REQUEST_CODE);
        } else {
            promise.reject("NO_ACTIVITY", "Nenhuma activity ativa.");
        }
    }

    @ReactMethod
    public void copyToTempFile(String contentUri, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Uri uri = Uri.parse(contentUri);
            
            // Obter informações do arquivo
            Cursor cursor = context.getContentResolver().query(uri, null, null, null, null);
            String fileName = "temp_file";
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameIndex >= 0) {
                    fileName = cursor.getString(nameIndex);
                    if (fileName == null) fileName = "temp_file";
                }
                cursor.close();
            }
            
            // Criar arquivo temporário
            File tempDir = new File(context.getCacheDir(), "temp");
            if (!tempDir.exists()) {
                tempDir.mkdirs();
            }
            
            File tempFile = new File(tempDir, fileName);
            
            // Copiar conteúdo
            InputStream inputStream = context.getContentResolver().openInputStream(uri);
            FileOutputStream outputStream = new FileOutputStream(tempFile);
            
            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) > 0) {
                outputStream.write(buffer, 0, length);
            }
            
            inputStream.close();
            outputStream.close();
            
            // Retornar caminho do arquivo temporário
            WritableMap result = Arguments.createMap();
            result.putString("uri", "file://" + tempFile.getAbsolutePath());
            result.putString("name", fileName);
            result.putDouble("size", tempFile.length());
            
            android.util.Log.d("FilePickerModule", "Arquivo copiado para: " + tempFile.getAbsolutePath());
            promise.resolve(result);
            
        } catch (Exception e) {
            android.util.Log.e("FilePickerModule", "Erro ao copiar arquivo: " + e.getMessage());
            promise.reject("COPY_ERROR", "Erro ao copiar arquivo: " + e.getMessage());
        }
    }

    @ReactMethod
    public void downloadFile(String url, String fileName, String authToken, Promise promise) {
        android.util.Log.d("FilePickerModule", "Iniciando download: " + url);
        
        try {
            Context context = getReactApplicationContext();
            
            // Usar DownloadManager do Android
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            
            // Adicionar headers de autenticação se fornecido
            if (authToken != null && !authToken.isEmpty()) {
                request.addRequestHeader("Authorization", "Bearer " + authToken);
                android.util.Log.d("FilePickerModule", "Token de auth adicionado");
            }
            
            // Configurar o download
            request.setTitle("Download - " + fileName);
            request.setDescription("Baixando arquivo...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            
            // Iniciar o download
            DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager != null) {
                long downloadId = downloadManager.enqueue(request);
                
                android.util.Log.d("FilePickerModule", "Download iniciado com ID: " + downloadId);
                
                // Mostrar toast para o usuário
                Activity activity = getCurrentActivity();
                if (activity != null) {
                    activity.runOnUiThread(() -> {
                        Toast.makeText(context, "Download iniciado: " + fileName, Toast.LENGTH_SHORT).show();
                    });
                }
                
                // Retornar sucesso
                WritableMap result = Arguments.createMap();
                result.putString("status", "started");
                result.putString("downloadId", String.valueOf(downloadId));
                result.putString("fileName", fileName);
                promise.resolve(result);
                
            } else {
                promise.reject("DOWNLOAD_ERROR", "DownloadManager não disponível");
            }
            
        } catch (Exception e) {
            android.util.Log.e("FilePickerModule", "Erro no download: " + e.getMessage());
            promise.reject("DOWNLOAD_ERROR", "Erro ao iniciar download: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, @Nullable Intent data) {
        if (requestCode == FILE_PICKER_REQUEST_CODE && pickerPromise != null) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                Uri uri = data.getData();
                if (uri != null) {
                    try {
                        WritableMap fileInfo = Arguments.createMap();
                        fileInfo.putString("uri", uri.toString());
                        
                        // Log para debug
                        android.util.Log.d("FilePickerModule", "URI selecionada: " + uri.toString());
                        
                        // Obter informações do arquivo
                        Cursor cursor = activity.getContentResolver().query(uri, null, null, null, null);
                        if (cursor != null && cursor.moveToFirst()) {
                            try {
                                // Obter nome do arquivo
                                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                                String fileName = "arquivo";
                                if (nameIndex >= 0) {
                                    fileName = cursor.getString(nameIndex);
                                    if (fileName == null) fileName = "arquivo";
                                }
                                fileInfo.putString("name", fileName);
                                android.util.Log.d("FilePickerModule", "Nome do arquivo: " + fileName);
                                
                                // Obter tamanho do arquivo
                                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                                long fileSize = 0;
                                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
                                    fileSize = cursor.getLong(sizeIndex);
                                }
                                fileInfo.putDouble("size", (double) fileSize);
                                android.util.Log.d("FilePickerModule", "Tamanho do arquivo: " + fileSize + " bytes");
                                
                            } catch (Exception e) {
                                android.util.Log.e("FilePickerModule", "Erro ao ler dados do cursor: " + e.getMessage());
                                fileInfo.putString("name", "arquivo");
                                fileInfo.putDouble("size", 0);
                            } finally {
                                cursor.close();
                            }
                        } else {
                            android.util.Log.w("FilePickerModule", "Cursor nulo ou vazio");
                            fileInfo.putString("name", "arquivo");
                            fileInfo.putDouble("size", 0);
                        }
                        
                        android.util.Log.d("FilePickerModule", "Resolvendo promise com: " + fileInfo.toString());
                        pickerPromise.resolve(fileInfo);
                    } catch (Exception e) {
                        pickerPromise.reject("FILE_INFO_ERROR", "Erro ao obter informações do arquivo: " + e.getMessage());
                    }
                } else {
                    pickerPromise.reject("NO_URI", "URI do arquivo não encontrada");
                }
            } else {
                pickerPromise.reject("PICKER_CANCELLED", "Seleção cancelada");
            }
        }
    }

    @Override
    public void onNewIntent(Intent intent) {}
}
