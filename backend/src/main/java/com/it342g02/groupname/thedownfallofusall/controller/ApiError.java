package com.it342g02.groupname.thedownfallofusall.controller;

import java.time.Instant;

public record ApiError(Instant timestamp, int status, String message) {
}
