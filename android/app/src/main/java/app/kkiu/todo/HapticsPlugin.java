package app.kkiu.todo;

import android.content.Context;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KkiuHaptics")
public class HapticsPlugin extends Plugin {
    private Vibrator getVibrator() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    private boolean touchFeedbackEnabled() {
        try {
            return Settings.System.getInt(
                getContext().getContentResolver(),
                Settings.System.HAPTIC_FEEDBACK_ENABLED,
                1
            ) != 0;
        } catch (Exception ignored) {
            return true;
        }
    }

    private VibrationEffect effectFor(String kind) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int effectId = "longPress".equals(kind)
                ? VibrationEffect.EFFECT_HEAVY_CLICK
                : VibrationEffect.EFFECT_CLICK;
            return VibrationEffect.createPredefined(effectId);
        }
        long duration = "longPress".equals(kind) ? 28L : 18L;
        int amplitude = "longPress".equals(kind) ? 235 : 190;
        return VibrationEffect.createOneShot(duration, amplitude);
    }

    @PluginMethod
    public void perform(PluginCall call) {
        String kind = call.getString("kind", "tick");
        getBridge().getWebView().post(() -> {
            Vibrator vibrator = getVibrator();
            if (vibrator == null || !vibrator.hasVibrator() || !touchFeedbackEnabled()) {
                call.resolve(new com.getcapacitor.JSObject().put("performed", false));
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                VibrationEffect effect = effectFor(kind);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    VibrationAttributes attributes = new VibrationAttributes.Builder()
                        .setUsage(VibrationAttributes.USAGE_TOUCH)
                        .build();
                    vibrator.vibrate(effect, attributes);
                } else {
                    vibrator.vibrate(effect);
                }
            } else {
                vibrator.vibrate("longPress".equals(kind) ? 28L : 18L);
            }
            call.resolve(new com.getcapacitor.JSObject().put("performed", true));
        });
    }
}
