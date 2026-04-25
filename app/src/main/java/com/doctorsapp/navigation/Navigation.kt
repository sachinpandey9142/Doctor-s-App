package com.doctorsapp.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.doctorsapp.ui.screens.*

/**
 * Navigation routes
 */
object Routes {
    const val LOGIN = "login"
    const val SIGNUP = "signup"
    const val HOME = "home"
    const val CREATE_POST = "create_post"
    const val SEARCH = "search"
    const val CHAT_LIST = "chat_list"
    const val CHAT_DETAIL = "chat_detail/{userId}"
    const val PROFILE = "profile/{userId}"
    const val EDIT_PROFILE = "edit_profile"

    fun chatDetail(userId: String): String = "chat_detail/$userId"

    fun profile(userId: String): String = "profile/$userId"
}

/**
 * Navigation graph setup
 */
@Composable
fun DoctorAppNavigation(
    navController: NavHostController = rememberNavController(),
    isUserLoggedIn: Boolean = false,
    currentUserId: String = ""
) {
    val startDestination = if (isUserLoggedIn) Routes.HOME else Routes.LOGIN

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Authentication screens
        composable(Routes.LOGIN) {
            LoginScreen(
                onNavigateToSignup = { navController.navigate(Routes.SIGNUP) },
                onLoginSuccess = { navController.navigate(Routes.HOME) }
            )
        }

        composable(Routes.SIGNUP) {
            SignupScreen(
                onNavigateToLogin = { navController.popBackStack() },
                onSignupSuccess = { navController.navigate(Routes.HOME) }
            )
        }

        // Main app screens
        composable(Routes.HOME) {
            HomeFeedScreen(
                currentUserId = currentUserId,
                onUserClick = { userId -> navController.navigate(Routes.profile(userId)) },
                onPostClick = { postId -> /* Open post details */ }
            )
        }

        composable(Routes.CREATE_POST) {
            CreatePostScreen(
                currentUserId = currentUserId,
                onPostCreated = { navController.popBackStack() }
            )
        }

        composable(Routes.SEARCH) {
            SearchScreen(
                onUserClick = { userId -> navController.navigate("${Routes.PROFILE}/$userId") }
            )
        }

        composable(Routes.CHAT_LIST) {
            ChatListScreen(
                currentUserId = currentUserId,
                onChatSelect = { userId -> navController.navigate(Routes.chatDetail(userId)) }
            )
        }

        composable(Routes.CHAT_DETAIL) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            ChatDetailScreen(
                otherUserId = userId,
                currentUserId = currentUserId,
                onBackClick = { navController.popBackStack() }
            )
        }

        composable(Routes.PROFILE) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            ProfileScreen(
                userId = userId,
                isCurrentUser = userId == currentUserId,
                onNavigateBack = { navController.popBackStack() },
                onEditClick = { navController.navigate(Routes.EDIT_PROFILE) }
            )
        }

        composable(Routes.EDIT_PROFILE) {
            EditProfileScreen(
                onSave = { navController.popBackStack() },
                onCancel = { navController.popBackStack() }
            )
        }
    }
}
