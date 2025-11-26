package com.noiton2_frontend.auth;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AuthModule extends ReactContextBaseJavaModule {

    private SharedPreferences prefs;

    public AuthModule(ReactApplicationContext reactContext) {
        super(reactContext);

        try {
            String masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);

            prefs = EncryptedSharedPreferences.create(
                    "auth_secure_storage",
                    masterKeyAlias,
                    reactContext,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );

        } catch (Exception e) {
            e.printStackTrace();
            prefs = reactContext.getSharedPreferences("fallback_auth", Context.MODE_PRIVATE);
        }
    }

    @Override
    public String getName() {
        return "AuthModule";
    }

    @ReactMethod
    public void saveToken(String token, Promise promise) {
        prefs.edit().putString("jwt_token", token).apply();
        promise.resolve(true);
    }

    @ReactMethod
    public void getToken(Promise promise) {
        String token = prefs.getString("jwt_token", null);
        promise.resolve(token);
    }

    @ReactMethod
    public void clearToken(Promise promise) {
        prefs.edit().remove("jwt_token").apply();
        promise.resolve(true);
    }

    @ReactMethod
    public void saveUser(String userJson, Promise promise) {
        prefs.edit().putString("user_data", userJson).apply();
        promise.resolve(true);
    }

    @ReactMethod
    public void getUser(Promise promise) {
        String data = prefs.getString("user_data", null);
        promise.resolve(data);
    }
}

