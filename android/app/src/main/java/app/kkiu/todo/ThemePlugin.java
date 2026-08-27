package app.kkiu.todo;

import android.app.UiModeManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.os.Build;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KkiuTheme")
public class ThemePlugin extends Plugin {
    private BroadcastReceiver configurationReceiver;

    private String getTheme(Configuration configuration) {
        int nightMode = configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES ? "dark" : "light";
    }

    private String getSystemTheme() {
        // Read the device-wide setting only. Kkiu never writes Android's app-local
        // night mode, so selecting Light/Dark cannot recreate or restart Activity.
        UiModeManager manager = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
        if (manager != null) {
            int systemNightMode = manager.getNightMode();
            if (systemNightMode == UiModeManager.MODE_NIGHT_YES) return "dark";
            if (systemNightMode == UiModeManager.MODE_NIGHT_NO) return "light";
        }

        // AUTO/CUSTOM modes do not directly expose their resolved phase. In that
        // uncommon case use the current process configuration as the resolved state.
        return getTheme(getContext().getResources().getConfiguration());
    }

    private void notifySystemThemeChanged() {
        JSObject result = new JSObject();
        result.put("theme", getSystemTheme());
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
        configurationReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_CONFIGURATION_CHANGED.equals(intent.getAction())) {
                    notifySystemThemeChanged();
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
        result.put("theme", getSystemTheme());
        call.resolve(result);
    }

    @PluginMethod
    public void setThemePreference(PluginCall call) {
        String preference = call.getString("preference", "system");
        if (!"dark".equals(preference) && !"light".equals(preference) && !"system".equals(preference)) {
            preference = "system";
        }

        // Light/Dark are rendered entirely by React/WebView. Do not call
        // UiModeManager#setApplicationNightMode or AppCompatDelegate here.
        String resolvedTheme = "system".equals(preference) ? getSystemTheme() : preference;
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
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        notifySystemThemeChanged();
    }

    @Override
    protected void handleOnResume() {
        notifySystemThemeChanged();
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
