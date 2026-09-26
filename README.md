# EventVault

An event/ticket booking API built in Spring Boot to practice for Java/Spring interviews. Full stack: JWT auth, role-based access, double-booking prevention (both pessimistic and optimistic locking, side by side), DTOs, global exception handling, pagination, and tests (Mockito unit tests + a Testcontainers integration test that proves the locking under real concurrency).

## Stack

- Java 21, Spring Boot 3.3.4
- Spring Web, Spring Data JPA, Spring Security
- PostgreSQL (H2 for the `dev` profile — no Docker needed to run locally)
- JWT via `jjwt`
- JUnit 5, Mockito, AssertJ, Testcontainers

## Running it

**Quick start, no Docker/Postgres required** (uses in-memory H2, seeds an admin user and a sample event):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Seeded admin: `admin@eventvault.dev` / `admin1234`. H2 console at `/h2-console` (JDBC URL `jdbc:h2:mem:eventvault`).

**Against real Postgres:**

```bash
docker compose up -d
mvn spring-boot:run
```

Uses `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`JWT_SECRET` env vars if you want to override the defaults in `application.yml`.

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

## The interview-relevant design decisions

These are the questions this project is meant to let you answer with a real example instead of a definition.

**Why two booking endpoints (pessimistic vs optimistic)?**
Both prevent the same race — two people booking the last seat at the same time — but differently. `bookPessimistic` ([BookingService.java](src/main/java/com/eventvault/service/BookingService.java)) calls `EventRepository.findByIdForUpdate`, which issues `SELECT ... FOR UPDATE`: the database row is locked for the whole transaction, so a second concurrent request literally waits at the database until the first one commits or rolls back, then sees the updated seat count. `bookOptimistic` reads the row with no lock, but the `Event` entity carries a `@Version` column; when the transaction tries to `UPDATE ... WHERE id = ? AND version = ?` and the version no longer matches (because someone else's write already bumped it), Hibernate throws `OptimisticLockingFailureException`. Nobody double-books either way, but pessimistic makes the second requester wait, while optimistic makes them fail fast and requires the client to retry.

**When would you pick one over the other?**
Pessimistic for high-contention, short critical sections — a popular on-sale-now event where many people are hitting the same row at once; the lock wait is short and guaranteed correct. Optimistic for low-contention resources where conflicts are rare and you'd rather avoid the cost of holding a lock at all — most rows never collide, so most requests pay zero locking overhead, and the rare conflict just gets retried.

**What would break if you removed `@Transactional` from `bookPessimistic`?**
Without an active transaction spanning the read and the write, the row lock acquired by `findByIdForUpdate` would be released as soon as that single query finished, instead of being held until the seat count is decremented and the booking is saved. The two operations that need to be atomic (check seats, then insert booking) would no longer be atomic — the whole point of the lock (freezing the row between the read and the write) evaporates. Take a look at [EventRepository.java](src/main/java/com/eventvault/repository/EventRepository.java) for the `@Lock(PESSIMISTIC_WRITE)` query itself.

**Why DTOs instead of returning the JPA entity from the controller?**
Three concrete reasons, all visible in this codebase: (1) `Booking` has a lazy `@ManyToOne` to `User` and `Event` ([Booking.java](src/main/java/com/eventvault/entity/Booking.java)) — serializing the entity directly outside a transaction throws `LazyInitializationException` the moment Jackson tries to touch an uninitialized proxy; `BookingResponse.from()` reads what it needs while the session is still open and builds a flat, safe record. (2) `User` implements `UserDetails` and holds a password hash — returning it directly would leak the hash in every response that touches a user. (3) The entity's shape is coupled to the database schema; the DTO is coupled to the contract you've promised API consumers, so you can change one without breaking the other.

**Why JWT / stateless auth instead of sessions?**
`SecurityConfig` sets `SessionCreationPolicy.STATELESS` — no `HttpSession` is ever created. Every request carries its own proof of identity (the signed token) via the `Authorization` header, verified fresh each time by `JwtAuthenticationFilter`. That means any instance behind a load balancer can handle any request with no shared session store and no sticky sessions — it's the reason JWT auth suits horizontally-scaled APIs. The tradeoff: a JWT can't be revoked before it expires (no server-side session to delete), which is why `expiration-ms` is kept short.

**What does `GlobalExceptionHandler` actually buy you?**
Without it, an unmapped exception in a service (e.g., `ResourceNotFoundException`) would bubble up as a generic 500 with a stack trace. `@RestControllerAdvice` centralizes the exception→HTTP-status mapping once, so `EventService`/`BookingService` just throw meaningful exceptions and never touch `HttpServletResponse`. Note it can't catch security-filter failures (missing/invalid token, wrong role) — those happen *before* a controller is reached, which is why `RestAuthEntryPoints` exists separately to give 401/403 the same JSON shape.

## What's intentionally out of scope

- No Flyway/Liquibase — `ddl-auto: update` is fine for a practice project, not for anything real. If asked, say so.
- No refresh tokens / token revocation list.
- Stretch ideas not built: Redis caching of availability, async email via `@Async`, rate limiting on the booking endpoint. Worth mentioning if asked "what would you add next."
