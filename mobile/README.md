# Doctor,s App Mobile (Expo + TypeScript)

Premium React Native client for verified medical professionals with social feed, case discussion, jobs, chat, and notifications.

## Stack
- Expo + React Native
- TypeScript
- React Navigation
- Zustand
- Styled Components
- Reanimated + Gesture Handler
- Axios + Socket.IO client

## Setup
1. cd mobile
2. npm install
3. npm run start

## Environment Variables
Create a .env file inside mobile:

EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:8080

For physical Android device via USB, run:
- adb reverse tcp:8080 tcp:8080
Then use:
- EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api
- EXPO_PUBLIC_SOCKET_URL=http://127.0.0.1:8080

## Key Structure
- [App.tsx](App.tsx)
- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx)
- [src/constants/theme.ts](src/constants/theme.ts)
- [src/components](src/components)
- [src/screens](src/screens)
- [src/services](src/services)
- [src/store](src/store)
