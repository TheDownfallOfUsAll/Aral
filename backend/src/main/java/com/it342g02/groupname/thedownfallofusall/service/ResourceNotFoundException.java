package com.it342g02.groupname.thedownfallofusall.service;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, int id) {
        super(resource + " " + id + " was not found.");
    }
}
