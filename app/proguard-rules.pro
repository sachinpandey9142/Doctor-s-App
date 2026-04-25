proguard-rules.pro

# Keep model classes
-keep class com.doctorsapp.data.model.** { *; }

# Keep Hilt generated classes
-keep class com.doctorsapp.di.** { *; }

# Keep Composables
-keep @androidx.compose.runtime.Composable class * { *; }

# Kotlin coroutines
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}
