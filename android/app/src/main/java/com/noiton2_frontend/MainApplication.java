package com.noiton2_frontend;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
// import com.facebook.react.ReactApplicationContext; // Removido - não é necessário aqui
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;

import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

// 1. IMPORTAR SEUS PACOTES MANUAIS (corrigidos)
import com.noiton2_frontend.CalendarPackage;
import com.noiton2_frontend.FilePickerPackage;
import com.noiton2_frontend.NotificationPackage;
import com.noiton2_frontend.GoogleSignInPackage;

// 2. IMPORTAR DATABASE HELPER E SYNC PACKAGE
import com.noiton2_frontend.database.DatabaseHelper;
import com.noiton2_frontend.SyncPackage;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          
          // 3. ADICIONAR PACOTES MANUAIS (como você já tinha)
          packages.add(new CalendarPackage());
          packages.add(new FilePickerPackage());
          packages.add(new NotificationPackage());
          packages.add(new GoogleSignInPackage());
          
          // 4. ADICIONAR SYNC SERVICE
          packages.add(new SyncPackage());

          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    
    // 5. INICIALIZAR O BANCO DE DADOS SQLITE
    DatabaseHelper dbHelper = new DatabaseHelper(this);
    // Isso criará o banco na primeira vez
    
    // ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
  }
}