# Go Backend Development

## Prerequisites
- Go 1.22+
- PostgreSQL running (same DB URL as Node backend)

## Quick Start
```bash
cd backend-go
# initialize once
go mod tidy
# run
go run main.go
```

Server defaults to :8080; health check at /health.

## Project Layout
- main.go – entrypoint (Gin)
- internal/ – packages per domain (auth, projects, chat, vibes)

## Common Commands
```bash
go test ./...
go vet ./...
```

## Hot Reload (optional)
Use [air](https://github.com/cosmtrek/air):
```bash
brew install air   # or go install
cd backend-go
air
```