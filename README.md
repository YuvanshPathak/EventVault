# EventVault

An event/ticket booking system built to practice for Java/Spring interviews. Spring Boot backend + a thin React frontend. Full stack: JWT auth, role-based access, double-booking prevention (both pessimistic and optimistic locking, side by side), DTOs, global exception handling, pagination, and tests (Mockito unit tests + a Testcontainers integration test that proves the locking under real concurrency).

## Stack

**Backend**
- Java 21, Spring Boot 3.3.4
- Spring Web, Spring Data JPA, Spring Security
- PostgreSQL (H2 for the `dev` profile — no Docker needed to run locally)
- JWT via `jjwt`
- JUnit 5, Mockito, AssertJ, Testcontainers

**Frontend**
- React 19 + Vite, plain CSS — deliberately thin, just enough to exercise every backend endpoint (login/register, browse events, book with either locking strategy, cancel, booking history, admin event creation)

## Running it

Two separate processes — backend on `:8080`, frontend on `:5173`. Vite proxies `/api/**` to the backend in dev, so the browser only ever talks to one origin.

**Backend, quick start, no Docker/Postgres required** (uses in-memory H2, seeds an admin user and a sample event):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Seeded admin: `admin@eventvault.dev` / `admin1234`. H2 console at `/h2-console` (JDBC URL `jdbc:h2:mem:eventvault`).

**Backend against real Postgres:**

```bash
docker compose up -d
mvn spring-boot:run
```

Uses `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`JWT_SECRET` env vars if you want to override the defaults in `application.yml`.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Running the tests

```bash
mvn test                          # unit tests (Mockito) - no Docker needed
mvn -Dtest=BookingConcurrencyIntegrationTest test   # needs Docker running (Testcontainers spins up real Postgres)
```

Verified against a real Postgres container: 20 concurrent requests for 5 seats, exactly 5 succeed, seat count never goes negative — both for the pessimistic (queued) and optimistic (fail-fast, conflicts retriable) paths.

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | none | creates a `USER` |
| POST | `/api/auth/login` | none | returns JWT |
| GET | `/api/events` | none | paginated (`?page=&size=&sort=`) |
| GET | `/api/events/{id}` | none | |
| POST | `/api/admin/events` | `ADMIN` | |
| PUT | `/api/admin/events/{id}` | `ADMIN` | |
| DELETE | `/api/admin/events/{id}` | `ADMIN` | |
| POST | `/api/bookings/pessimistic` | any user | booking via row lock |
| POST | `/api/bookings/optimistic` | any user | booking via `@Version` |
| DELETE | `/api/bookings/{id}` | owner only | cancels, restores seats |
| GET | `/api/bookings/history` | any user | paginated, own bookings only |

Send `Authorization: Bearer <token>` for anything not marked "none".
