package com.eventvault.dto.event;

import com.eventvault.entity.Event;

import java.time.LocalDateTime;

public record EventResponse(
        Long id,
        String name,
        String description,
        String venue,
        LocalDateTime startTime,
        int totalSeats,
        int availableSeats
) {
    public static EventResponse from(Event event) {
        return new EventResponse(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getVenue(),
                event.getStartTime(),
                event.getTotalSeats(),
                event.getAvailableSeats()
        );
    }
}
