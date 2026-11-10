package com.it342g02.groupname.thedownfallofusall.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.it342g02.groupname.thedownfallofusall.entity.ClassroomEntity;
import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import com.it342g02.groupname.thedownfallofusall.repository.ClassroomRepository;
import com.it342g02.groupname.thedownfallofusall.repository.TeacherRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClassroomServiceTest {
    @Mock
    private ClassroomRepository classroomRepository;

    @Mock
    private TeacherRepository teacherRepository;

    @InjectMocks
    private ClassroomService classroomService;

    @Test
    void createsClassroomForExistingTeacher() {
        TeacherEntity teacher = new TeacherEntity("Teacher", "teacher@example.com", new byte[]{1}, new byte[]{2});
        when(classroomRepository.existsByOwner_Id(1)).thenReturn(false);
        when(teacherRepository.findById(1)).thenReturn(Optional.of(teacher));
        when(classroomRepository.save(org.mockito.ArgumentMatchers.any(ClassroomEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ClassroomEntity classroom = classroomService.create(" Grade 1 ", 1, 1);

        assertEquals("Grade 1", classroom.getName());
        assertEquals(1, classroom.getGrade());
        assertEquals(teacher, classroom.getOwner());
    }

    @Test
    void enforcesOneClassroomPerTeacher() {
        when(classroomRepository.existsByOwner_Id(1)).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> classroomService.create("Grade 1", 1, 1));
    }
}
