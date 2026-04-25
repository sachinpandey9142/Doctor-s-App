package com.doctorsapp.data.repository

import android.content.Context
import android.net.Uri
import com.doctorsapp.data.model.Post
import com.doctorsapp.data.model.Comment
import com.doctorsapp.data.network.ApiService
import com.doctorsapp.data.network.UserActionRequest
import com.doctorsapp.data.network.toReadableMessage
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for post-related Firebase operations
 */
@Singleton
class PostRepository @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) {

    /**
     * Create a new post
     */
    suspend fun createPost(post: Post): String {
        return try {
            apiService.createPost(post).id
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to create post"))
        }
    }

    /**
     * Get all posts for home feed (infinite scroll)
     */
    suspend fun getPosts(lastTimestamp: Long? = null, limit: Long = 20): List<Post> {
        return try {
            apiService.getPosts(lastTimestamp, limit)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Get posts by user ID
     */
    suspend fun getUserPosts(userId: String): List<Post> {
        return try {
            apiService.getUserPosts(userId)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Like a post
     */
    suspend fun likePost(postId: String, userId: String) {
        try {
            apiService.likePost(postId, UserActionRequest(userId))
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to like post"))
        }
    }

    /**
     * Unlike a post
     */
    suspend fun unlikePost(postId: String, userId: String) {
        try {
            apiService.unlikePost(postId, UserActionRequest(userId))
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to unlike post"))
        }
    }

    /**
     * Add a comment to a post
     */
    suspend fun addComment(postId: String, comment: Comment): String {
        return try {
            apiService.addComment(postId, comment).id
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to add comment"))
        }
    }

    /**
     * Get comments for a post
     */
    suspend fun getComments(postId: String): List<Comment> {
        return try {
            apiService.getComments(postId)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Delete a post
     */
    suspend fun deletePost(postId: String) {
        try {
            apiService.deletePost(postId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to delete post"))
        }
    }

    /**
     * Get trending posts
     */
    suspend fun getTrendingPosts(limit: Long = 10): List<Post> {
        return try {
            apiService.getTrendingPosts(limit)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Upload image to Firebase Storage
     */
    suspend fun uploadImage(imageUri: Uri, fileName: String): String {
        return try {
            val inputStream = context.contentResolver.openInputStream(imageUri)
                ?: throw Exception("Unable to read selected image")

            val bytes = inputStream.use { it.readBytes() }
            val mimeType = context.contentResolver.getType(imageUri) ?: "image/jpeg"
            val requestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
            val filePart = MultipartBody.Part.createFormData("file", fileName, requestBody)

            apiService.uploadImage(filePart).url
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Image upload failed"))
        }
    }
}
