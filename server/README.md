# Protein Engineering Tools - Cloud Backend

This is the cloud backend server for Protein Engineering Tools, designed to be deployed on Railway.

## Features

- User authentication (register/login with JWT)
- Cloud storage for custom recipes
- Cloud storage for protein measurements
- PostgreSQL database
- RESTful API

## Deploy to Railway

### 1. Create a new Railway project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose this repository
5. Select the `server` directory as the root

### 2. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set the `DATABASE_URL` environment variable

### 3. Set Environment Variables

In Railway, go to your service settings and add:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random
NODE_ENV=production
```

### 4. Deploy

Railway will automatically deploy your server. You'll get a URL like:
```
https://your-app.railway.app
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth token)

### Recipes
- `GET /api/recipes` - Get all user recipes (requires auth)
- `POST /api/recipes` - Save/update recipe (requires auth)
- `DELETE /api/recipes/:id` - Delete recipe (requires auth)

### Measurements
- `GET /api/measurements` - Get all measurements (requires auth)
- `POST /api/measurements` - Save/update measurement (requires auth)
- `DELETE /api/measurements/:id` - Delete measurement (requires auth)

### Health Check
- `GET /health` - Server health status
- `GET /` - API info

## Local Development

1. Install dependencies:
```bash
cd server
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your local PostgreSQL credentials

4. Run the server:
```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

The token is returned when you register or login.
