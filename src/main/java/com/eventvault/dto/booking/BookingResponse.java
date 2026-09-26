package com.eventvault.dto.booking;

import com.eventvault.entity.Booking;
import com.eventvault.entity.BookingStatus;

import java.time.LocalDateTime;

public record BookingResponse(
        Long id,
        Long eventId,
        String eventName,
        int seatsBooked,
        BookingStatus status,
        LocalDateTime bookedAt,
        LocalDateTime cancelledAt
) {
    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getEvent().getId(),
                booking.getEvent().getName(),
                booking.getSeatsBooked(),
                booking.getStatus(),
                booking.getBookedAt(),
                booking.getCancelledAt()
        );
    }
}
