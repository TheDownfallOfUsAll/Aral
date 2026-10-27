package com.arallink.itemcrud.service;

public class ItemNotFoundException extends RuntimeException {
    public ItemNotFoundException(int id) {
        super("Item " + id + " does not exist.");
    }
}
