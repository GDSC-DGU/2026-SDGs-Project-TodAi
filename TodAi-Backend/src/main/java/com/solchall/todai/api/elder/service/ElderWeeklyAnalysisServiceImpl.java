package com.solchall.todai.api.elder.service;

import com.solchall.todai.api.elder.dto.ElderWeeklyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderWeeklyAnalysisResponse;
import com.solchall.todai.api.elder.dto.ElderWeeklyDetailRequest;
import com.solchall.todai.api.elder.dto.ElderWeeklyDetailResponse;
import com.solchall.todai.api.elder.dto.WeeklyAnalysisData;
import com.solchall.todai.api.elder.dto.WeeklyDataDto;
import com.solchall.todai.api.elder.dto.WeeklyDetailData;
import com.solchall.todai.api.elder.dto.WeeklyGuideDto;
import com.solchall.todai.api.elder.dto.WeeklyRadarScoreDto;
import com.solchall.todai.api.elder.dto.WeeklySummaryDto;
import com.solchall.todai.domain.analysis.entity.AnalysisMetric;
import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.analysis.entity.AnalysisStatus;
import com.solchall.todai.domain.analysis.entity.MetricType;
import com.solchall.todai.domain.analysis.repository.AnalysisMetricRepository;
import com.solchall.todai.domain.analysis.repository.AnalysisResultRepository;
import com.solchall.todai.domain.conversation.entity.ConversationSession;
import com.solchall.todai.domain.conversation.entity.SessionStatus;
import com.solchall.todai.domain.conversation.repository.ConversationSessionRepository;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ElderWeeklyAnalysisServiceImpl implements ElderWeeklyAnalysisService {

    private static final List<SessionStatus> AVAILABLE_SESSION_STATUSES = List.of(SessionStatus.COMPLETED);
    private static final List<AnalysisStatus> AVAILABLE_ANALYSIS_STATUSES = List.of(
            AnalysisStatus.SUCCESS,
            AnalysisStatus.PARTIAL
    );
    private static final List<MetricType> METRIC_ORDER = List.of(
            MetricType.SOCIAL_ISOLATION,
            MetricType.COGNITIVE_DECLINE,
            MetricType.EMOTIONAL_VARIATION,
            MetricType.DAILY_VITALITY,
            MetricType.HEALTH_ANXIETY
    );
    private static final Map<DayOfWeek, String> DAY_OF_WEEK_LABELS = Map.of(
            DayOfWeek.MONDAY, "월",
            DayOfWeek.TUESDAY, "화",
            DayOfWeek.WEDNESDAY, "수",
            DayOfWeek.THURSDAY, "목",
            DayOfWeek.FRIDAY, "금",
            DayOfWeek.SATURDAY, "토",
            DayOfWeek.SUNDAY, "일"
    );

    private final ElderRepository elderRepository;
    private final ConversationSessionRepository conversationSessionRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final AnalysisMetricRepository analysisMetricRepository;

    public ElderWeeklyAnalysisServiceImpl(
            ElderRepository elderRepository,
            ConversationSessionRepository conversationSessionRepository,
            AnalysisResultRepository analysisResultRepository,
            AnalysisMetricRepository analysisMetricRepository
    ) {
        this.elderRepository = elderRepository;
        this.conversationSessionRepository = conversationSessionRepository;
        this.analysisResultRepository = analysisResultRepository;
        this.analysisMetricRepository = analysisMetricRepository;
    }

    @Override
    public ElderWeeklyAnalysisResponse getWeeklyAnalysis(ElderWeeklyAnalysisRequest request) {
        validateElderExists(request.elderId());

        LocalDate startDate = request.date().minusDays(6);
        List<LocalDate> dates = createDateRange(startDate, request.date());
        List<ConversationSession> sessions = findWeeklyCompletedSessions(request.elderId(), request.date());

        List<Long> sessionIds = sessions.stream()
                .map(ConversationSession::getId)
                .toList();

        List<AnalysisResult> analysisResults = findAvailableAnalysisResults(sessionIds);

        List<Long> analysisResultIds = analysisResults.stream()
                .map(AnalysisResult::getId)
                .toList();

        List<AnalysisMetric> analysisMetrics = findAnalysisMetrics(analysisResultIds);

        Map<LocalDate, List<ConversationSession>> sessionsByDate = sessions.stream()
                .collect(Collectors.groupingBy(session -> session.getStartedAt().toLocalDate()));

        Map<Long, ConversationSession> sessionById = sessions.stream()
                .collect(Collectors.toMap(ConversationSession::getId, Function.identity()));

        Map<LocalDate, List<AnalysisResult>> analysisResultsByDate = analysisResults.stream()
                .collect(Collectors.groupingBy(result -> sessionById.get(result.getConversationSession().getId()).getStartedAt().toLocalDate()));

        List<WeeklyDataDto> weeklyData = dates.stream()
                .map(date -> toWeeklyData(date, sessionsByDate.getOrDefault(date, List.of()), analysisResultsByDate.getOrDefault(date, List.of())))
                .toList();

        List<WeeklyRadarScoreDto> weeklyScoresRadar = toWeeklyRadarScores(analysisMetrics);
        List<WeeklySummaryDto> summaries = toWeeklySummaries(analysisResults, sessionById);

        return ElderWeeklyAnalysisResponse.from(WeeklyAnalysisData.of(weeklyData, weeklyScoresRadar, summaries));
    }

    @Override
    public ElderWeeklyDetailResponse getWeeklyDetail(ElderWeeklyDetailRequest request) {
        validateElderExists(request.elderId());

        List<ConversationSession> sessions = findWeeklyCompletedSessions(request.elderId(), request.date());
        List<Long> sessionIds = sessions.stream()
                .map(ConversationSession::getId)
                .toList();
        List<AnalysisResult> analysisResults = findAvailableAnalysisResults(sessionIds);
        List<Long> analysisResultIds = analysisResults.stream()
                .map(AnalysisResult::getId)
                .toList();
        List<AnalysisMetric> analysisMetrics = findAnalysisMetrics(analysisResultIds);
        Map<MetricType, List<BigDecimal>> scoresByType = groupMetricScoresByType(analysisMetrics);

        List<WeeklyGuideDto> guides = METRIC_ORDER.stream()
                .map(metricType -> new WeeklyGuideDto(
                        resolveWeeklyDetailType(metricType),
                        resolveWeeklyGuideStatus(averageMetricScore(scoresByType.get(metricType)))
                ))
                .toList();

        return ElderWeeklyDetailResponse.from(WeeklyDetailData.of(guides));
    }

    private void validateElderExists(Long elderId) {
        if (!elderRepository.existsById(elderId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "어르신을 찾을 수 없습니다.");
        }
    }

    private List<ConversationSession> findWeeklyCompletedSessions(Long elderId, LocalDate date) {
        return conversationSessionRepository
                .findByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanAndSessionStatusInOrderByStartedAtAsc(
                        elderId,
                        date.minusDays(6).atStartOfDay(),
                        date.plusDays(1).atStartOfDay(),
                        AVAILABLE_SESSION_STATUSES
                );
    }

    private List<AnalysisResult> findAvailableAnalysisResults(List<Long> sessionIds) {
        if (sessionIds.isEmpty()) {
            return List.of();
        }
        return analysisResultRepository.findByConversationSessionIdInAndAnalysisStatusIn(
                sessionIds,
                AVAILABLE_ANALYSIS_STATUSES
        );
    }

    private List<AnalysisMetric> findAnalysisMetrics(List<Long> analysisResultIds) {
        if (analysisResultIds.isEmpty()) {
            return List.of();
        }
        return analysisMetricRepository.findByAnalysisResultIdIn(analysisResultIds);
    }

    private List<LocalDate> createDateRange(LocalDate startDate, LocalDate endDate) {
        List<LocalDate> dates = new ArrayList<>(7);
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            dates.add(currentDate);
            currentDate = currentDate.plusDays(1);
        }
        return dates;
    }

    private WeeklyDataDto toWeeklyData(
            LocalDate date,
            List<ConversationSession> sessions,
            List<AnalysisResult> analysisResults
    ) {
        return new WeeklyDataDto(
                date,
                DAY_OF_WEEK_LABELS.get(date.getDayOfWeek()),
                averageOverallScore(analysisResults),
                totalConversationMinutes(sessions)
        );
    }

    private Integer averageOverallScore(List<AnalysisResult> analysisResults) {
        List<BigDecimal> scores = analysisResults.stream()
                .map(AnalysisResult::getOverallScore)
                .filter(score -> score != null)
                .toList();

        if (scores.isEmpty()) {
            return null;
        }

        BigDecimal total = scores.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return total.divide(BigDecimal.valueOf(scores.size()), 0, RoundingMode.HALF_UP).intValue();
    }

    private int totalConversationMinutes(List<ConversationSession> sessions) {
        long totalSeconds = sessions.stream()
                .mapToLong(this::resolveDurationSeconds)
                .sum();
        return Math.toIntExact(totalSeconds / 60);
    }

    private long resolveDurationSeconds(ConversationSession session) {
        if (session.getDurationSeconds() != null) {
            return session.getDurationSeconds();
        }
        if (session.getStartedAt() != null && session.getEndedAt() != null) {
            return Duration.between(session.getStartedAt(), session.getEndedAt()).getSeconds();
        }
        return 0L;
    }

    private List<WeeklyRadarScoreDto> toWeeklyRadarScores(List<AnalysisMetric> analysisMetrics) {
        Map<MetricType, List<BigDecimal>> scoresByType = groupMetricScoresByType(analysisMetrics);

        return METRIC_ORDER.stream()
                .map(metricType -> new WeeklyRadarScoreDto(
                        metricType.name(),
                        resolveMetricDisplayName(metricType),
                        averageMetricScore(scoresByType.get(metricType))
                ))
                .toList();
    }

    private Map<MetricType, List<BigDecimal>> groupMetricScoresByType(List<AnalysisMetric> analysisMetrics) {
        Map<MetricType, List<BigDecimal>> scoresByType = new EnumMap<>(MetricType.class);
        for (AnalysisMetric metric : analysisMetrics) {
            if (metric.getMetricScore() == null) {
                continue;
            }
            scoresByType.computeIfAbsent(metric.getMetricType(), ignored -> new ArrayList<>())
                    .add(metric.getMetricScore());
        }
        return scoresByType;
    }

    private String resolveMetricDisplayName(MetricType metricType) {
        return metricType.getDisplayName();
    }

    private Integer resolveWeeklyDetailType(MetricType metricType) {
        return switch (metricType) {
            case SOCIAL_ISOLATION -> 0;
            case COGNITIVE_DECLINE -> 1;
            case EMOTIONAL_VARIATION -> 2;
            case DAILY_VITALITY -> 3;
            case HEALTH_ANXIETY -> 4;
        };
    }

    private String resolveWeeklyGuideStatus(Integer averageScore) {
        if (averageScore == null) {
            return "NO_DATA";
        }
        if (averageScore < 40) {
            return "LOW";
        }
        if (averageScore < 70) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private Integer averageMetricScore(List<BigDecimal> scores) {
        if (scores == null || scores.isEmpty()) {
            return null;
        }

        BigDecimal total = scores.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return total.divide(BigDecimal.valueOf(scores.size()), 0, RoundingMode.HALF_UP).intValue();
    }

    private List<WeeklySummaryDto> toWeeklySummaries(
            List<AnalysisResult> analysisResults,
            Map<Long, ConversationSession> sessionById
    ) {
        return analysisResults.stream()
                .filter(result -> result.getSummaryText() != null && !result.getSummaryText().isBlank())
                .sorted(Comparator
                        .comparing((AnalysisResult result) -> sessionById.get(result.getConversationSession().getId()).getStartedAt().toLocalDate())
                        .thenComparing(
                                (AnalysisResult result) -> sessionById.get(result.getConversationSession().getId()).getStartedAt(),
                                Comparator.reverseOrder()
                        )
                        .thenComparing(AnalysisResult::getId, Comparator.reverseOrder()))
                .map(result -> new WeeklySummaryDto(
                        sessionById.get(result.getConversationSession().getId()).getStartedAt().toLocalDate(),
                        result.getSummaryText()
                ))
                .toList();
    }
}
