package com.eventvault.exception;

/**
 * Raised on the optimistic-locking booking path when the row's @Version
 * changed between read and write - i.e. someone else booked first.
 */
public class BookingConflictException extends RuntimeException {
    public BookingConflictException(String message) {
        super(message);
    }
}
