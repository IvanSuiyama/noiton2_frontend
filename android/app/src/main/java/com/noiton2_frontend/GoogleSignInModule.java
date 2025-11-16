package com.noiton2_frontend;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

public class GoogleSignInModule extends ReactContextBaseJavaModule {
    
    private static final String MODULE_NAME = "GoogleSignInModule";
    private static final int RC_SIGN_IN = 9001;
    private static final String TAG = "GoogleSignInModule";
    
    private GoogleSignInClient mGoogleSignInClient;
    private Promise mSignInPromise;
    
    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
            if (requestCode == RC_SIGN_IN) {
                handleSignInResult(intent);
            }
        }
    };

    public GoogleSignInModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(mActivityEventListener);
        
        // Configurar Google Sign-In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build();
        
        mGoogleSignInClient = GoogleSignIn.getClient(reactContext, gso);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Iniciar processo de login com Google
     */
    @ReactMethod
    public void signIn(Promise promise) {
        Activity currentActivity = getCurrentActivity();
        
        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "Activity não encontrada");
            return;
        }
        
        mSignInPromise = promise;
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        currentActivity.startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    /**
     * Fazer logout do Google
     */
    @ReactMethod
    public void signOut(Promise promise) {
        mGoogleSignInClient.signOut()
            .addOnCompleteListener(task -> {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "Logout realizado com sucesso");
                promise.resolve(result);
            });
    }

    /**
     * Verificar se usuário está logado
     */
    @ReactMethod
    public void getCurrentUser(Promise promise) {
        GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(getReactApplicationContext());
        
        if (account != null) {
            WritableMap userInfo = Arguments.createMap();
            userInfo.putString("id", account.getId());
            userInfo.putString("name", account.getDisplayName());
            userInfo.putString("email", account.getEmail());
            userInfo.putString("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);
            userInfo.putBoolean("isSignedIn", true);
            
            promise.resolve(userInfo);
        } else {
            WritableMap result = Arguments.createMap();
            result.putBoolean("isSignedIn", false);
            promise.resolve(result);
        }
    }

    /**
     * Processar resultado do login
     */
    private void handleSignInResult(Intent data) {
        if (mSignInPromise == null) {
            Log.w(TAG, "Promise é null, não é possível resolver resultado");
            return;
        }
        
        try {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            GoogleSignInAccount account = task.getResult(ApiException.class);
            
            // Login bem-sucedido - estrutura corrigida para o frontend
            WritableMap user = Arguments.createMap();
            user.putString("id", account.getId());
            user.putString("name", account.getDisplayName());
            user.putString("email", account.getEmail());
            user.putString("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putMap("user", user);
            
            Log.d(TAG, "Login com Google bem-sucedido: " + account.getEmail());
            mSignInPromise.resolve(result);
            
        } catch (ApiException e) {
            Log.w(TAG, "Falha no login com Google, código: " + e.getStatusCode());
            
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", "Falha no login com Google");
            error.putInt("statusCode", e.getStatusCode());
            
            mSignInPromise.resolve(error);
        } finally {
            mSignInPromise = null;
        }
    }
}