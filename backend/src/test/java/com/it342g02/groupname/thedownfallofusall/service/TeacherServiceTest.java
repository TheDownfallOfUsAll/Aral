package com.it342g02.groupname.thedownfallofusall.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import com.it342g02.groupname.thedownfallofusall.repository.TeacherRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TeacherServiceTest {
    @Mock
    private TeacherRepository teacherRepository;

    @Mock
    private PasswordHasher passwordHasher;

    @InjectMocks
    private TeacherService teacherService;

    @Test
    void createsTeacherWithNormalizedEmailAndHashedPassword() {
        byte[] hash = {1, 2, 3};
        byte[] salt = {4, 5, 6};
        when(teacherRepository.existsByEmailIgnoreCase("teacher@example.com")).thenReturn(false);
        when(passwordHasher.hash("password123")).thenReturn(new PasswordHasher.HashedPassword(hash, salt));
        when(teacherRepository.save(org.mockito.ArgumentMatchers.any(TeacherEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TeacherEntity teacher = teacherService.create(" Teacher ", " Teacher@Example.com ", "password123");

        assertEquals("Teacher", teacher.getName());
        assertEquals("teacher@example.com", teacher.getEmail());
        assertNotEquals("password123", new String(teacher.getPasswordHash()));
        assertEquals(hash.length, teacher.getPasswordHash().length);
        assertEquals(salt.length, teacher.getPasswordSalt().length);
    }

    @Test
    void rejectsDuplicateTeacherEmail() {
        when(teacherRepository.existsByEmailIgnoreCase("teacher@example.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> teacherService.create("Teacher", "teacher@example.com", "password123"));
    }

    @Test
    void reportsMissingTeacher() {
        when(teacherRepository.findById(404)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teacherService.findById(404));
    }

    @Test
    void deletesExistingTeacher() {
        when(teacherRepository.existsById(1)).thenReturn(true);

        teacherService.delete(1);

        verify(teacherRepository).deleteById(1);
    }
}
