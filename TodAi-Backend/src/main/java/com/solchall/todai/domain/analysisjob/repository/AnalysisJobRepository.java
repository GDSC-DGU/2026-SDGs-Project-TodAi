package com.solchall.todai.domain.analysisjob.repository;

import com.solchall.todai.domain.analysisjob.entity.AnalysisJob;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AnalysisJobRepository extends JpaRepository<AnalysisJob, Long> {

    Optional<AnalysisJob> findByAnalysisResultId(Long analysisResultId);

    Optional<AnalysisJob> findByCorrelationId(String correlationId);

    List<AnalysisJob> findByStatusOrderByCreatedAtAsc(AnalysisJobStatus status);
}
