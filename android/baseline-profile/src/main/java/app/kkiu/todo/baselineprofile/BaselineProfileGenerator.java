package app.kkiu.todo.baselineprofile;

import androidx.benchmark.macro.BaselineProfileConfig;
import androidx.benchmark.macro.junit4.BaselineProfileRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import kotlin.Unit;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class BaselineProfileGenerator {
    private static final String TARGET_PACKAGE = "app.kkiu.todo";

    @Rule
    public final BaselineProfileRule baselineProfileRule = new BaselineProfileRule();

    @Test
    public void startup() {
        BaselineProfileConfig config = new BaselineProfileConfig.Builder(
                TARGET_PACKAGE,
                scope -> {
                    scope.pressHome();
                    scope.startActivityAndWait();
                    return Unit.INSTANCE;
                }
        )
                .setOutputFilePrefix("startup")
                .setIncludeInStartupProfile(true)
                .setMaxIterations(15)
                .setStableIterations(3)
                .build();

        baselineProfileRule.collectWithResults(config);
    }
}
