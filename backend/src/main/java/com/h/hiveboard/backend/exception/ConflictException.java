package com.h.hiveboard.backend.exception;

// 409: the thing you're saving changed since you loaded it (e.g. someone else edited the card).
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
