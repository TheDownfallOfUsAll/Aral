package com.arallink.itemcrud.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "item")
public class ItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int itemid;

    @NotBlank(message = "Name is required.")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Unit is required.")
    @Column(nullable = false)
    private String unit;

    @DecimalMin(value = "0.0", message = "Price must be zero or greater.")
    @Column(nullable = false)
    private float price;

    public ItemEntity() {
    }

    public ItemEntity(String name, String unit, float price) {
        this.name = name;
        this.unit = unit;
        this.price = price;
    }

    public int getItemid() {
        return itemid;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public float getPrice() {
        return price;
    }

    public void setPrice(float price) {
        this.price = price;
    }
}
