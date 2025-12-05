package com.picknic.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProfileCompletionDto {
    private String nickname;
    private String gender;
    private Integer birthYear;
    private String schoolName;
    private List<String> interests;
}
