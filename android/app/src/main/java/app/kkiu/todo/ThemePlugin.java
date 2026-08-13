package app.kkiu.todo;

import android.content.res.Configuration;
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

    @PluginMethod
    public void getSystemTheme(PluginCall call) {
        JSObject result = new JSObject();
        result.put("theme", getTheme(getContext().getResources().getConfiguration()));
        call.resolve(result);
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        JSObject result = new JSObject();
        result.put("theme", getTheme(newConfig));
        notifyListeners("systemThemeChanged", result);
    }
}
