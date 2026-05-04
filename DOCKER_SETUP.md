# Docker Setup Guide - Doctor's App

This guide explains how to run the Doctor's App using Docker and Docker Compose.

## 📋 Prerequisites

- **Docker** (v20.10+) - [Install Docker](https://www.docker.com/products/docker-desktop)
- **Docker Compose** (v2.0+) - Usually included with Docker Desktop
- **Git** (optional, for cloning)

Verify installation:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Quick Start

### Step 1: Prepare Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and customize values (optional for development):
```bash
# Edit .env file with your preferred editor
# Key variables to update:
# - MONGO_ROOT_PASSWORD: Change MongoDB password
# - JWT_SECRET: Change JWT secret for production
# - CLOUDINARY_*: Add your Cloudinary credentials if needed
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

This will:
- ✅ Start MongoDB on port 27017
- ✅ Start Backend API on port 8080
- ✅ Start Mobile dev server on port 19000

Wait 30-40 seconds for services to be healthy:
```bash
docker-compose ps
```

Status should show: `healthy` or `Up`

### Step 3: Verify Services

**Backend API:**
```bash
curl http://localhost:8080/api/health
```

**MongoDB:**
```bash
docker exec doctors_app_mongodb mongosh \
  -u admin -p password \
  --authenticationDatabase admin
```

**Mobile Expo:**
Visit: http://localhost:19000

---

## 📱 Mobile App Options

### Option A: Expo Web (Browser)
The Expo dev server runs on http://localhost:19000. You can open the web version.

### Option B: Build Android APK

```bash
# Enter the mobile container
docker exec -it doctors_app_mobile /bin/bash

# Build using EAS (recommended if you have EAS account)
# eas build --platform android --local

# Or build locally with Gradle
# npm run android
```

### Option C: Expo Tunnel (Remote Testing)

Edit `.env`:
```
EXPO_TUNNEL=true
```

Restart mobile service:
```bash
docker-compose restart mobile
```

Scan QR code with Expo app on your phone.

---

## 🔍 Common Tasks

### View Logs

All services:
```bash
docker-compose logs -f
```

Specific service:
```bash
docker-compose logs -f backend
docker-compose logs -f mongodb
docker-compose logs -f mobile
```

Real-time logs with timestamps:
```bash
docker-compose logs -f --timestamps backend
```

### Stop Services

```bash
docker-compose down
```

Stop and remove volumes (careful - deletes MongoDB data):
```bash
docker-compose down -v
```

### Rebuild Images

```bash
# Rebuild without cache
docker-compose build --no-cache

# Then start services
docker-compose up -d
```

### Restart a Service

```bash
docker-compose restart backend
docker-compose restart mongodb
docker-compose restart mobile
```

### Execute Commands Inside Containers

```bash
# Backend shell
docker exec -it doctors_app_backend /bin/sh

# MongoDB shell
docker exec -it doctors_app_mongodb mongosh \
  -u admin -p password --authenticationDatabase admin

# Mobile shell
docker exec -it doctors_app_mobile /bin/bash
```

---

## 🐛 Troubleshooting

### Port Already in Use

If port 8080, 27017, or 19000 is already in use:

Edit `docker-compose.yml` and change the ports section:
```yaml
services:
  backend:
    ports:
      - "8081:8080"  # Changed from 8080:8080
  mongodb:
    ports:
      - "27018:27017"  # Changed from 27017:27017
  mobile:
    ports:
      - "19001:19000"  # Changed from 19000:19000
```

### MongoDB Connection Issues

Check MongoDB health:
```bash
docker-compose ps
docker logs doctors_app_mongodb
```

Reset MongoDB:
```bash
docker-compose down -v
docker-compose up -d mongodb
```

### Backend Crashes

Check backend logs:
```bash
docker-compose logs backend
```

Common issues:
- MongoDB not ready: Wait 30-40 seconds
- JWT_SECRET not set: Check `.env` file
- Port conflicts: Check port availability

### Mobile App Connection Issues

Ensure `.env` has correct API URL:
```
REACT_APP_API_URL=http://backend:8080/api
```

For external access (outside Docker network):
```
REACT_APP_API_URL=http://localhost:8080/api
```

Restart mobile service:
```bash
docker-compose restart mobile
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│      docker-compose.yml                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐                       │
│  │  MongoDB    │ (port 27017)          │
│  │  Container  │                       │
│  └──────┬──────┘                       │
│         │                              │
│  ┌──────▼─────────┐                   │
│  │  Backend API   │ (port 8080)       │
│  │  Container     │ - Node.js/Express │
│  │  - MongoDB     │ - Socket.IO       │
│  │    connected   │                   │
│  └────────────────┘                   │
│         ▲                              │
│         │                              │
│  ┌──────┴──────────┐                  │
│  │  Mobile App    │ (port 19000)     │
│  │  Container     │ - Expo Dev       │
│  │  - Expo CLI    │ - React Native   │
│  └────────────────┘                  │
│                                       │
└───────────────────────────────────────┘

Docker Network: doctors_app_network (bridge)
```

---

## 🔐 Production Deployment

**⚠️ IMPORTANT SECURITY CHANGES FOR PRODUCTION:**

1. **Update `.env`:**
   ```bash
   NODE_ENV=production
   MONGO_ROOT_PASSWORD=use_a_strong_random_password
   JWT_SECRET=use_a_strong_random_string_at_least_32_chars
   ```

2. **Use environment file:**
   ```bash
   docker-compose --env-file .env.prod up -d
   ```

3. **MongoDB Security:**
   - Create admin user with strong password
   - Enable authentication
   - Use `--auth` flag in MongoDB
   - Restrict network access

4. **Backend Security:**
   - Set `NODE_ENV=production`
   - Use HTTPS/SSL
   - Set proper CORS origins
   - Use strong JWT secret

5. **Backup Strategy:**
   ```bash
   # Backup MongoDB data
   docker exec doctors_app_mongodb mongodump \
     -u admin -p password \
     -o /data/backup
   ```

---

## 📝 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Node environment (development/production) |
| `MONGO_ROOT_USER` | admin | MongoDB root username |
| `MONGO_ROOT_PASSWORD` | password | MongoDB root password |
| `JWT_SECRET` | long_string | JWT signing secret |
| `CLIENT_URL` | http://localhost:3000 | Client application URL |
| `CLOUDINARY_CLOUD_NAME` | empty | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | empty | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | empty | Cloudinary API secret |
| `REACT_APP_API_URL` | http://backend:8080/api | Backend API URL for mobile |
| `EXPO_DEBUG` | false | Enable Expo debug mode |

---

## 💡 Tips & Best Practices

1. **Use Health Checks:**
   ```bash
   docker-compose ps
   ```
   Services show `healthy` when ready

2. **Monitor Resource Usage:**
   ```bash
   docker stats
   ```

3. **Clean Up Unused Resources:**
   ```bash
   docker system prune -a
   ```

4. **Persist MongoDB Data:**
   - MongoDB data stored in Docker volume `mongodb_data`
   - Data persists even if containers stop
   - Remove with: `docker-compose down -v`

5. **Development Workflow:**
   ```bash
   # Backend: Edit files, container auto-restarts with nodemon
   # Mobile: Edit files, Expo hot-reloads
   # Just restart containers to apply changes
   docker-compose restart backend
   ```

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Verify services are healthy: `docker-compose ps`
3. Check network connectivity: `docker network ls`
4. Review `.env` file configuration

---

**Last Updated:** 2026-05-04
**Docker Compose Version:** 3.9
**Tested on:** Docker Desktop (Windows, Mac, Linux)
