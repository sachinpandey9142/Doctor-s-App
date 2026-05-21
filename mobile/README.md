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

EXPO_PUBLIC_API_BASE_URL=https://curo-backend-fwaq.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://curo-backend-fwaq.onrender.com

If you skip the .env file, use the deployed backend values above or add your own environment overrides for local development.

For physical Android device via USB, run:

- adb reverse tcp:8080 tcp:8080
  Then use your local backend values if you choose to run one.

## Key Structure

- [App.tsx](App.tsx)
- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx)
- [src/constants/theme.ts](src/constants/theme.ts)
- [src/components](src/components)
- [src/screens](src/screens)
- [src/services](src/services)
- [src/store](src/store)
