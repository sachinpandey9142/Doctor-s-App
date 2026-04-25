# Doctor,s App Backend

Production-ready custom backend for Doctor,s App built with MVC architecture, MongoDB, JWT auth, and Socket.IO.

## Stack
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing
- Socket.IO for real-time chat
- express-validator input validation

## Project Structure
- [app.js](app.js)
- [server.js](server.js)
- [config/db.js](config/db.js)
- [controllers](controllers)
- [models](models)
- [routes](routes)
- [middlewares](middlewares)
- [services](services)
- [validations](validations)
- [sockets/chatSocket.js](sockets/chatSocket.js)

## Environment Setup
Create a .env file inside backend using [.env.example](.env.example):

PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017/doctors-app
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:8081
NODE_ENV=development

## Run
1. cd backend
2. npm install
3. npm run dev

API base URL: http://localhost:8080/api

## Core API Routes

Authentication
- POST /api/auth/register
- POST /api/auth/login

Users
- GET /api/users/:id
- PUT /api/users/update
- GET /api/users/:id/posts

Posts and Case Discussions
- POST /api/posts
- GET /api/posts
- GET /api/posts/cases
- POST /api/posts/:id/like
- POST /api/posts/:id/comment

Jobs
- POST /api/jobs
- GET /api/jobs
- POST /api/jobs/:id/apply

Chat
- POST /api/conversations
- GET /api/conversations
- GET /api/messages/:conversationId
- POST /api/messages

Notifications
- GET /api/notifications
- PATCH /api/notifications/:id/read

## Socket.IO Events
- joinConversation: join a room by conversationId
- sendMessage: send real-time chat message
- receiveMessage: receive message broadcast in room
- notification: lightweight message-notification event

## Feature Notes
- Verified profile support via user.isVerified
- Reputation scoring is updated on post creation, likes, and comments
- Notification records are stored in MongoDB for message, like, comment, and job events
