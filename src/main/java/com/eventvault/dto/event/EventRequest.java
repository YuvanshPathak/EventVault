package com.eventvault.dto.event;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record EventRequest(
        @NotBlank String name,
        String description,
        @NotBlank String venue,
        @NotNull @Future LocalDateTime startTime,
        @Min(1) int totalSeats
) {
}
