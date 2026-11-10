package com.it342g02.groupname.thedownfallofusall.controller;

import com.it342g02.groupname.thedownfallofusall.entity.StudentEntity;
import com.it342g02.groupname.thedownfallofusall.service.StudentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentEntity create(@Valid @RequestBody StudentRequest request) {
        return studentService.create(request.name(), request.grade(), request.classroomId());
    }

    @GetMapping
    public List<StudentEntity> findAll(@RequestParam(required = false) Integer classroomId) {
        return studentService.findAll(classroomId);
    }

    @GetMapping("/{id}")
    public StudentEntity findById(@PathVariable int id) {
        return studentService.findById(id);
    }

    @PutMapping("/{id}")
    public StudentEntity update(@PathVariable int id, @Valid @RequestBody StudentRequest request) {
        return studentService.update(id, request.name(), request.grade(), request.classroomId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        studentService.delete(id);
    }

    public record StudentRequest(
            @NotBlank String name,
            @Positive int grade,
            @Positive int classroomId) {
    }
}
