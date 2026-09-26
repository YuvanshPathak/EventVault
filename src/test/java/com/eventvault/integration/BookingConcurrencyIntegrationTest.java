package com.eventvault.integration;

import com.eventvault.dto.booking.BookingRequest;
import com.eventvault.entity.Event;
import com.eventvault.entity.Role;
import com.eventvault.entity.User;
import com.eventvault.repository.EventRepository;
import com.eventvault.repository.UserRepository;
import com.eventvault.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The whole point of this project's locking strategy, proven against a real
 * Postgres instance instead of mocks: fire more concurrent booking requests
 * than there are seats and confirm the database - not application-level
 * bookkeeping - is what stops the oversell.
 *
 * Requires Docker to be running locally.
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class BookingConcurrencyIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("eventvault_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private BookingService bookingService;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private UserRepository userRepository;

    private static final int TOTAL_SEATS = 5;
    private static final int CONCURRENT_BOOKERS = 20;

    private Event event;

    @BeforeEach
    void setUp() {
        event = eventRepository.save(Event.builder()
                .name("Sold Out Show")
                .venue("Small Room")
                .startTime(LocalDateTime.now().plusDays(1))
                .totalSeats(TOTAL_SEATS)
                .availableSeats(TOTAL_SEATS)
                .build());
    }

    @Test
    void pessimisticLocking_neverOversellsSeats_underConcurrentLoad() throws InterruptedException {
        List<User> bookers = createUsers(CONCURRENT_BOOKERS, "pess");

        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        runConcurrently(bookers, user -> {
            try {
                bookingService.bookPessimistic(user, new BookingRequest(event.getId(), 1));
                succeeded.incrementAndGet();
            } catch (RuntimeException ex) {
                rejected.incrementAndGet();
            }
        });

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(succeeded.get()).isEqualTo(TOTAL_SEATS);
        assertThat(rejected.get()).isEqualTo(CONCURRENT_BOOKERS - TOTAL_SEATS);
        assertThat(reloaded.getAvailableSeats()).isZero();
    }

    @Test
    void optimisticLocking_alsoPreventsOversell_butFailsSomeRequestsInsteadOfQueuingThem() throws InterruptedException {
        List<User> bookers = createUsers(CONCURRENT_BOOKERS, "opt");

        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger conflicted = new AtomicInteger();
        AtomicInteger soldOut = new AtomicInteger();
        runConcurrently(bookers, user -> {
            try {
                bookingService.bookOptimistic(user, new BookingRequest(event.getId(), 1));
                succeeded.incrementAndGet();
            } catch (OptimisticLockingFailureException ex) {
                // Expected under contention: this booker's read was stale by the
                // time it tried to commit. A real client would retry.
                conflicted.incrementAndGet();
            } catch (RuntimeException ex) {
                soldOut.incrementAndGet();
            }
        });

        Event reloaded = eventRepository.findById(event.getId()).orElseThrow();
        // The invariant that actually matters still holds: never negative,
        // never over totalSeats - regardless of how many requests got conflicts.
        assertThat(reloaded.getAvailableSeats()).isGreaterThanOrEqualTo(0);
        assertThat(succeeded.get()).isLessThanOrEqualTo(TOTAL_SEATS);
        assertThat(succeeded.get() + conflicted.get() + soldOut.get()).isEqualTo(CONCURRENT_BOOKERS);
    }

    private List<User> createUsers(int count, String prefix) {
        return java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> userRepository.save(User.builder()
                        .name(prefix + i)
                        .email(prefix + i + "@example.com")
                        .password("irrelevant-for-this-test")
                        .role(Role.USER)
                        .build()))
                .toList();
    }

    private void runConcurrently(List<User> users, java.util.function.Consumer<User> action) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(users.size());
        CountDownLatch ready = new CountDownLatch(users.size());
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(users.size());

        for (User user : users) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    action.accept(user);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        start.countDown();
        done.await(30, TimeUnit.SECONDS);
        pool.shutdown();
    }
}
