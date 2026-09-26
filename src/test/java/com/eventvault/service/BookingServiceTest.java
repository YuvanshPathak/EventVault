package com.eventvault.service;

import com.eventvault.dto.booking.BookingRequest;
import com.eventvault.dto.booking.BookingResponse;
import com.eventvault.entity.*;
import com.eventvault.exception.InsufficientSeatsException;
import com.eventvault.exception.ResourceNotFoundException;
import com.eventvault.repository.BookingRepository;
import com.eventvault.repository.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests exercise BookingService's own logic (seat arithmetic, who's
 * allowed to cancel what) with mocked repositories - they say nothing about
 * whether the pessimistic lock actually prevents concurrent overselling in a
 * real database. That's what BookingConcurrencyIntegrationTest is for.
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private EventRepository eventRepository;
    @Mock
    private BookingRepository bookingRepository;
    @InjectMocks
    private BookingService bookingService;

    @Captor
    private ArgumentCaptor<Booking> bookingCaptor;

    private User user;
    private Event event;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).name("Jeevant").email("jeevant@example.com").role(Role.USER).build();
        event = Event.builder()
                .id(10L).name("Test Event").venue("Hall A")
                .startTime(LocalDateTime.now().plusDays(1))
                .totalSeats(5).availableSeats(2)
                .build();
    }

    @Test
    void bookPessimistic_decrementsAvailableSeats_whenEnoughSeats() {
        when(eventRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(event));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(99L);
            return b;
        });

        BookingResponse response = bookingService.bookPessimistic(user, new BookingRequest(10L, 2));

        assertThat(event.getAvailableSeats()).isZero();
        assertThat(response.seatsBooked()).isEqualTo(2);
        assertThat(response.status()).isEqualTo(BookingStatus.CONFIRMED);

        verify(bookingRepository).save(bookingCaptor.capture());
        assertThat(bookingCaptor.getValue().getUser()).isEqualTo(user);
        assertThat(bookingCaptor.getValue().getEvent()).isEqualTo(event);
    }

    @Test
    void bookPessimistic_throwsInsufficientSeats_whenNotEnoughAvailable() {
        when(eventRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> bookingService.bookPessimistic(user, new BookingRequest(10L, 3)))
                .isInstanceOf(InsufficientSeatsException.class);

        // seat count must be untouched - a failed booking should never mutate state
        assertThat(event.getAvailableSeats()).isEqualTo(2);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void bookPessimistic_throwsNotFound_whenEventMissing() {
        when(eventRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.bookPessimistic(user, new BookingRequest(999L, 1)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void bookOptimistic_readsWithoutLock_andDecrementsSeats() {
        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        bookingService.bookOptimistic(user, new BookingRequest(10L, 1));

        assertThat(event.getAvailableSeats()).isEqualTo(1);
        verify(eventRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void cancelBooking_restoresSeats_forOwner() {
        Booking booking = Booking.builder()
                .id(5L).user(user).event(event).seatsBooked(2)
                .status(BookingStatus.CONFIRMED).bookedAt(LocalDateTime.now())
                .build();
        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        when(eventRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(event));

        BookingResponse response = bookingService.cancelBooking(user, 5L);

        assertThat(event.getAvailableSeats()).isEqualTo(4);
        assertThat(response.status()).isEqualTo(BookingStatus.CANCELLED);
    }

    @Test
    void cancelBooking_rejectsCancellingSomeoneElsesBooking() {
        User otherUser = User.builder().id(2L).name("Someone Else").email("other@example.com").role(Role.USER).build();
        Booking booking = Booking.builder()
                .id(5L).user(otherUser).event(event).seatsBooked(1)
                .status(BookingStatus.CONFIRMED).bookedAt(LocalDateTime.now())
                .build();
        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking(user, 5L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void cancelBooking_rejectsDoubleCancellation() {
        Booking booking = Booking.builder()
                .id(5L).user(user).event(event).seatsBooked(1)
                .status(BookingStatus.CANCELLED).bookedAt(LocalDateTime.now())
                .build();
        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking(user, 5L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
