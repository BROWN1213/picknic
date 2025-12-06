package com.picknic.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"email", "provider"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private String password; // OAuth users have null password

    private String nickname; // Can be temporary for OAuth users until profile completion

    private String gender; // "MALE", "FEMALE"

    private Integer birthYear;

    private String schoolName; // Storing name for simplicity for now, could be ID

    @ElementCollection
    private List<String> interests;

    @Enumerated(EnumType.STRING)
    private AuthProvider provider;

    private String providerId;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean isSystemAccount = false;

    public enum AuthProvider {
        GOOGLE,
        LOCAL
    }
}
