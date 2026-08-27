package app.kkiu.todo;

import android.app.UiModeManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KkiuTheme")
public class ThemePlugin extends Plugin {
    private String currentPreference = "system";
    private String lastDeviceSystemTheme;
    private BroadcastReceiver configurationReceiver;

    private String getTheme(Configuration configuration) {
        int nightMode = configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES ? "dark" : "light";
    }

    private String getDeviceSystemTheme() {
        return getTheme(Resources.getSystem().getConfiguration());
    }

    private int resolvedUiMode(String preference) {
        if ("dark".equals(preference)) return UiModeManager.MODE_NIGHT_YES;
        if ("light".equals(preference)) return UiModeManager.MODE_NIGHT_NO;
        return "dark".equals(getDeviceSystemTheme())
            ? UiModeManager.MODE_NIGHT_YES
            : UiModeManager.MODE_NIGHT_NO;
    }

    private int appCompatMode(String preference) {
        if ("dark".equals(preference)) return AppCompatDelegate.MODE_NIGHT_YES;
        if ("light".equals(preference)) return AppCompatDelegate.MODE_NIGHT_NO;
        return AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
    }

    private void applyNativeNightMode(String preference) {
        // Android's dark-theme guidance separates these APIs by OS version.
        // Never apply AppCompatDelegate on Android 12+ after UiModeManager: doing
        // both can make the two controllers fight over uiMode and repeatedly
        // trigger configuration changes in the running Capacitor Activity.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            UiModeManager manager = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
            if (manager != null) manager.setApplicationNightMode(resolvedUiMode(preference));
        } else {
            AppCompatDelegate.setDefaultNightMode(appCompatMode(preference));
        }
    }

    private void emitSystemThemeIfChanged() {
        String deviceTheme = getDeviceSystemTheme();
        if (deviceTheme.equals(lastDeviceSystemTheme)) return;
        lastDeviceSystemTheme = deviceTheme;

        // UiModeManager has no FOLLOW_SYSTEM constant. While Kkiu is in System
        // mode, mirror the real device theme whenever the global configuration
        // changes. This keeps Android 12+ launch resources synchronized without
        // mixing UiModeManager and AppCompatDelegate in the same runtime path.
        if ("system".equals(currentPreference) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            applyNativeNightMode("system");
        }

        JSObject result = new JSObject();
        result.put("theme", deviceTheme);
        notifyListeners("systemThemeChanged", result);
    }

    private void applyStatusBarIcons(String theme) {
        if (getActivity() == null) return;
        getActivity().runOnUiThread(() -> {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );
            // "Light status bars" means a light background with dark foreground icons.
            controller.setAppearanceLightStatusBars("light".equals(theme));
        });
    }

    @Override
    public void load() {
        super.load();
        lastDeviceSystemTheme = getDeviceSystemTheme();
        configurationReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_CONFIGURATION_CHANGED.equals(intent.getAction())) {
                    emitSystemThemeIfChanged();
                }
            }
        };
        IntentFilter filter = new IntentFilter(Intent.ACTION_CONFIGURATION_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(configurationReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(configurationReceiver, filter);
        }
    }

    @PluginMethod
    public void getSystemTheme(PluginCall call) {
        JSObject result = new JSObject();
        result.put("theme", getDeviceSystemTheme());
        call.resolve(result);
    }

    @PluginMethod
    public void setThemePreference(PluginCall call) {
        String preference = call.getString("preference", "system");
        if (!"dark".equals(preference) && !"light".equals(preference) && !"system".equals(preference)) {
            preference = "system";
        }
        currentPreference = preference;
        lastDeviceSystemTheme = getDeviceSystemTheme();
        applyNativeNightMode(preference);

        String resolvedTheme = "system".equals(preference) ? getDeviceSystemTheme() : preference;
        JSObject result = new JSObject();
        result.put("preference", preference);
        result.put("theme", resolvedTheme);
        call.resolve(result);
    }

    @PluginMethod
    public void setStatusBarTheme(PluginCall call) {
        String theme = call.getString("theme", "light");
        if (!"dark".equals(theme)) theme = "light";
        applyStatusBarIcons(theme);
        call.resolve();
    }

    @Override
    protected void handleOnResume() {
        emitSystemThemeIfChanged();
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        emitSystemThemeIfChanged();
    }

    @Override
    protected void handleOnDestroy() {
        if (configurationReceiver != null) {
            try {
                getContext().unregisterReceiver(configurationReceiver);
            } catch (IllegalArgumentException ignored) {
            }
            configurationReceiver = null;
        }
    }
}
