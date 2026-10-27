package com.arallink.itemcrud.service;

import com.arallink.itemcrud.entity.ItemEntity;
import com.arallink.itemcrud.repository.ItemRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemService {
    private final ItemRepository itemRepository;

    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    public ItemEntity postItem(ItemEntity item) {
        return itemRepository.save(item);
    }

    public List<ItemEntity> getAllItems() {
        return itemRepository.findAll();
    }

    @Transactional
    public ItemEntity putItem(int id, ItemEntity newItemDetails) {
        ItemEntity item = itemRepository.findById(id)
                .orElseThrow(() -> new ItemNotFoundException(id));
        item.setName(newItemDetails.getName());
        item.setUnit(newItemDetails.getUnit());
        item.setPrice(newItemDetails.getPrice());
        return itemRepository.save(item);
    }

    public String deleteItem(int id) {
        if (!itemRepository.existsById(id)) {
            throw new ItemNotFoundException(id);
        }
        itemRepository.deleteById(id);
        return "Item " + id + " is successfully deleted!";
    }
}
