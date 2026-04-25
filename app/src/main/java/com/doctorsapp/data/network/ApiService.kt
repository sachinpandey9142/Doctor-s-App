package com.doctorsapp.data.network

import com.doctorsapp.data.model.ChatRoom
import com.doctorsapp.data.model.Comment
import com.doctorsapp.data.model.Message
import com.doctorsapp.data.model.Notification
import com.doctorsapp.data.model.Post
import com.doctorsapp.data.model.User
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Part

interface ApiService {

    @POST("auth/register")
    suspend fun register(@Body request: AuthRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: AuthRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(): MessageResponse

    @GET("auth/current")
    suspend fun getCurrentUser(): CurrentUserResponse

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): MessageResponse

    @POST("users")
    suspend fun createUser(@Body user: User): User

    @GET("users/me")
    suspend fun getMyUser(): User

    @GET("users/{userId}")
    suspend fun getUserById(@Path("userId") userId: String): User

    @PATCH("users/{userId}")
    suspend fun updateUserProfile(
        @Path("userId") userId: String,
        @Body updates: Map<String, @JvmSuppressWildcards Any>
    ): User

    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): List<User>

    @GET("users/suggested")
    suspend fun getSuggestedUsers(@Query("limit") limit: Long = 10): List<User>

    @POST("users/{targetUserId}/follow")
    suspend fun followUser(@Path("targetUserId") targetUserId: String): MessageResponse

    @POST("users/{targetUserId}/unfollow")
    suspend fun unfollowUser(@Path("targetUserId") targetUserId: String): MessageResponse

    @GET("users/{userId}/followers")
    suspend fun getFollowers(@Path("userId") userId: String): List<User>

    @POST("users/{userId}/last-seen")
    suspend fun updateLastSeen(@Path("userId") userId: String): MessageResponse

    @POST("posts")
    suspend fun createPost(@Body post: Post): Post

    @GET("posts")
    suspend fun getPosts(
        @Query("lastTimestamp") lastTimestamp: Long?,
        @Query("limit") limit: Long
    ): List<Post>

    @GET("posts/user/{userId}")
    suspend fun getUserPosts(@Path("userId") userId: String): List<Post>

    @POST("posts/{postId}/like")
    suspend fun likePost(
        @Path("postId") postId: String,
        @Body request: UserActionRequest
    ): Post

    @POST("posts/{postId}/unlike")
    suspend fun unlikePost(
        @Path("postId") postId: String,
        @Body request: UserActionRequest
    ): Post

    @POST("posts/{postId}/comments")
    suspend fun addComment(
        @Path("postId") postId: String,
        @Body comment: Comment
    ): Comment

    @GET("posts/{postId}/comments")
    suspend fun getComments(@Path("postId") postId: String): List<Comment>

    @DELETE("posts/{postId}")
    suspend fun deletePost(@Path("postId") postId: String): MessageResponse

    @GET("posts/trending")
    suspend fun getTrendingPosts(@Query("limit") limit: Long = 10): List<Post>

    @Multipart
    @POST("uploads/image")
    suspend fun uploadImage(@Part file: MultipartBody.Part): UploadImageResponse

    @POST("messages")
    suspend fun sendMessage(@Body message: Message): Message

    @GET("messages")
    suspend fun getMessages(
        @Query("userId1") userId1: String,
        @Query("userId2") userId2: String,
        @Query("limit") limit: Long = 50
    ): List<Message>

    @GET("chat-rooms")
    suspend fun getChatRooms(@Query("userId") userId: String): List<ChatRoom>

    @PATCH("messages/{messageId}/read")
    suspend fun markMessageAsRead(@Path("messageId") messageId: String): Message

    @POST("chat-rooms/mark-read")
    suspend fun markChatRoomAsRead(@Body request: MarkChatAsReadRequest): MessageResponse

    @DELETE("messages/{messageId}")
    suspend fun deleteMessage(@Path("messageId") messageId: String): MessageResponse

    @POST("notifications")
    suspend fun createNotification(@Body notification: Notification): Notification

    @GET("notifications")
    suspend fun getNotifications(
        @Query("userId") userId: String,
        @Query("limit") limit: Long = 50
    ): List<Notification>

    @PATCH("notifications/{notificationId}/read")
    suspend fun markNotificationAsRead(@Path("notificationId") notificationId: String): Notification

    @GET("notifications/unread/count")
    suspend fun getUnreadCount(@Query("userId") userId: String): UnreadCountResponse

    @DELETE("notifications/{notificationId}")
    suspend fun deleteNotification(@Path("notificationId") notificationId: String): MessageResponse
}
