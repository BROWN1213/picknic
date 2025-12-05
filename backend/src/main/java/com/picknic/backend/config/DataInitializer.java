package com.picknic.backend.config;

import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Create test user
        if (userRepository.findByEmail("test@picknic.com").isEmpty()) {
            User user = User.builder()
                    .email("test@picknic.com")
                    .password(passwordEncoder.encode("password123"))
                    .nickname("경기고학생")
                    .schoolName("경기고등학교")
                    .gender("MALE")
                    .birthYear(2008)
                    .interests(Arrays.asList("축구", "게임", "음악"))
                    .provider(User.AuthProvider.LOCAL)
                    .build();

            userRepository.save(user);
        }

        // Create system user for HOT votes (excluded from rankings)
        User systemUser = userRepository.findByEmail("system@picknic.com")
                .orElseGet(() -> {
                    User newSystemUser = User.builder()
                            .email("system@picknic.com")
                            .password(passwordEncoder.encode("system_secure_password_2024!@#"))
                            .nickname("Picknic")
                            .schoolName(null) // No school for system user
                            .gender("OTHER")
                            .birthYear(2024)
                            .interests(Arrays.asList("투표", "커뮤니티"))
                            .provider(User.AuthProvider.LOCAL)
                            .isSystemAccount(true)
                            .build();
                    return userRepository.save(newSystemUser);
                });

        // Update existing system user if needed
        if (!systemUser.getIsSystemAccount()) {
            systemUser.setIsSystemAccount(true);
            userRepository.save(systemUser);
        }
    }
}
