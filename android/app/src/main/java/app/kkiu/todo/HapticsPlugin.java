package app.kkiu.todo;

import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.View;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KkiuHaptics")
public class HapticsPlugin extends Plugin {
    private int feedbackConstant(String kind) {
        if ("longPress".equals(kind)) return HapticFeedbackConstants.LONG_PRESS;
        if ("dragStart".equals(kind)) {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                ? HapticFeedbackConstants.DRAG_START
                : HapticFeedbackConstants.LONG_PRESS;
        }
        if ("confirm".equals(kind) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return HapticFeedbackConstants.CONFIRM;
        }
        return HapticFeedbackConstants.CLOCK_TICK;
    }

    @PluginMethod
    public void perform(PluginCall call) {
        String kind = call.getString("kind", "tick");
        View webView = getBridge().getWebView();
        webView.post(() -> {
            boolean performed = webView.performHapticFeedback(feedbackConstant(kind));
            call.resolve(new com.getcapacitor.JSObject().put("performed", performed));
        });
    }
}
