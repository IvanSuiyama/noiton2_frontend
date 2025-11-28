package com.noiton2_frontend;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactApplicationContext;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;

import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

// 1. IMPORTAR SEUS PACOTES MANUAIS
import com.noiton2_frontend.calendar.CalendarPackage;
import com.noiton2_frontend.filepicker.FilePickerPackage;
import com.noiton2_frontend.notification.NotificationPackage;
import com.noiton2_frontend.googlesignin.GoogleSignInPackage;

// 2. IMPORTAR O NOVO SYNC SERVICE
import com.noiton2_frontend.sync.SyncService;
import com.noiton2_frontend.database.DatabaseHelper;

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
          
          // 4. ADICIONAR NOSSO NOVO PACOTE COM SYNC SERVICE
          packages.add(new ReactPackage() {
            @Override
            public List<com.facebook.react.uimanager.ViewManager> createViewManagers(ReactApplicationContext reactContext) {
              return Collections.emptyList();
            }

            @Override
            public List<com.facebook.react.bridge.NativeModule> createNativeModules(ReactApplicationContext reactContext) {
              List<com.facebook.react.bridge.NativeModule> modules = new ArrayList<>();
              // Registrar nosso SyncService como Native Module
              modules.add(new SyncService(reactContext));
              return modules;
            }
          });

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