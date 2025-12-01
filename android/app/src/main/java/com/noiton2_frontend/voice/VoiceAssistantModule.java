package com.noiton2_frontend.voice;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.Locale;

import javax.annotation.Nullable;

public class VoiceAssistantModule extends ReactContextBaseJavaModule implements TextToSpeech.OnInitListener {

    public static final String NAME = "VoiceAssistant";
    private static final String TAG = "VoiceAssistant";

    private TextToSpeech tts;
    private SpeechRecognizer speechRecognizer;
    private final ReactApplicationContext reactContext;
    private boolean isTtsReady = false;

    public VoiceAssistantModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        
        // Inicializa o sistema de FALA (TTS)
        tts = new TextToSpeech(reactContext, this);
        
        // O Reconhecimento de voz deve ser inicializado na Thread Principal
        new Handler(Looper.getMainLooper()).post(() -> {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext);
            speechRecognizer.setRecognitionListener(new VoiceRecognitionListener());
        });
    }

    @Override
    public String getName() {
        return NAME;
    }

    // ==========================================================
    // 🗣️ PARTE DE FALAR (Text-To-Speech)
    // ==========================================================

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            // Configura para Português do Brasil
            int result = tts.setLanguage(new Locale("pt", "BR"));

            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "Linguagem não suportada ou dados faltando");
            } else {
                isTtsReady = true;
            }
        } else {
            Log.e(TAG, "Falha na inicialização do TTS");
        }
    }

    @ReactMethod
    public void speak(String text) {
        if (isTtsReady && text != null) {
            // O código 'QUEUE_FLUSH' interrompe a fala anterior e começa a nova imediatamente
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
        }
    }

    @ReactMethod
    public void stopSpeaking() {
        if (tts != null) {
            tts.stop();
        }
    }

    // ==========================================================
    // 👂 PARTE DE OUVIR (Speech-To-Text)
    // ==========================================================

    @ReactMethod
    public void startListening() {
        // Precisamos rodar isso na Thread Principal do Android
        new Handler(Looper.getMainLooper()).post(() -> {
            if (speechRecognizer != null) {
                try {
                    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
                    intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5); // Pega as 5 melhores tentativas

                    speechRecognizer.cancel(); // Cancela escutas anteriores
                    speechRecognizer.startListening(intent);
                    Log.d(TAG, "Começou a ouvir...");
                } catch (Exception e) {
                    Log.e(TAG, "Erro ao iniciar escuta: " + e.getMessage());
                }
            }
        });
    }

    @ReactMethod
    public void stopListening() {
        new Handler(Looper.getMainLooper()).post(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
            }
        });
    }

    // ==========================================================
    // 📡 ENVIAR EVENTOS PARA O REACT NATIVE
    // ==========================================================

    private void sendEvent(String eventName, @Nullable Object data) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, data);
        }
    }

    // Classe interna que ouve o microfone e processa os resultados
    private class VoiceRecognitionListener implements RecognitionListener {
        @Override
        public void onReadyForSpeech(Bundle params) {
            sendEvent("onVoiceStart", null);
        }

        @Override
        public void onBeginningOfSpeech() {
            // Usuário começou a falar
        }

        @Override
        public void onRmsChanged(float rmsdB) {
            // Volume da voz mudando (pode usar para animação de ondinhas)
        }

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {
            sendEvent("onVoiceEnd", null);
        }

        @Override
        public void onError(int error) {
            String message = getErrorText(error);
            Log.e(TAG, "Erro de voz: " + message);
            sendEvent("onVoiceError", message);
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches != null && matches.size() > 0) {
                // Envia o melhor resultado (o primeiro da lista) e a lista completa
                WritableMap params = Arguments.createMap();
                WritableArray array = Arguments.createArray();
                for (String match : matches) {
                    array.pushString(match);
                }
                params.putArray("results", array);
                params.putString("bestMatch", matches.get(0));
                
                sendEvent("onVoiceResults", params);
            }
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            // Resultados parciais enquanto fala (opcional)
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }

    // Ajuda a transformar códigos de erro numéricos em texto
    private String getErrorText(int errorCode) {
        switch (errorCode) {
            case SpeechRecognizer.ERROR_AUDIO: return "Erro de áudio";
            case SpeechRecognizer.ERROR_CLIENT: return "Erro no cliente";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Sem permissão de microfone";
            case SpeechRecognizer.ERROR_NETWORK: return "Erro de rede";
            case SpeechRecognizer.ERROR_NO_MATCH: return "Não entendi nada";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "O sistema está ocupado";
            default: return "Erro desconhecido";
        }
    }
}
