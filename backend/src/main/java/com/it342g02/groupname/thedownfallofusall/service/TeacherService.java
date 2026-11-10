package com.it342g02.groupname.thedownfallofusall.service;

import com.it342g02.groupname.thedownfallofusall.entity.TeacherEntity;
import com.it342g02.groupname.thedownfallofusall.repository.TeacherRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeacherService {
    private final TeacherRepository teacherRepository;
    private final PasswordHasher passwordHasher;

    public TeacherService(TeacherRepository teacherRepository, PasswordHasher passwordHasher) {
        this.teacherRepository = teacherRepository;
        this.passwordHasher = passwordHasher;
    }

    public TeacherEntity create(String name, String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (teacherRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("A teacher with this email already exists.");
        }
        PasswordHasher.HashedPassword hashed = passwordHasher.hash(password);
        return teacherRepository.save(new TeacherEntity(name.trim(), normalizedEmail, hashed.hash(), hashed.salt()));
    }

    public List<TeacherEntity> findAll() {
        return teacherRepository.findAll();
    }

    public TeacherEntity findById(int id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", id));
    }

    @Transactional
    public TeacherEntity update(int id, String name, String email, String password) {
        TeacherEntity teacher = findById(id);
        String normalizedEmail = normalizeEmail(email);
        if (teacherRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, id)) {
            throw new DuplicateResourceException("A teacher with this email already exists.");
        }
        teacher.setName(name.trim());
        teacher.setEmail(normalizedEmail);
        if (password != null) {
            PasswordHasher.HashedPassword hashed = passwordHasher.hash(password);
            teacher.setPasswordHash(hashed.hash());
            teacher.setPasswordSalt(hashed.salt());
        }
        return teacherRepository.save(teacher);
    }

    public void delete(int id) {
        if (!teacherRepository.existsById(id)) {
            throw new ResourceNotFoundException("Teacher", id);
        }
        teacherRepository.deleteById(id);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
