package com.solchall.todai.domain.analysis.repository;

import com.solchall.todai.domain.analysis.entity.AnalysisMetric;
import com.solchall.todai.domain.analysis.entity.MetricType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AnalysisMetricRepository extends JpaRepository<AnalysisMetric, Long> {

    List<AnalysisMetric> findByAnalysisResultId(Long analysisResultId);

    Optional<AnalysisMetric> findByAnalysisResultIdAndMetricType(Long analysisResultId, MetricType metricType);

    List<AnalysisMetric> findByAnalysisResultIdIn(Collection<Long> analysisResultIds);

    void deleteByAnalysisResultId(Long analysisResultId);
}
