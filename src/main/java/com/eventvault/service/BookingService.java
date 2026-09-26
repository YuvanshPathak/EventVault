package com.eventvault.service;

import com.eventvault.dto.booking.BookingRequest;
import com.eventvault.dto.booking.BookingResponse;
import com.eventvault.entity.Booking;
import com.eventvault.entity.BookingStatus;
import com.eventvault.entity.Event;
import com.eventvault.entity.User;
import com.eventvault.exception.InsufficientSeatsException;
import com.eventvault.exception.ResourceNotFoundException;
import com.eventvault.repository.BookingRepository;
import com.eventvault.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Two booking paths on purpose, both guarding the same invariant
 * (availableSeats never goes negative) with different mechanisms:
 *
 * - bookPessimistic: SELECT ... FOR UPDATE. The DB row is locked for the
 *   duration of the transaction, so concurrent bookers physically queue up
 *   at the database. No wasted work, but a booker who fails to acquire the
 *   lock waits (or times out) instead of getting a fast answer.
 *
 * - bookOptimistic: no row lock. Both transactions read the same version,
 *   both compute a new availableSeats, but only the first UPDATE (which
 *   matches the version it read) succeeds - the second gets an
 *   OptimisticLockingFailureException at commit because the version moved
 *   under it. Cheap when contention is rare, wasteful (failed transactions
 *   that must be retried) when many people fight over the same event.
 *
 * For a popular on-sale-now event (high contention, short critical section)
 * pessimistic is the safer default; optimistic suits low-contention
 * read-mostly resources.
 */
@Service
@RequiredArgsConstructor
public class BookingService {

    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse bookPessimistic(User user, BookingRequest request) {
        Event event = eventRepository.findByIdForUpdate(request.eventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event " + request.eventId() + " not found"));

        reserveSeats(event, request.seats());
        Booking booking = saveBooking(user, event, request.seats());
        return BookingResponse.from(booking);
    }

    @Transactional
    public BookingResponse bookOptimistic(User user, BookingRequest request) {
        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event " + request.eventId() + " not found"));

        reserveSeats(event, request.seats());
        // The UPDATE (with a "and version = ?" clause) fires on flush, at the
        // end of this @Transactional method - that's where a lost race
        // surfaces as OptimisticLockingFailureException, not here.
        Booking booking = saveBooking(user, event, request.seats());
        return BookingResponse.from(booking);
    }

    @Transactional
    public BookingResponse cancelBooking(User user, Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking " + bookingId + " not found"));

        if (!booking.getUser().getId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Not your booking");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalArgumentException("Booking is already cancelled");
        }

        // Lock the event row before restoring seats - the same double-booking
        // hazard applies in reverse (two cancellations racing to increment
        // availableSeats).
        Event event = eventRepository.findByIdForUpdate(booking.getEvent().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        event.setAvailableSeats(event.getAvailableSeats() + booking.getSeatsBooked());

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        return BookingResponse.from(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getHistory(User user, Pageable pageable) {
        return bookingRepository.findByUserId(user.getId(), pageable).map(BookingResponse::from);
    }

    private void reserveSeats(Event event, int seatsRequested) {
        if (event.getAvailableSeats() < seatsRequested) {
            throw new InsufficientSeatsException(
                    "Only " + event.getAvailableSeats() + " seat(s) left for " + event.getName());
        }
        event.setAvailableSeats(event.getAvailableSeats() - seatsRequested);
    }

    private Booking saveBooking(User user, Event event, int seats) {
        Booking booking = Booking.builder()
                .user(user)
                .event(event)
                .seatsBooked(seats)
                .status(BookingStatus.CONFIRMED)
                .bookedAt(LocalDateTime.now())
                .build();
        return bookingRepository.save(booking);
    }
}
