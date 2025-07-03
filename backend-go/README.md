# Vibe Backend (Go)

This is the Go-based backend for Vibe. It will eventually replace the Node.js/TypeScript backend.

## Features

- Modular services for auth, projects, chat, vibes, etc.
- REST API (JSON, Gin router)
- PostgreSQL with GORM ORM
- JWT authentication

## Getting Started

### 1. Initialize Go Module

```bash
cd backend-go
go mod init github.com/your-org/vibe-backend
```

### 2. Install Dependencies

```bash
go get github.com/gin-gonic/gin
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/golang-jwt/jwt/v5
```

### 3. Run the Server

```bash
go run main.go
```

### 4. Test Health Endpoint

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

---

## Folder Structure

```
backend-go/
├── main.go
├── go.mod
├── go.sum
├── internal/      # Place for service modules (auth, projects, etc.)
└── ...
```

## Next Steps

- Implement individual service modules (see [../vibe-ui/docs/migrate-backend-go.md](../vibe-ui/docs/migrate-backend-go.md))
- Add configuration, database connections, middleware, etc.