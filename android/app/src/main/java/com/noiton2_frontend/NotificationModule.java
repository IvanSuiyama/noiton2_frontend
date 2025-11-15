package com.noiton2_frontend;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.util.Random;

public class NotificationModule extends ReactContextBaseJavaModule {
    
    private static final String CHANNEL_ID = "NOITON_TASK_CHANNEL";
    private static final String CHANNEL_NAME = "Noiton Task Notifications";
    private static final String CHANNEL_DESCRIPTION = "Notificações de tarefas do Noiton";
    
    private ReactApplicationContext reactContext;
    private NotificationManager notificationManager;

    public NotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.notificationManager = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public String getName() {
        return "NotificationModule";
    }

    /**
     * Criar canal de notificação (necessário para Android 8.0+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(CHANNEL_DESCRIPTION);
            channel.enableVibration(true);
            channel.enableLights(true);
            
            notificationManager.createNotificationChannel(channel);
        }
    }

    /**
     * Mostrar notificação local simples
     */
    @ReactMethod
    public void showNotification(String title, String message, Promise promise) {
        try {
            showNotificationWithData(title, message, null);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Notificação enviada com sucesso");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("NOTIFICATION_ERROR", "Erro ao enviar notificação: " + e.getMessage());
        }
    }

    /**
     * Mostrar notificação com dados customizados
     */
    @ReactMethod
    public void showNotificationWithExtras(ReadableMap notificationData, Promise promise) {
        try {
            String title = notificationData.hasKey("title") ? notificationData.getString("title") : "Noiton";
            String message = notificationData.hasKey("message") ? notificationData.getString("message") : "";
            String taskId = notificationData.hasKey("taskId") ? notificationData.getString("taskId") : null;
            String type = notificationData.hasKey("type") ? notificationData.getString("type") : "task_reminder";
            
            showNotificationWithData(title, message, notificationData);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Notificação personalizada enviada");
            result.putString("type", type);
            if (taskId != null) {
                result.putString("taskId", taskId);
            }
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("NOTIFICATION_ERROR", "Erro ao enviar notificação personalizada: " + e.getMessage());
        }
    }

    /**
     * Mostrar notificação de lembrete de tarefa
     */
    @ReactMethod
    public void showTaskReminder(ReadableMap taskData, Promise promise) {
        try {
            String title = taskData.hasKey("titulo") ? taskData.getString("titulo") : "Lembrete de Tarefa";
            String message = "Sua tarefa está próxima do prazo!";
            
            if (taskData.hasKey("data_fim")) {
                message = "Prazo: " + taskData.getString("data_fim");
            }
            
            // Criar intent para abrir a tarefa específica
            Intent intent = new Intent(reactContext, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            
            if (taskData.hasKey("id_tarefa")) {
                intent.putExtra("taskId", taskData.getInt("id_tarefa"));
                intent.putExtra("openTask", true);
            }
            
            PendingIntent pendingIntent = PendingIntent.getActivity(
                reactContext, 
                new Random().nextInt(), 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification) // Você precisa adicionar este ícone
                .setContentTitle("📋 " + title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 500, 200, 500})
                .setContentIntent(pendingIntent);
            
            // Adicionar ações na notificação
            addTaskNotificationActions(builder, taskData);
            
            int notificationId = new Random().nextInt();
            NotificationManagerCompat.from(reactContext).notify(notificationId, builder.build());
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Lembrete de tarefa enviado");
            result.putInt("notificationId", notificationId);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("TASK_REMINDER_ERROR", "Erro ao enviar lembrete: " + e.getMessage());
        }
    }

    /**
     * Cancelar notificação específica
     */
    @ReactMethod
    public void cancelNotification(int notificationId, Promise promise) {
        try {
            notificationManager.cancel(notificationId);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Notificação cancelada");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("CANCEL_ERROR", "Erro ao cancelar notificação: " + e.getMessage());
        }
    }

    /**
     * Cancelar todas as notificações
     */
    @ReactMethod
    public void cancelAllNotifications(Promise promise) {
        try {
            notificationManager.cancelAll();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Todas as notificações foram canceladas");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("CANCEL_ALL_ERROR", "Erro ao cancelar notificações: " + e.getMessage());
        }
    }

    /**
     * Verificar se notificações estão habilitadas
     */
    @ReactMethod
    public void checkNotificationPermission(Promise promise) {
        try {
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(reactContext);
            boolean isEnabled = notificationManager.areNotificationsEnabled();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("enabled", isEnabled);
            result.putString("status", isEnabled ? "granted" : "denied");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", "Erro ao verificar permissões: " + e.getMessage());
        }
    }

    /**
     * Solicitar permissões de notificação (Android 13+)
     */
    @ReactMethod
    public void requestNotificationPermission(Promise promise) {
        try {
            // Para Android 13+ (API 33), solicita permissão POST_NOTIFICATIONS
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Usar o getCurrentActivity() para abrir as configurações
                if (getCurrentActivity() != null) {
                    Intent intent = new Intent();
                    intent.setAction("android.settings.APP_NOTIFICATION_SETTINGS");
                    intent.putExtra("android.provider.extra.APP_PACKAGE", reactContext.getPackageName());
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getCurrentActivity().startActivity(intent);
                }
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Configurações de notificação abertas");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("REQUEST_PERMISSION_ERROR", "Erro ao solicitar permissões: " + e.getMessage());
        }
    }

    /**
     * Método auxiliar para mostrar notificação com dados
     */
    private void showNotificationWithData(String title, String message, ReadableMap data) {
        Intent intent = new Intent(reactContext, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            reactContext, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(reactContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);
        
        int notificationId = new Random().nextInt();
        NotificationManagerCompat.from(reactContext).notify(notificationId, builder.build());
    }

    /**
     * Adicionar ações específicas para notificações de tarefa
     */
    private void addTaskNotificationActions(NotificationCompat.Builder builder, ReadableMap taskData) {
        // Ação: Marcar como concluída
        Intent completeIntent = new Intent(reactContext, NotificationActionReceiver.class);
        completeIntent.setAction("COMPLETE_TASK");
        if (taskData.hasKey("id_tarefa")) {
            completeIntent.putExtra("taskId", taskData.getInt("id_tarefa"));
        }
        
        PendingIntent completePendingIntent = PendingIntent.getBroadcast(
            reactContext,
            new Random().nextInt(),
            completeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        builder.addAction(R.drawable.ic_check, "Concluir", completePendingIntent);
        
        // Ação: Adiar
        Intent snoozeIntent = new Intent(reactContext, NotificationActionReceiver.class);
        snoozeIntent.setAction("SNOOZE_TASK");
        if (taskData.hasKey("id_tarefa")) {
            snoozeIntent.putExtra("taskId", taskData.getInt("id_tarefa"));
        }
        
        PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
            reactContext,
            new Random().nextInt(),
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        builder.addAction(R.drawable.ic_snooze, "Adiar", snoozePendingIntent);
    }
}