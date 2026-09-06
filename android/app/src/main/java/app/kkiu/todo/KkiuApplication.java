package app.kkiu.todo;

import android.app.Application;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewOutcomeReceiver;
import androidx.webkit.WebViewStartUpConfig;
import androidx.webkit.WebViewStartUpResult;
import androidx.webkit.WebViewStartupException;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class KkiuApplication extends Application {
    private static final String TAG = "KkiuStartup";
    private ExecutorService webViewStartupExecutor;

    @Override
    public void onCreate() {
        super.onCreate();

        final long startedAt = SystemClock.elapsedRealtime();
        webViewStartupExecutor = Executors.newSingleThreadExecutor();
        WebViewStartUpConfig config = new WebViewStartUpConfig.Builder(webViewStartupExecutor).build();

        WebViewCompat.startUpWebView(
            this,
            config,
            new WebViewOutcomeReceiver<WebViewStartUpResult, WebViewStartupException>() {
                @Override
                public void onResult(@NonNull WebViewStartUpResult result) {
                    Log.i(TAG, "webview-async-startup-ready +" + (SystemClock.elapsedRealtime() - startedAt) + "ms");
                    shutdownStartupExecutor();
                }

                @Override
                public void onError(@NonNull WebViewStartupException error) {
                    Log.e(TAG, "webview-async-startup-failed +" + (SystemClock.elapsedRealtime() - startedAt) + "ms", error);
                    shutdownStartupExecutor();
                }
            }
        );
    }

    private void shutdownStartupExecutor() {
        ExecutorService executor = webViewStartupExecutor;
        webViewStartupExecutor = null;
        if (executor != null) executor.shutdown();
    }
}
