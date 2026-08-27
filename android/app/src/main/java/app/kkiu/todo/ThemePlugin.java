package app.kkiu.todo;

import android.app.UiModeManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
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
    private static final String PREFS_NAME = "kkiu_theme";
    private static final String PREF_KEY = "preference";

    private String currentPreference = "system";
    private String lastSystemTheme;

    private static String normalizePreference(String preference) {
        if ("light".equals(preference) || "dark".equals(preference) || "system".equals(preference)) {
            return preference;
        }
        return "system";
    }

    private static int appCompatMode(String preference) {
        if ("dark".equals(preference)) return AppCompatDelegate.MODE_NIGHT_YES;
        if ("light".equals(preference)) return AppCompatDelegate.MODE_NIGHT_NO;
        return AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
    }

    public static String readSavedPreference(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return normalizePreference(preferences.getString(PREF_KEY, "system"));
    }

    public static void applySavedPreference(Context context) {
        AppCompatDelegate.setDefaultNightMode(appCompatMode(readSavedPreference(context)));
    }

    private void savePreference(String preference) {
        getContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_KEY, preference)
            .apply();
    }

    private String getTheme(Configuration configuration) {
        int nightMode = configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES ? "dark" : "light";
    }

    private String getSystemTheme() {
        UiModeManager manager = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
        if (manager != null) {
            int systemNightMode = manager.getNightMode();
            if (systemNightMode == UiModeManager.MODE_NIGHT_YES) return "dark";
            if (systemNightMode == UiModeManager.MODE_NIGHT_NO) return "light";
        }

        // AUTO/CUSTOM are uncommon for the manual Light/Dark setting. When the
        // system does not expose a direct YES/NO value, use the effective
        // configuration as the fallback.
        return getTheme(getContext().getResources().getConfiguration());
    }

    private void emitSystemThemeIfChanged() {
        String systemTheme = getSystemTheme();
        if (systemTheme.equals(lastSystemTheme)) return;
        lastSystemTheme = systemTheme;

        JSObject result = new JSObject();
        result.put("theme", systemTheme);
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
        currentPreference = readSavedPreference(getContext());
        lastSystemTheme = getSystemTheme();
    }

    @PluginMethod
    public void getSystemTheme(PluginCall call) {
        JSObject result = new JSObject();
        result.put("theme", getSystemTheme());
        call.resolve(result);
    }

    @PluginMethod
    public void setThemePreference(PluginCall call) {
        String preference = normalizePreference(call.getString("preference", "system"));
        currentPreference = preference;
        savePreference(preference);

        // One controller only: Light, Dark and System map directly to the
        // documented AppCompat DayNight modes. UiModeManager is read-only here.
        AppCompatDelegate.setDefaultNightMode(appCompatMode(preference));

        String resolvedTheme = "system".equals(preference) ? getSystemTheme() : preference;
        lastSystemTheme = getSystemTheme();

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
}
