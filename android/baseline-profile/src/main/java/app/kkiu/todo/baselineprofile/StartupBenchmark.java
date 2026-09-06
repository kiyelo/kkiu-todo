package app.kkiu.todo.baselineprofile;

import androidx.benchmark.macro.BaselineProfileMode;
import androidx.benchmark.macro.CompilationMode;
import androidx.benchmark.macro.StartupMode;
import androidx.benchmark.macro.StartupTimingMetric;
import androidx.benchmark.macro.junit4.MacrobenchmarkRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Collections;

import kotlin.Unit;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class StartupBenchmark {
    private static final String TARGET_PACKAGE = "app.kkiu.todo";
    private static final int ITERATIONS = 10;

    @Rule
    public final MacrobenchmarkRule benchmarkRule = new MacrobenchmarkRule();

    @Test
    public void coldStartupWithBaselineProfile() {
        measureColdStartup(new CompilationMode.Partial(BaselineProfileMode.Require, 0));
    }

    @Test
    public void coldStartupWithoutPrecompilation() {
        measureColdStartup(new CompilationMode.None());
    }

    private void measureColdStartup(CompilationMode compilationMode) {
        benchmarkRule.measureRepeated(
                TARGET_PACKAGE,
                Collections.singletonList(new StartupTimingMetric()),
                compilationMode,
                StartupMode.COLD,
                ITERATIONS,
                scope -> {
                    scope.pressHome();
                    return Unit.INSTANCE;
                },
                scope -> {
                    scope.startActivityAndWait();
                    return Unit.INSTANCE;
                }
        );
    }
}
