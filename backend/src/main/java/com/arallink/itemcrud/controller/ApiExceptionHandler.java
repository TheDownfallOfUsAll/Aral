package com.arallink.itemcrud.controller;

import com.arallink.itemcrud.service.ItemNotFoundException;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ItemNotFoundException.class)
    public ResponseEntity<ApiError> handleItemNotFound(ItemNotFoundException exception) {
        return error(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Request validation failed.");
        return error(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableRequest() {
        return error(HttpStatus.BAD_REQUEST, "Request body is missing or invalid.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        logger.error("Unexpected error while handling item API request.", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
    }

    private ResponseEntity<ApiError> error(HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .body(new ApiError(Instant.now(), status.value(), message));
    }
}
