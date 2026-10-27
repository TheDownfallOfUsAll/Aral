package com.arallink.itemcrud.repository;

import com.arallink.itemcrud.entity.ItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, Integer> {
}
