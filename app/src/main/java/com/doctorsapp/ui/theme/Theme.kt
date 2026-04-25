package com.doctorsapp.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Light color scheme
private val LightColorScheme = lightColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF0052CC), // Medical Blue
    secondary = androidx.compose.ui.graphics.Color(0xFF16A34A), // Medical Green
    tertiary = androidx.compose.ui.graphics.Color(0xFF7D5260),
    background = androidx.compose.ui.graphics.Color(0xFFFFFBFE),
    surface = androidx.compose.ui.graphics.Color(0xFFFFFBFE),
    error = androidx.compose.ui.graphics.Color(0xFFB3261E),
    onPrimary = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    onSecondary = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    onTertiary = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    onBackground = androidx.compose.ui.graphics.Color(0xFF1F1F1F),
    onSurface = androidx.compose.ui.graphics.Color(0xFF1F1F1F),
    onError = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
)

// Dark color scheme
private val DarkColorScheme = darkColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF5A8FFF), // Light blue for dark mode
    secondary = androidx.compose.ui.graphics.Color(0xFF4ADA6F), // Light green for dark mode
    tertiary = androidx.compose.ui.graphics.Color(0xFFD0BCFF),
    background = androidx.compose.ui.graphics.Color(0xFF1F1F1F),
    surface = androidx.compose.ui.graphics.Color(0xFF2A2A2A),
    error = androidx.compose.ui.graphics.Color(0xFFF2B8B5),
    onPrimary = androidx.compose.ui.graphics.Color(0xFF001145),
    onSecondary = androidx.compose.ui.graphics.Color(0xFF00210D),
    onTertiary = androidx.compose.ui.graphics.Color(0xFF31101D),
    onBackground = androidx.compose.ui.graphics.Color(0xFFF5F0F0),
    onSurface = androidx.compose.ui.graphics.Color(0xFFF5F0F0),
    onError = androidx.compose.ui.graphics.Color(0xFF410E0B),
)

/**
 * DoctorsApp Theme - Main theme setup
 */
@Composable
fun DoctorsAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view)?.isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
