package com.eventvault.controller;

import com.eventvault.dto.booking.BookingRequest;
import com.eventvault.dto.booking.BookingResponse;
import com.eventvault.entity.User;
import com.eventvault.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/pessimistic")
    public ResponseEntity<BookingResponse> bookPessimistic(
            @AuthenticationPrincipal User user, @Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.bookPessimistic(user, request));
    }

    @PostMapping("/optimistic")
    public ResponseEntity<BookingResponse> bookOptimistic(
            @AuthenticationPrincipal User user, @Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.bookOptimistic(user, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BookingResponse> cancelBooking(
            @AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelBooking(user, id));
    }

    @GetMapping("/history")
    public ResponseEntity<Page<BookingResponse>> history(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20, sort = "bookedAt") Pageable pageable) {
        return ResponseEntity.ok(bookingService.getHistory(user, pageable));
    }
}
