package com.arallink.itemcrud.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.arallink.itemcrud.entity.ItemEntity;
import com.arallink.itemcrud.repository.ItemRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ItemServiceTest {
    @Mock
    private ItemRepository itemRepository;

    @InjectMocks
    private ItemService itemService;

    @Test
    void createsItem() {
        ItemEntity item = new ItemEntity("Pencil", "piece", 1.5f);
        when(itemRepository.save(item)).thenReturn(item);

        assertEquals(item, itemService.postItem(item));
    }

    @Test
    void listsItems() {
        List<ItemEntity> items = List.of(new ItemEntity("Pencil", "piece", 1.5f));
        when(itemRepository.findAll()).thenReturn(items);

        assertEquals(items, itemService.getAllItems());
    }

    @Test
    void updatesExistingItem() {
        ItemEntity existing = new ItemEntity("Old name", "box", 2.0f);
        ItemEntity update = new ItemEntity("Pencil", "piece", 1.5f);
        when(itemRepository.findById(1)).thenReturn(Optional.of(existing));
        when(itemRepository.save(existing)).thenReturn(existing);

        ItemEntity result = itemService.putItem(1, update);

        assertEquals("Pencil", result.getName());
        assertEquals("piece", result.getUnit());
        assertEquals(1.5f, result.getPrice());
    }

    @Test
    void rejectsUpdateForUnknownItem() {
        when(itemRepository.findById(404)).thenReturn(Optional.empty());

        assertThrows(ItemNotFoundException.class, () -> itemService.putItem(404,
                new ItemEntity("Pencil", "piece", 1.5f)));
    }

    @Test
    void rejectsDeleteForUnknownItem() {
        when(itemRepository.existsById(404)).thenReturn(false);

        assertThrows(ItemNotFoundException.class, () -> itemService.deleteItem(404));
    }

    @Test
    void deletesExistingItem() {
        when(itemRepository.existsById(1)).thenReturn(true);

        assertEquals("Item 1 is successfully deleted!", itemService.deleteItem(1));
        verify(itemRepository).deleteById(1);
    }
}
