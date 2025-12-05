package com.picknic.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SchoolRepository extends JpaRepository<School, Long> {

    // 타입(고등/중등)으로 찾고, 이름 가나다순으로 정렬해서 가져오기
    List<School> findByTypeOrderByNameAsc(String type);

    // 전체 학교를 가나다순으로 정렬해서 반환 (새로운 /schools/all API용)
    List<School> findAllByOrderByNameAsc();

    // 특정 지역의 학교를 가나다순으로 정렬해서 반환 (향후 사용 가능)
    List<School> findByRegionOrderByNameAsc(String region);

    // 타입과 지역으로 필터링하여 가나다순으로 정렬해서 반환 (향후 사용 가능)
    List<School> findByTypeAndRegionOrderByNameAsc(String type, String region);
}