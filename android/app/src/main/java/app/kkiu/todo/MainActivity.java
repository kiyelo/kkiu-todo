package app.kkiu.todo;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int launchBackgroundColor() {
        int nightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return Color.parseColor(nightMode == Configuration.UI_MODE_NIGHT_YES ? "#0D1015" : "#F2F5FA");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ThemePlugin.class);
        registerPlugin(HapticsPlugin.class);
        getWindow().setBackgroundDrawableResource(R.color.kkiu_launch_background);
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(launchBackgroundColor());
        }
    }
}
