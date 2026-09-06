package app.kkiu.todo;

import android.os.Build;
import android.os.Process;
import android.os.SystemClock;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KkiuStartupMetrics")
public class StartupMetricsPlugin extends Plugin {
    private static final String TAG = "KkiuStartup";

    @PluginMethod
    public void mark(PluginCall call) {
        String name = call.getString("name", "unknown");
        long now = SystemClock.elapsedRealtime();
        long processMs = Math.max(0L, now - Process.getStartElapsedRealtime());
        long requestMs = processMs;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestMs = Math.max(0L, now - Process.getStartRequestedElapsedRealtime());
        }

        Log.i(TAG, name + " process=" + processMs + "ms request=" + requestMs + "ms");
        JSObject result = new JSObject();
        result.put("processMs", processMs);
        result.put("requestMs", requestMs);
        call.resolve(result);
    }
}
