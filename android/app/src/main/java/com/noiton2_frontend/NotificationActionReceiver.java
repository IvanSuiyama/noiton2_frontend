package com.noiton2_frontend;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;

public class NotificationActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        int taskId = intent.getIntExtra("taskId", -1);

        if (action != null) {
            switch (action) {
                case "COMPLETE_TASK":
                    handleCompleteTask(context, taskId);
                    break;
                case "SNOOZE_TASK":
                    handleSnoozeTask(context, taskId);
                    break;
            }
        }
    }

    private void handleCompleteTask(Context context, int taskId) {
        // Enviar evento para o React Native
        sendEventToReactNative(context, "onTaskCompleteFromNotification", taskId);
        
        // Mostrar feedback ao usuário
        Toast.makeText(context, "Tarefa marcada como concluída!", Toast.LENGTH_SHORT).show();
    }

    private void handleSnoozeTask(Context context, int taskId) {
        // Enviar evento para o React Native
        sendEventToReactNative(context, "onTaskSnoozeFromNotification", taskId);
        
        // Mostrar feedback ao usuário
        Toast.makeText(context, "Tarefa adiada por 1 hora", Toast.LENGTH_SHORT).show();
    }

    private void sendEventToReactNative(Context context, String eventName, int taskId) {
        try {
            ReactApplication app = (ReactApplication) context.getApplicationContext();
            ReactInstanceManager reactInstanceManager = app.getReactNativeHost().getReactInstanceManager();
            ReactContext reactContext = reactInstanceManager.getCurrentReactContext();

            if (reactContext != null) {
                WritableMap params = Arguments.createMap();
                params.putInt("taskId", taskId);
                params.putString("action", eventName);

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}