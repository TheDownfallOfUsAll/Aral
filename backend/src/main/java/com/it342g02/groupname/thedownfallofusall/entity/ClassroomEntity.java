package com.it342g02.groupname.thedownfallofusall.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "classrooms")
public class ClassroomEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Positive
    @Column(nullable = false)
    private int grade = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private long createdAt;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_user_id", nullable = false, unique = true)
    private TeacherEntity owner;

    @JsonIgnore
    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudentEntity> students = new ArrayList<>();

    protected ClassroomEntity() {
    }

    public ClassroomEntity(String name, int grade, TeacherEntity owner) {
        this.name = name;
        this.grade = grade;
        this.owner = owner;
        this.createdAt = System.currentTimeMillis();
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getGrade() {
        return grade;
    }

    public void setGrade(int grade) {
        this.grade = grade;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public TeacherEntity getOwner() {
        return owner;
    }

    public void setOwner(TeacherEntity owner) {
        this.owner = owner;
    }

    public List<StudentEntity> getStudents() {
        return students;
    }
}
