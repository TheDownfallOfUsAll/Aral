package com.it342g02.groupname.thedownfallofusall.controller;

import com.it342g02.groupname.thedownfallofusall.entity.ClassroomEntity;
import com.it342g02.groupname.thedownfallofusall.service.ClassroomService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {
    private final ClassroomService classroomService;

    public ClassroomController(ClassroomService classroomService) {
        this.classroomService = classroomService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomEntity create(@Valid @RequestBody ClassroomRequest request) {
        return classroomService.create(request.name(), request.grade(), request.ownerUserId());
    }

    @GetMapping
    public java.util.List<ClassroomEntity> findAll() {
        return classroomService.findAll();
    }

    @GetMapping("/{id}")
    public ClassroomEntity findById(@PathVariable int id) {
        return classroomService.findById(id);
    }

    @PutMapping("/{id}")
    public ClassroomEntity update(@PathVariable int id, @Valid @RequestBody ClassroomRequest request) {
        return classroomService.update(id, request.name(), request.grade(), request.ownerUserId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        classroomService.delete(id);
    }

    public record ClassroomRequest(
            @NotBlank String name,
            @Positive int grade,
            @Positive int ownerUserId) {
    }
}
