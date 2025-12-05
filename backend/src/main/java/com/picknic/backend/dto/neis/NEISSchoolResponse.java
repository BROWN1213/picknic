package com.picknic.backend.dto.neis;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class NEISSchoolResponse {

    @JsonProperty("schoolInfo")
    private List<SchoolInfo> schoolInfo;

    @Data
    @NoArgsConstructor
    public static class SchoolInfo {
        @JsonProperty("row")
        private List<Row> row;
    }

    @Data
    @NoArgsConstructor
    public static class Row {
        @JsonProperty("SCHUL_NM")
        private String schoolName;

        @JsonProperty("LCTN_SC_NM")
        private String region;

        @JsonProperty("ORG_RDNMA")
        private String address;

        @JsonProperty("SCHUL_KND_SC_NM")
        private String schoolKind;
    }
}
