package com.it342g02.groupname.thedownfallofusall.repository;

import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherRepository extends JpaRepository<TeacherEntity, Integer> {
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, int id);
}
