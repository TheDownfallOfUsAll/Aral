package com.it342g02.groupname.thedownfallofusall.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.it342g02.groupname.thedownfallofusall.entity.ClassroomEntity;
import com.it342g02.groupname.thedownfallofusall.entity.StudentEntity;
import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import com.it342g02.groupname.thedownfallofusall.repository.ClassroomRepository;
import com.it342g02.groupname.thedownfallofusall.repository.StudentRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {
    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ClassroomRepository classroomRepository;

    @InjectMocks
    private StudentService studentService;

    @Test
    void createsStudentInExistingClassroom() {
        TeacherEntity teacher = new TeacherEntity("Teacher", "teacher@example.com", new byte[]{1}, new byte[]{2});
        ClassroomEntity classroom = new ClassroomEntity("Grade 1", 1, teacher);
        when(classroomRepository.findById(1)).thenReturn(Optional.of(classroom));
        when(studentRepository.save(org.mockito.ArgumentMatchers.any(StudentEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StudentEntity student = studentService.create(" Student ", 1, 1);

        assertEquals("Student", student.getName());
        assertEquals(classroom, student.getClassroom());
    }

    @Test
    void rejectsStudentForMissingClassroom() {
        when(classroomRepository.findById(404)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> studentService.create("Student", 1, 404));
    }
}
