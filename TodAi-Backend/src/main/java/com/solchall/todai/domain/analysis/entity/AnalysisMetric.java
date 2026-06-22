package com.solchall.todai.domain.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "analysis_metric",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_analysis_metric_result_type", columnNames = {"analysis_result_id", "metric_type"})
        }
)
public class AnalysisMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_result_id", nullable = false)
    private AnalysisResult analysisResult;

    @Enumerated(EnumType.STRING)
    @Column(name = "metric_type", nullable = false, length = 50)
    private MetricType metricType;

    @Column(name = "metric_score", precision = 10, scale = 2)
    private BigDecimal metricScore;

    @Column(name = "baseline_score", precision = 10, scale = 2)
    private BigDecimal baselineScore;

    @Column(name = "score_change", precision = 10, scale = 2)
    private BigDecimal scoreChange;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected AnalysisMetric() {
    }

    public AnalysisMetric(
            AnalysisResult analysisResult,
            MetricType metricType,
            BigDecimal metricScore,
            BigDecimal baselineScore,
            BigDecimal scoreChange
    ) {
        this.analysisResult = analysisResult;
        this.metricType = metricType;
        this.metricScore = metricScore;
        this.baselineScore = baselineScore;
        this.scoreChange = scoreChange;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateMetricScore(BigDecimal metricScore) {
        this.metricScore = metricScore;
    }

    public Long getId() {
        return id;
    }

    public AnalysisResult getAnalysisResult() {
        return analysisResult;
    }

    public MetricType getMetricType() {
        return metricType;
    }

    public BigDecimal getMetricScore() {
        return metricScore;
    }

    public BigDecimal getBaselineScore() {
        return baselineScore;
    }

    public BigDecimal getScoreChange() {
        return scoreChange;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
