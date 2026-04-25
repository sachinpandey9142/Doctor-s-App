package com.doctorsapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.doctorsapp.ui.components.ErrorMessage
import com.doctorsapp.ui.components.InputField
import com.doctorsapp.ui.components.PrimaryButton
import com.doctorsapp.ui.components.SecondaryButton
import com.doctorsapp.viewmodel.AuthState
import com.doctorsapp.viewmodel.AuthViewModel

/**
 * Login Screen
 */
@Composable
fun LoginScreen(
    onNavigateToSignup: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Success -> onLoginSuccess()
            is AuthState.Error -> errorMessage = (authState as AuthState.Error).message
            else -> {}
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Header
            Text(
                "Doctor's App",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Text(
                "Professional Network for Medical Staff",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 32.dp)
            )

            // Error message
            if (errorMessage != null) {
                ErrorMessage(errorMessage!!) { errorMessage = null }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Email Input
            InputField(
                value = email,
                onValueChange = { email = it },
                label = "Email Address",
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Password Input
            InputField(
                value = password,
                onValueChange = { password = it },
                label = "Password",
                isPassword = true,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            // Login Button
            PrimaryButton(
                text = "Login",
                onClick = {
                    if (email.isNotEmpty() && password.isNotEmpty()) {
                        viewModel.loginUser(email, password)
                    }
                },
                isLoading = authState is AuthState.Loading,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Divider
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Divider(modifier = Modifier.weight(1f))
                Text(
                    "OR",
                    modifier = Modifier.padding(horizontal = 8.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Divider(modifier = Modifier.weight(1f))
            }

            // Sign Up Link
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Text("Don't have an account? ", color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Sign Up",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clickable { onNavigateToSignup() }
                        .padding(horizontal = 4.dp)
                )
            }
        }
    }
}

/**
 * Signup Screen
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun SignupScreen(
    onNavigateToLogin: () -> Unit,
    onSignupSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var college by remember { mutableStateOf("") }
    var selectedRole by remember { mutableStateOf("") }
    var year by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showRoleDropdown by remember { mutableStateOf(false) }

    val roles = listOf("MBBS Student", "Doctor", "Nurse", "Medical Staff")

    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Success -> onSignupSuccess()
            is AuthState.Error -> errorMessage = (authState as AuthState.Error).message
            else -> {}
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                "Create Account",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Text(
                "Join the Medical Professional Network",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            // Error message
            if (errorMessage != null) {
                ErrorMessage(errorMessage!!) { errorMessage = null }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Name Input
            InputField(
                value = name,
                onValueChange = { name = it },
                label = "Full Name",
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Email Input
            InputField(
                value = email,
                onValueChange = { email = it },
                label = "Email Address",
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Role Selection
            ExposedDropdownMenuBox(
                expanded = showRoleDropdown,
                onExpandedChange = { showRoleDropdown = !showRoleDropdown },
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                OutlinedTextField(
                    value = selectedRole,
                    onValueChange = { },
                    label = { Text("Select Role") },
                    readOnly = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = showRoleDropdown)
                    }
                )
                ExposedDropdownMenu(
                    expanded = showRoleDropdown,
                    onDismissRequest = { showRoleDropdown = false }
                ) {
                    roles.forEach { role ->
                        DropdownMenuItem(
                            text = { Text(role) },
                            onClick = {
                                selectedRole = role
                                showRoleDropdown = false
                            }
                        )
                    }
                }
            }

            // College Input
            InputField(
                value = college,
                onValueChange = { college = it },
                label = "College/Hospital",
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Year Input (for students)
            if (selectedRole.contains("Student", ignoreCase = true)) {
                InputField(
                    value = year,
                    onValueChange = { year = it },
                    label = "Year of Study",
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }

            // Password Input
            InputField(
                value = password,
                onValueChange = { password = it },
                label = "Password",
                isPassword = true,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Confirm Password
            InputField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = "Confirm Password",
                isPassword = true,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            // Sign Up Button
            PrimaryButton(
                text = "Create Account",
                onClick = {
                    if (email.isNotEmpty() && password.isNotEmpty() && name.isNotEmpty() && selectedRole.isNotEmpty()) {
                        viewModel.registerUser(
                            email = email,
                            password = password,
                            name = name,
                            role = selectedRole,
                            college = college,
                            year = year
                        )
                    } else {
                        errorMessage = "Please fill all required fields"
                    }
                },
                isLoading = authState is AuthState.Loading,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Login Link
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Text("Already have an account? ", color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Login",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clickable { onNavigateToLogin() }
                        .padding(horizontal = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
