# Migration Plan: Rewriting Backend in Go

This document outlines the plan to migrate the backend from Node.js/TypeScript (TRPC/Next.js/Prisma) to a modular Go-based architecture.

---

## Proposed Go Services

- **auth** – Authentication and user management
- **projects** – Project CRUD and metadata
- **chat** – AI chat, conversation history, OpenAI proxy
- **vibes** – Social and "vibe" related features

Each service can be a standalone Go module/microservice, communicating via HTTP or gRPC.

---

## Technology Stack

- **Language:** Go 1.22+
- **Web Framework:** [gin-gonic/gin](https://github.com/gin-gonic/gin) (fast, minimal)
- **ORM:** [GORM](https://gorm.io/) (object-relational mapping for Go)
- **Database:** PostgreSQL
- **Auth:** JWTs for stateless authentication (optionally integrate with Supabase Auth for social providers)
- **API:** REST (JSON), with future gRPC option

---

## gRPC vs REST

### REST

- Simple, familiar, easy to debug (JSON over HTTP)
- Works well with frontend HTTP clients and existing RESTful patterns
- Quick to prototype and integrate

### gRPC

- Strongly typed, efficient binary protocol (protobuf)
- Good for internal microservices communication
- Can be more complex to set up (requires proto definitions, codegen)
- Not natively supported by browsers (needs gRPC-Web or gateway)

**Recommendation:**  
- Use REST for public/frontend APIs (initially)
- Consider gRPC for service-to-service communication as the system grows

---

## TRPC Front-end Integration

TRPC is TypeScript-native and expects type-safe APIs. When moving to Go:

- **Option 1: GraphQL Gateway**
    - Introduce a GraphQL gateway (e.g. Apollo) in front of Go REST/gRPC services.
    - Frontend continues using GraphQL for queries/mutations.
    - Adds complexity, but preserves type-safety.

- **Option 2: Typed REST Client**
    - Use OpenAPI (Swagger) to define REST endpoints and auto-generate TypeScript clients.
    - Less type magic than TRPC, but robust and familiar to Go teams.

**Short-term:** Use REST API with OpenAPI docs and generate a TypeScript client for the frontend.  
**Long-term:** Evaluate GraphQL or gRPC gateway if needed.

---

## Migration Phases

1. **Scaffold Go Monorepo**
    - Set up `backend-go/` with Go module, Gin, GORM, and health check endpoint.
    - Add Dockerfile and local dev scripts.

2. **Auth Service**
    - Implement JWT-based authentication.
    - Integrate with OAuth providers (GitHub, Supabase) if needed.

3. **Projects Service**
    - CRUD for projects.
    - Connect to PostgreSQL with GORM.

4. **Chat Service**
    - Proxy OpenAI API.
    - Store chat history in DB.

5. **Vibes Service**
    - Social features, user activity, etc.

6. **Frontend Integration**
    - Switch frontend API calls to new Go endpoints.
    - Use OpenAPI-generated TypeScript client.

7. **Deprecate Node.js Backend**
    - Remove legacy code after migration is complete.

---

## References

- [gin-gonic/gin](https://github.com/gin-gonic/gin)
- [GORM](https://gorm.io/)
- [JWT Auth in Go](https://github.com/dgrijalva/jwt-go)
- [OpenAPI for Go](https://github.com/swaggo/swag)