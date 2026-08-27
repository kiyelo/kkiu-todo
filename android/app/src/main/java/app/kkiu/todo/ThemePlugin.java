package app.kkiu.todo;

import android.content.res.Configuration;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KkiuTheme")
public class ThemePlugin extends Plugin {
    private String getTheme(Configuration configuration) {
        int nightMode = configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES ? "dark" : "light";
    }

    private String getSystemTheme() {
        // Kkiu no longer writes Android's native night mode. The Activity remains
        // system-owned, so its current configuration is the authoritative system
        // light/dark state and can be read without any app-local override loop.
        return getTheme(getContext().getResources().getConfiguration());
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

        // Intentionally do not call UiModeManager#setApplicationNightMode or
        // AppCompatDelegate#setDefaultNightMode here. Light/Dark are rendered by
        // the shared React/WebView theme layer; System reads the Activity's
        // system-owned configuration. This avoids Activity recreation entirely.
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
        JSObject result = new JSObject();
        result.put("theme", getTheme(newConfig));
        notifyListeners("systemThemeChanged", result);
    }
}
