package app.kkiu.todo;

import android.app.UiModeManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
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
        UiModeManager manager = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
        if (manager != null) {
            int systemNightMode = manager.getNightMode();
            if (systemNightMode == UiModeManager.MODE_NIGHT_YES) return "dark";
            if (systemNightMode == UiModeManager.MODE_NIGHT_NO) return "light";
        }

        // AUTO/CUSTOM modes do not expose their currently resolved light/dark
        // phase through UiModeManager. Fall back to the process configuration.
        // Manual Android Light/Dark toggles resolve above through getNightMode(),
        // which is deliberately independent of Kkiu's app-local night override.
        return getTheme(getContext().getResources().getConfiguration());
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
        String deviceThemeBeforeApply = getDeviceSystemTheme();
        lastDeviceSystemTheme = deviceThemeBeforeApply;
        applyNativeNightMode(preference);

        String resolvedTheme = "system".equals(preference) ? deviceThemeBeforeApply : preference;
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
