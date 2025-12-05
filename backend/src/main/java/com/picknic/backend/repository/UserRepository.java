package com.picknic.backend.repository;

import com.picknic.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByNickname(String nickname);
    List<User> findBySchoolNameContaining(String schoolName);
    List<User> findAllByEmailIn(List<String> emails);
}
