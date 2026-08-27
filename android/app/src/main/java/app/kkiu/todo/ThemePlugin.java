package app.kkiu.todo;

import android.app.UiModeManager;
import android.content.Context;
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
    private String getTheme(Configuration configuration) {
        int nightMode = configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES ? "dark" : "light";
    }

    private UiModeManager getUiModeManager() {
        return (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
    }

    private String getDeviceSystemTheme() {
        UiModeManager manager = getUiModeManager();
        if (manager != null) {
            int systemNightMode = manager.getNightMode();
            if (systemNightMode == UiModeManager.MODE_NIGHT_YES) return "dark";
            if (systemNightMode == UiModeManager.MODE_NIGHT_NO) return "light";
        }

        // AUTO/CUSTOM system schedules do not expose their current resolved state
        // through getNightMode(). The global system Resources configuration does.
        return getTheme(Resources.getSystem().getConfiguration());
    }

    private int appCompatMode(String preference) {
        if ("dark".equals(preference)) return AppCompatDelegate.MODE_NIGHT_YES;
        if ("light".equals(preference)) return AppCompatDelegate.MODE_NIGHT_NO;
        return AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
    }

    private int applicationNightMode(String preference) {
        if ("dark".equals(preference)) return UiModeManager.MODE_NIGHT_YES;
        if ("light".equals(preference)) return UiModeManager.MODE_NIGHT_NO;

        // On API 31+, setApplicationNightMode has no FOLLOW_SYSTEM constant.
        // In AOSP, AUTO/CUSTOM map the package night override to
        // Configuration.UI_MODE_NIGHT_UNDEFINED, which removes the app-local
        // YES/NO override and lets the package inherit the system configuration.
        return UiModeManager.MODE_NIGHT_AUTO;
    }

    private void applyNativeThemePreference(String preference) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            UiModeManager manager = getUiModeManager();
            if (manager != null) manager.setApplicationNightMode(applicationNightMode(preference));
            return;
        }

        AppCompatDelegate.setDefaultNightMode(appCompatMode(preference));
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
        result.put("theme", getDeviceSystemTheme());
        call.resolve(result);
    }

    @PluginMethod
    public void setThemePreference(PluginCall call) {
        String preference = call.getString("preference", "system");
        if (!"dark".equals(preference) && !"light".equals(preference) && !"system".equals(preference)) {
            preference = "system";
        }

        applyNativeThemePreference(preference);

        JSObject result = new JSObject();
        result.put("preference", preference);
        result.put("theme", "system".equals(preference) ? getDeviceSystemTheme() : preference);
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
