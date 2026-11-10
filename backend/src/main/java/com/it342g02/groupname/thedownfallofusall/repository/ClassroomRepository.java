package com.it342g02.groupname.thedownfallofusall.repository;

import com.it342g02.groupname.thedownfallofusall.entity.ClassroomEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassroomRepository extends JpaRepository<ClassroomEntity, Integer> {
    boolean existsByOwner_Id(int ownerId);
}
