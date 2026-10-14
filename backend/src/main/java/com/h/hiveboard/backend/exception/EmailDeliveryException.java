package com.h.hiveboard.backend.exception;

// The mail server refused or couldn't be reached (wrong password, no network, ...)
public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException(String message) {
        super(message);
    }
}
