@echo off
echo 🐳 Setting up Custom Docker Sandbox System...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not running
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo ✅ Docker is installed

REM Check if Docker daemon is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker daemon is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo ✅ Docker daemon is running

REM Create sandboxes directory
if not exist "sandboxes" (
    mkdir sandboxes
    echo ✅ Created sandboxes directory
) else (
    echo ✅ Sandboxes directory already exists
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo # Custom Sandbox Configuration > .env
    echo DATABASE_URL="file:./dev.db" >> .env
    echo NODE_ENV=development >> .env
    echo. >> .env
    echo # Docker Configuration >> .env
    echo DOCKER_HOST=localhost >> .env
    echo SANDBOX_BASE_PORT=4000 >> .env
    echo SANDBOX_MAX_CONTAINERS=10 >> .env
    echo. >> .env
    echo # Redis Configuration (optional) >> .env
    echo REDIS_URL=redis://localhost:6379 >> .env
    echo ✅ Created .env file with default configuration
) else (
    echo ✅ .env file already exists
)

REM Test Docker build
echo.
echo 🔨 Testing Docker build...
if exist "docker\Dockerfile" (
    docker build -t test-sandbox docker/
    if %errorlevel% equ 0 (
        echo ✅ Docker build test successful
        docker rmi test-sandbox >nul 2>&1
    ) else (
        echo ⚠️  Docker build test failed
        echo This is okay for initial setup, you can test later
    )
) else (
    echo ⚠️  Dockerfile not found, skipping build test
)

echo.
echo 🎉 Custom Sandbox Setup Complete!
echo.
echo 📋 Next Steps:
echo 1. Start your Next.js application: npm run dev
echo 2. Navigate to the Custom Sandbox Manager in your app
echo 3. Create your first sandbox using the UI
echo 4. Your sandboxes will run on ports starting from 4000
echo.
echo 🔧 Useful Commands:
echo - List running containers: docker ps
echo - View container logs: docker logs ^<container-id^>
echo - Stop all sandboxes: docker stop $(docker ps -q --filter "name=sandbox-")
echo - Clean up: docker system prune -f
echo.
pause 