package com.picknic.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSignupDto {
    private String email;
    private String password;
    private String nickname;
    private String gender;
    private Integer birthYear;
    private String schoolName;
    private List<String> interests;
    private String providerId; // From Google
}
