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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            UiModeManager manager = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
            if (manager != null) manager.setApplicationNightMode(resolvedUiMode(preference));
        } else {
            AppCompatDelegate.setDefaultNightMode(appCompatMode(preference));
        }

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
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        JSObject result = new JSObject();
        result.put("theme", getDeviceSystemTheme());
        notifyListeners("systemThemeChanged", result);
    }
}
