package com.arallink.itemcrud.controller;

import java.time.Instant;

public record ApiError(Instant timestamp, int status, String message) {
}
