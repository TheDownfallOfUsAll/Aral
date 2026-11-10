package com.it342g02.groupname.thedownfallofusall.service;

import com.it342g02.groupname.thedownfallofusall.entity.ClassroomEntity;
import com.it342g02.groupname.thedownfallofusall.entity.StudentEntity;
import com.it342g02.groupname.thedownfallofusall.repository.ClassroomRepository;
import com.it342g02.groupname.thedownfallofusall.repository.StudentRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class StudentService {
    private final StudentRepository studentRepository;
    private final ClassroomRepository classroomRepository;

    public StudentService(StudentRepository studentRepository, ClassroomRepository classroomRepository) {
        this.studentRepository = studentRepository;
        this.classroomRepository = classroomRepository;
    }

    public StudentEntity create(String name, int grade, int classroomId) {
        ClassroomEntity classroom = findClassroom(classroomId);
        return studentRepository.save(new StudentEntity(name.trim(), grade, classroom));
    }

    public List<StudentEntity> findAll(Integer classroomId) {
        return classroomId == null
                ? studentRepository.findAll()
                : studentRepository.findAllByClassroom_IdOrderById(classroomId);
    }

    public StudentEntity findById(int id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", id));
    }

    public StudentEntity update(int id, String name, int grade, int classroomId) {
        StudentEntity student = findById(id);
        student.setName(name.trim());
        student.setGrade(grade);
        student.setClassroom(findClassroom(classroomId));
        return studentRepository.save(student);
    }

    public void delete(int id) {
        if (!studentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Student", id);
        }
        studentRepository.deleteById(id);
    }

    private ClassroomEntity findClassroom(int id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", id));
    }
}
