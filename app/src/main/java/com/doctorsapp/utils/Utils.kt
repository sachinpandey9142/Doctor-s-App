package com.doctorsapp.utils

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable

/**
 * Utility functions for file handling and other common operations
 */

object FileUtils {
    /**
     * Get file name from URI
     */
    fun getFileNameFromUri(context: Context, uri: Uri): String {
        var fileName = ""
        val contentUriPath = uri.path
        if (contentUriPath != null) {
            fileName = contentUriPath.substring(contentUriPath.lastIndexOf("/") + 1)
        }
        return fileName
    }
}

/**
 * Image picker launcher
 */
@Composable
fun rememberImagePickerLauncher(onImageSelected: (Uri) -> Unit) =
    rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
        onResult = { uri ->
            uri?.let { onImageSelected(it) }
        }
    )

/**
 * Extension functions
 */
fun String.isValidEmail(): Boolean {
    val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
    return emailRegex.matches(this)
}

fun String.isValidPassword(): Boolean {
    return this.length >= 6
}

fun Long.formatTime(): String {
    val millisecondsDifference = System.currentTimeMillis() - this
    val minutes = millisecondsDifference / (60 * 1000)
    val hours = millisecondsDifference / (60 * 60 * 1000)
    val days = millisecondsDifference / (24 * 60 * 60 * 1000)

    return when {
        minutes < 1 -> "Just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days < 7 -> "${days}d ago"
        else -> "Long ago"
    }
}
