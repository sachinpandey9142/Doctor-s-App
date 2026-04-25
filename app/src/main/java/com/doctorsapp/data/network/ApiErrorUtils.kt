package com.doctorsapp.data.network

import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

fun Throwable.toReadableMessage(defaultMessage: String): String {
    return when (this) {
        is HttpException -> {
            val errorBody = response()?.errorBody()?.string()
            if (!errorBody.isNullOrBlank()) {
                try {
                    JSONObject(errorBody).optString("message", defaultMessage)
                } catch (_: Exception) {
                    defaultMessage
                }
            } else {
                defaultMessage
            }
        }
        is IOException -> "Network error. Check connection and backend server."
        else -> message ?: defaultMessage
    }
}
