# FlowTrack Backend - Quick Start Guide

Get the backend running in 5 minutes!

## Prerequisites

- Node.js 20+ installed
- Docker Desktop installed and running
- Clerk account (free tier works)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application (or use existing)
3. Go to **API Keys** section
4. Copy your keys:
   - Secret Key (starts with `sk_test_...`)
   - Publishable Key (starts with `pk_test_...`)

## Step 3: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Clerk keys:

```env
# Replace with your actual Clerk keys
CLERK_SECRET_KEY="sk_test_YOUR_KEY_HERE"
CLERK_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"

# Rest can stay as defaults for local development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowtrack?schema=public"
REDIS_URL="redis://localhost:6379"
API_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"
NODE_ENV="development"
PORT=3000
```

## Step 4: Start Database

```bash
docker-compose up -d
```

Wait 5-10 seconds for PostgreSQL to initialize.

## Step 5: Setup Database

```bash
npx prisma migrate dev --name init
```

Type `y` when asked to create the database.

## Step 6: Start the Server

```bash
npm run start:dev
```

You should see:

```
🚀 Application is running on: http://localhost:3000
📚 Swagger documentation: http://localhost:3000/api/docs
🏥 Health check: http://localhost:3000/health
```

## Verify It's Working

### Option 1: Browser

Open http://localhost:3000/health

You should see:

```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "environment": "development",
  "services": {
    "database": "up"
  }
}
```

### Option 2: Swagger UI

Open http://localhost:3000/api/docs

You'll see interactive API documentation with all endpoints.

### Option 3: cURL

```bash
curl http://localhost:3000/health
```

## Test with Authentication

To test authenticated endpoints, you need a Clerk JWT token.

### Quick Test (without frontend):

1. Go to your Clerk Dashboard
2. Navigate to **Users** → **User Management**
3. Click on a test user
4. Click **Backend API** tab
5. Copy the **Session Token**

### Use the Token

In Swagger UI or cURL:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/workspace
```

## Common Issues

### "Database connection failed"

**Fix**: Make sure Docker is running
```bash
docker-compose ps
```

Both `flowtrack-postgres` and `flowtrack-redis` should be "Up".

### "Port 3000 is already in use"

**Fix**: Change port in `.env`
```env
PORT=3001
```

### "Clerk authentication failed"

**Fix**: Double-check your Clerk keys in `.env`

Make sure:
- No extra spaces
- Keys are wrapped in quotes
- You're using the correct environment (test vs production)

### "Prisma Client not found"

**Fix**: Regenerate Prisma Client
```bash
npx prisma generate
```

## Next Steps

1. **Read the full README**: `README.md` has detailed documentation
2. **Explore Swagger**: http://localhost:3000/api/docs
3. **Test Endpoints**: Use Postman, Thunder Client, or Swagger UI
4. **Connect Frontend**: Configure frontend to use this backend

## Development Workflow

### Start Fresh

```bash
# Stop everything
docker-compose down

# Clear database (optional)
docker-compose down -v

# Start database
docker-compose up -d

# Reset database
npx prisma migrate reset

# Start server
npm run start:dev
```

### View Database

```bash
npx prisma studio
```

Opens a GUI at http://localhost:5555 to view/edit data.

### Check Logs

```bash
# Database logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis

# Backend logs
# (visible in your terminal where you ran start:dev)
```

## Quick API Examples

### Create Workspace

```bash
curl -X POST http://localhost:3000/api/workspace \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Company"}'
```

### Create Project

```bash
curl -X POST http://localhost:3000/api/project \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Website Redesign",
    "description": "Redesign company website",
    "workspaceId": "WORKSPACE_ID_FROM_PREVIOUS_REQUEST"
  }'
```

### Create Task

```bash
curl -X POST http://localhost:3000/api/task \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design homepage mockup",
    "projectId": "PROJECT_ID_FROM_PREVIOUS_REQUEST"
  }'
```

## Need Help?

- Check the full README.md
- Review Swagger docs at /api/docs
- Check Docker container logs
- Verify Clerk configuration

Happy coding! 🚀
