package com.it342g02.groupname.thedownfallofusall.repository;

import com.it342g02.groupname.thedownfallofusall.entity.StudentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<StudentEntity, Integer> {
    List<StudentEntity> findAllByClassroom_IdOrderById(int classroomId);
}
