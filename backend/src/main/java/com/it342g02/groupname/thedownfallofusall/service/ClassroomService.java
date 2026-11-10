package com.it342g02.groupname.thedownfallofusall.service;

import com.it342g02.groupname.thedownfallofusall.entity.ClassroomEntity;
import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import com.it342g02.groupname.thedownfallofusall.repository.ClassroomRepository;
import com.it342g02.groupname.thedownfallofusall.repository.TeacherRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClassroomService {
    private final ClassroomRepository classroomRepository;
    private final TeacherRepository teacherRepository;

    public ClassroomService(ClassroomRepository classroomRepository, TeacherRepository teacherRepository) {
        this.classroomRepository = classroomRepository;
        this.teacherRepository = teacherRepository;
    }

    public ClassroomEntity create(String name, int grade, int ownerId) {
        if (classroomRepository.existsByOwner_Id(ownerId)) {
            throw new DuplicateResourceException("This teacher already has a classroom.");
        }
        TeacherEntity owner = teacherRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", ownerId));
        return classroomRepository.save(new ClassroomEntity(name.trim(), grade, owner));
    }

    public List<ClassroomEntity> findAll() {
        return classroomRepository.findAll();
    }

    public ClassroomEntity findById(int id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", id));
    }

    @Transactional
    public ClassroomEntity update(int id, String name, int grade, int ownerId) {
        ClassroomEntity classroom = findById(id);
        TeacherEntity owner = teacherRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", ownerId));
        if (!classroom.getOwner().getId().equals(ownerId) && classroomRepository.existsByOwner_Id(ownerId)) {
            throw new DuplicateResourceException("This teacher already has a classroom.");
        }
        classroom.setName(name.trim());
        classroom.setGrade(grade);
        classroom.setOwner(owner);
        return classroomRepository.save(classroom);
    }

    public void delete(int id) {
        if (!classroomRepository.existsById(id)) {
            throw new ResourceNotFoundException("Classroom", id);
        }
        classroomRepository.deleteById(id);
    }
}
