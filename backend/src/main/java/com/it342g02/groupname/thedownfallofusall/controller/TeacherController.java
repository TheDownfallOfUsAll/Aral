package com.it342g02.groupname.thedownfallofusall.controller;

import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import com.it342g02.groupname.thedownfallofusall.service.TeacherService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/teachers")
public class TeacherController {
    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeacherEntity create(@Valid @RequestBody CreateTeacherRequest request) {
        return teacherService.create(request.name(), request.email(), request.password());
    }

    @GetMapping
    public List<TeacherEntity> findAll() {
        return teacherService.findAll();
    }

    @GetMapping("/{id}")
    public TeacherEntity findById(@PathVariable int id) {
        return teacherService.findById(id);
    }

    @PutMapping("/{id}")
    public TeacherEntity update(@PathVariable int id, @Valid @RequestBody UpdateTeacherRequest request) {
        return teacherService.update(id, request.name(), request.email(), request.password());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        teacherService.delete(id);
    }

    public record CreateTeacherRequest(
            @NotBlank String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8) String password) {
    }

    public record UpdateTeacherRequest(
            @NotBlank String name,
            @NotBlank @Email String email,
            @Size(min = 8) String password) {
    }
}
