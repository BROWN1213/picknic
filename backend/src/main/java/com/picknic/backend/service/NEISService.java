package com.picknic.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.picknic.backend.domain.School;
import com.picknic.backend.domain.SchoolRepository;
import com.picknic.backend.dto.neis.NEISSchoolResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NEISService {

    private final RestTemplate restTemplate;
    private final SchoolRepository schoolRepository;
    private final ObjectMapper objectMapper;

    @Value("${neis.api.url}")
    private String neisApiUrl;

    @Value("${neis.api.key:}")
    private String neisApiKey;

    /**
     * Fetch schools from NEIS API with pagination
     * Returns List<School> for both HIGH and MIDDLE types
     */
    public List<School> fetchSchoolsFromNEIS() {
        List<School> allSchools = new ArrayList<>();

        log.info("Starting NEIS API fetch...");

        // Fetch 고등학교
        List<School> highSchools = fetchSchoolsByType("고등학교", "HIGH");
        allSchools.addAll(highSchools);
        log.info("Fetched {} high schools from NEIS", highSchools.size());

        // Fetch 중학교
        List<School> middleSchools = fetchSchoolsByType("중학교", "MIDDLE");
        allSchools.addAll(middleSchools);
        log.info("Fetched {} middle schools from NEIS", middleSchools.size());

        log.info("Total schools fetched from NEIS: {}", allSchools.size());
        return allSchools;
    }

    /**
     * Fetch schools by type from NEIS API with pagination
     */
    private List<School> fetchSchoolsByType(String neisType, String internalType) {
        List<School> schools = new ArrayList<>();
        int pageIndex = 1;
        int pageSize = 1000; // NEIS max
        boolean hasMorePages = true;

        while (hasMorePages) {
            try {
                String url = buildNeisUrl(neisType, pageIndex, pageSize);
                log.debug("Fetching NEIS page {} for type {}: {}", pageIndex, neisType, url);

                ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    NEISSchoolResponse neisResponse = objectMapper.readValue(
                            response.getBody(),
                            NEISSchoolResponse.class
                    );

                    List<School> pageSchools = parseSchoolsFromResponse(neisResponse, internalType);
                    schools.addAll(pageSchools);

                    // Check if more pages exist
                    hasMorePages = pageSchools.size() == pageSize;
                    pageIndex++;

                    log.debug("Page {} returned {} schools", pageIndex - 1, pageSchools.size());
                } else {
                    log.warn("NEIS API returned non-200 status: {}", response.getStatusCode());
                    hasMorePages = false;
                }
            } catch (Exception e) {
                log.error("Error fetching NEIS page {} for type {}: {}", pageIndex, neisType, e.getMessage());
                hasMorePages = false;
            }
        }

        return schools;
    }

    /**
     * Build NEIS API URL with parameters
     */
    private String buildNeisUrl(String schoolType, int pageIndex, int pageSize) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(neisApiUrl)
                .queryParam("Type", "json")
                .queryParam("pIndex", pageIndex)
                .queryParam("pSize", pageSize)
                .queryParam("SCHUL_KND_SC_NM", schoolType);

        // Add API key if provided
        if (!neisApiKey.isEmpty()) {
            builder.queryParam("KEY", neisApiKey);
        }

        return builder.toUriString();
    }

    /**
     * Parse schools from NEIS API response
     */
    private List<School> parseSchoolsFromResponse(NEISSchoolResponse response, String type) {
        if (response == null || response.getSchoolInfo() == null || response.getSchoolInfo().isEmpty()) {
            return Collections.emptyList();
        }

        try {
            return response.getSchoolInfo().get(0).getRow().stream()
                    .map(row -> {
                        School school = new School();
                        school.setName(row.getSchoolName());
                        school.setType(type);
                        school.setRegion(row.getRegion());
                        school.setAddress(row.getAddress());
                        school.setLastUpdated(LocalDateTime.now());
                        return school;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error parsing NEIS response: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fallback: Load schools from JSON files
     */
    public List<School> loadSchoolsFromJson() {
        List<School> schools = new ArrayList<>();

        log.info("Loading schools from JSON files as fallback...");

        try {
            // Load high schools
            InputStream highStream = new ClassPathResource("act_high.json").getInputStream();
            Map<String, String> highSchools = objectMapper.readValue(
                    highStream,
                    new TypeReference<Map<String, String>>() {}
            );

            highSchools.keySet().forEach(name -> {
                School school = new School();
                school.setName(name);
                school.setType("HIGH");
                school.setRegion("미분류"); // Default region for fallback
                school.setLastUpdated(LocalDateTime.now());
                schools.add(school);
            });

            log.info("Loaded {} high schools from JSON", highSchools.size());

            // Load middle schools
            InputStream middleStream = new ClassPathResource("act_middle.json").getInputStream();
            Map<String, String> middleSchools = objectMapper.readValue(
                    middleStream,
                    new TypeReference<Map<String, String>>() {}
            );

            middleSchools.keySet().forEach(name -> {
                School school = new School();
                school.setName(name);
                school.setType("MIDDLE");
                school.setRegion("미분류");
                school.setLastUpdated(LocalDateTime.now());
                schools.add(school);
            });

            log.info("Loaded {} middle schools from JSON", middleSchools.size());
            log.info("Total schools loaded from JSON: {}", schools.size());

        } catch (Exception e) {
            log.error("Error loading schools from JSON files: {}", e.getMessage(), e);
        }

        return schools;
    }

    /**
     * Main sync method: Try NEIS first, fallback to JSON
     * Clears existing data and performs bulk insert
     */
    @Transactional
    public void syncSchools() {
        log.info("Starting school synchronization...");

        List<School> schools;

        try {
            schools = fetchSchoolsFromNEIS();

            // If NEIS returns nothing or very few schools, use fallback
            if (schools.isEmpty() || schools.size() < 100) {
                log.warn("NEIS returned insufficient data ({} schools), using JSON fallback", schools.size());
                schools = loadSchoolsFromJson();
            }
        } catch (Exception e) {
            log.error("NEIS fetch failed completely, using JSON fallback: {}", e.getMessage());
            schools = loadSchoolsFromJson();
        }

        // Perform sync if we have data
        if (!schools.isEmpty()) {
            log.info("Clearing existing school data...");
            schoolRepository.deleteAll();

            log.info("Saving {} schools to database...", schools.size());
            schoolRepository.saveAll(schools);

            log.info("School synchronization completed successfully: {} schools saved", schools.size());
        } else {
            log.error("No schools to sync! Both NEIS and JSON fallback failed.");
        }
    }
}
