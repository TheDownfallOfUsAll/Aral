package com.arallink.itemcrud.controller;

import com.arallink.itemcrud.entity.ItemEntity;
import com.arallink.itemcrud.service.ItemService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/item/api")
@CrossOrigin(origins = "${app.cors.allowed-origin:http://localhost:5173}")
public class ItemController {
    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping("/printAuthor")
    public String printAuthor() {
        return "Nikolai Javier";
    }

    @PostMapping("/postNewItem")
    public ItemEntity postItem(@Valid @RequestBody ItemEntity item) {
        return itemService.postItem(item);
    }

    @GetMapping("/getAllItems")
    public List<ItemEntity> getAllItems() {
        return itemService.getAllItems();
    }

    @PutMapping("/putItem")
    public ItemEntity putItem(@RequestParam int id, @Valid @RequestBody ItemEntity newItemDetails) {
        return itemService.putItem(id, newItemDetails);
    }

    @DeleteMapping("/deleteItem/{id}")
    public String deleteItem(@PathVariable int id) {
        return itemService.deleteItem(id);
    }
}
