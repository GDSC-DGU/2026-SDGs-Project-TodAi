package com.solchall.todai.api.elder.service;

import com.solchall.todai.api.elder.dto.ElderMonthlyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderMonthlyAnalysisResponse;
import com.solchall.todai.api.elder.dto.MonthlyAnalysisData;
import com.solchall.todai.api.elder.dto.MonthlyDataDto;
import com.solchall.todai.api.elder.dto.MonthlySummaryDto;
import com.solchall.todai.api.elder.dto.WeeklyConvTimeDto;
import com.solchall.todai.api.elder.dto.WeeklyScoreDto;
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
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ElderMonthlyAnalysisServiceImpl implements ElderMonthlyAnalysisService {

    private static final List<SessionStatus> AVAILABLE_SESSION_STATUSES = List.of(SessionStatus.COMPLETED);
    private static final List<AnalysisStatus> AVAILABLE_ANALYSIS_STATUSES = List.of(
            AnalysisStatus.SUCCESS,
            AnalysisStatus.PARTIAL
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

    public ElderMonthlyAnalysisServiceImpl(
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
    public ElderMonthlyAnalysisResponse getMonthlyAnalysis(ElderMonthlyAnalysisRequest request) {
        validateElderExists(request.elderId());

        LocalDate monthStart = request.date().withDayOfMonth(1);
        LocalDate nextMonthStart = monthStart.plusMonths(1);
        List<LocalDate> monthDates = createDateRange(monthStart, nextMonthStart.minusDays(1));

        List<ConversationSession> sessions = conversationSessionRepository
                .findByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanAndSessionStatusInOrderByStartedAtAsc(
                        request.elderId(),
                        monthStart.atStartOfDay(),
                        nextMonthStart.atStartOfDay(),
                        AVAILABLE_SESSION_STATUSES
                );

        List<Long> sessionIds = sessions.stream()
                .map(ConversationSession::getId)
                .toList();

        List<AnalysisResult> analysisResults = sessionIds.isEmpty()
                ? List.of()
                : analysisResultRepository.findByConversationSessionIdInAndAnalysisStatusIn(
                        sessionIds,
                        AVAILABLE_ANALYSIS_STATUSES
                );

        List<Long> analysisResultIds = analysisResults.stream()
                .map(AnalysisResult::getId)
                .toList();

        List<AnalysisMetric> analysisMetrics = analysisResultIds.isEmpty()
                ? List.of()
                : analysisMetricRepository.findByAnalysisResultIdIn(analysisResultIds);

        Map<LocalDate, List<ConversationSession>> sessionsByDate = sessions.stream()
                .collect(Collectors.groupingBy(session -> session.getStartedAt().toLocalDate()));

        Map<Long, ConversationSession> sessionById = sessions.stream()
                .collect(Collectors.toMap(ConversationSession::getId, Function.identity()));

        Map<LocalDate, List<AnalysisResult>> analysisResultsByDate = analysisResults.stream()
                .collect(Collectors.groupingBy(result -> sessionById.get(result.getConversationSession().getId()).getStartedAt().toLocalDate()));

        List<MonthlyDataDto> monthlyData = monthDates.stream()
                .map(date -> new MonthlyDataDto(
                        date,
                        DAY_OF_WEEK_LABELS.get(date.getDayOfWeek()),
                        averageOverallScore(analysisResultsByDate.getOrDefault(date, List.of())),
                        totalConversationMinutes(sessionsByDate.getOrDefault(date, List.of()))
                ))
                .toList();

        int weekCount = resolveWeekCount(YearMonth.from(request.date()));
        List<WeeklyScoreDto> weeklyScores = createWeeklyScores(analysisResults, sessionById, weekCount);
        List<WeeklyConvTimeDto> weeklyConvTime = createWeeklyConvTimes(sessions, weekCount);
        List<MonthlySummaryDto> monthlySummaries = createMonthlySummaries(
                analysisResults,
                sessionById,
                analysisMetrics,
                sessions,
                request.date()
        );

        return ElderMonthlyAnalysisResponse.from(
                MonthlyAnalysisData.of(monthlyData, weeklyScores, weeklyConvTime, monthlySummaries)
        );
    }

    private void validateElderExists(Long elderId) {
        if (!elderRepository.existsById(elderId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "어르신을 찾을 수 없습니다.");
        }
    }

    private List<LocalDate> createDateRange(LocalDate startDate, LocalDate endDate) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            dates.add(currentDate);
            currentDate = currentDate.plusDays(1);
        }
        return dates;
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

    private int resolveWeekCount(YearMonth yearMonth) {
        return (yearMonth.lengthOfMonth() + 6) / 7;
    }

    private int resolveWeekNumber(LocalDate date) {
        return ((date.getDayOfMonth() - 1) / 7) + 1;
    }

    private List<WeeklyScoreDto> createWeeklyScores(
            List<AnalysisResult> analysisResults,
            Map<Long, ConversationSession> sessionById,
            int weekCount
    ) {
        Map<Integer, List<AnalysisResult>> analysisResultsByWeek = analysisResults.stream()
                .collect(Collectors.groupingBy(
                        result -> resolveWeekNumber(sessionById.get(result.getConversationSession().getId()).getStartedAt().toLocalDate())
                ));

        List<WeeklyScoreDto> weeklyScores = new ArrayList<>(weekCount);
        for (int week = 1; week <= weekCount; week++) {
            weeklyScores.add(new WeeklyScoreDto(
                    week,
                    averageOverallScore(analysisResultsByWeek.getOrDefault(week, List.of()))
            ));
        }
        return weeklyScores;
    }

    private List<WeeklyConvTimeDto> createWeeklyConvTimes(List<ConversationSession> sessions, int weekCount) {
        Map<Integer, List<ConversationSession>> sessionsByWeek = sessions.stream()
                .collect(Collectors.groupingBy(session -> resolveWeekNumber(session.getStartedAt().toLocalDate())));

        List<WeeklyConvTimeDto> weeklyConvTimes = new ArrayList<>(weekCount);
        for (int week = 1; week <= weekCount; week++) {
            weeklyConvTimes.add(new WeeklyConvTimeDto(
                    week,
                    totalConversationMinutes(sessionsByWeek.getOrDefault(week, List.of()))
            ));
        }
        return weeklyConvTimes;
    }

    private List<MonthlySummaryDto> createMonthlySummaries(
            List<AnalysisResult> analysisResults,
            Map<Long, ConversationSession> sessionById,
            List<AnalysisMetric> analysisMetrics,
            List<ConversationSession> sessions,
            LocalDate date
    ) {
        Map<MetricType, Integer> metricAverageByType = averageMetricScoresByType(analysisMetrics);

        return List.of(
                new MonthlySummaryDto(
                        "SUMMARY",
                        "한 달 요약",
                        createMonthlySummaryContent(analysisResults, sessionById)
                ),
                new MonthlySummaryDto(
                        "CONVERSATION_TREND",
                        "대화 추이 분석",
                        createConversationTrendContent(sessions, date)
                ),
                new MonthlySummaryDto(
                        "HEALTH_ANXIETY",
                        "건강 우려 분석",
                        createHealthAnxietyContent(metricAverageByType.get(MetricType.HEALTH_ANXIETY))
                ),
                new MonthlySummaryDto(
                        "EMOTIONAL_STABILITY",
                        "정서 안정도 분석",
                        createEmotionalStabilityContent(metricAverageByType.get(MetricType.EMOTIONAL_VARIATION))
                )
        );
    }

    private Map<MetricType, Integer> averageMetricScoresByType(List<AnalysisMetric> analysisMetrics) {
        Map<MetricType, List<BigDecimal>> scoresByType = new EnumMap<>(MetricType.class);
        for (AnalysisMetric analysisMetric : analysisMetrics) {
            if (analysisMetric.getMetricScore() == null) {
                continue;
            }
            scoresByType.computeIfAbsent(analysisMetric.getMetricType(), ignored -> new ArrayList<>())
                    .add(analysisMetric.getMetricScore());
        }

        Map<MetricType, Integer> averages = new EnumMap<>(MetricType.class);
        for (Map.Entry<MetricType, List<BigDecimal>> entry : scoresByType.entrySet()) {
            averages.put(entry.getKey(), averageBigDecimalScores(entry.getValue()));
        }
        return averages;
    }

    private Integer averageBigDecimalScores(List<BigDecimal> scores) {
        if (scores == null || scores.isEmpty()) {
            return null;
        }

        BigDecimal total = scores.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return total.divide(BigDecimal.valueOf(scores.size()), 0, RoundingMode.HALF_UP).intValue();
    }

    private String createMonthlySummaryContent(
            List<AnalysisResult> analysisResults,
            Map<Long, ConversationSession> sessionById
    ) {
        List<String> summaryTexts = analysisResults.stream()
                .filter(result -> result.getSummaryText() != null && !result.getSummaryText().isBlank())
                .sorted(Comparator
                        .comparing((AnalysisResult result) -> sessionById.get(result.getConversationSession().getId()).getStartedAt())
                        .thenComparing(AnalysisResult::getId))
                .map(AnalysisResult::getSummaryText)
                .limit(3)
                .toList();

        if (summaryTexts.isEmpty()) {
            return "이번 달 분석 요약 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요.";
        }

        return String.join(" ", summaryTexts);
    }

    private String createConversationTrendContent(List<ConversationSession> sessions, LocalDate date) {
        if (sessions.isEmpty()) {
            return "이번 달 대화 시간 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요.";
        }

        LocalDate monthStart = date.withDayOfMonth(1);
        LocalDate pivotDate = monthStart.plusDays((date.lengthOfMonth() - 1) / 2L);

        long firstHalfSeconds = sessions.stream()
                .filter(session -> !session.getStartedAt().toLocalDate().isAfter(pivotDate))
                .mapToLong(this::resolveDurationSeconds)
                .sum();

        long secondHalfSeconds = sessions.stream()
                .filter(session -> session.getStartedAt().toLocalDate().isAfter(pivotDate))
                .mapToLong(this::resolveDurationSeconds)
                .sum();

        if (firstHalfSeconds == 0 && secondHalfSeconds == 0) {
            return "이번 달 대화 시간 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요.";
        }
        if (secondHalfSeconds > firstHalfSeconds) {
            return "월 초보다 월 후반에 대화 시간이 증가했습니다. 현재의 대화 흐름을 꾸준히 유지해주세요.";
        }
        if (secondHalfSeconds < firstHalfSeconds) {
            return "월 초보다 월 후반에 대화 시간이 감소했습니다. 대화 시간과 안부 확인 빈도를 조금 더 늘려주세요.";
        }
        return "이번 달 대화 시간은 월 전반에 걸쳐 비슷한 수준으로 유지되었습니다.";
    }

    private String createHealthAnxietyContent(Integer score) {
        if (score == null) {
            return "이번 달 건강 불안 분석 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요.";
        }
        if (score < 40) {
            return "건강 관련 불안 신호가 크게 나타났습니다. 반복되는 걱정이나 증상 표현을 확인하고 필요하면 보호자나 전문가와 상의해주세요.";
        }
        if (score < 70) {
            return "건강 관련 걱정이 일부 관찰됩니다. 불안을 키우지 않도록 차분히 듣고 실제 증상 여부를 함께 확인해주세요.";
        }
        return "건강 관련 불안은 비교적 안정적인 흐름을 보였습니다. 현재의 안부 확인과 건강 루틴을 유지해주세요.";
    }

    private String createEmotionalStabilityContent(Integer score) {
        if (score == null) {
            return "이번 달 정서 안정도 분석 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요.";
        }
        if (score < 40) {
            return "감정 기복이 크게 나타났습니다. 기분 변화의 원인을 살피고 안정적인 대화 환경을 유지해주세요.";
        }
        if (score < 70) {
            return "정서 상태의 변동이 일부 관찰됩니다. 감정 표현의 흐름을 계속 살피며 공감 중심의 대화를 이어가주세요.";
        }
        return "정서 상태는 비교적 안정적인 흐름을 보였습니다. 현재의 정서적 지지와 대화를 꾸준히 유지해주세요.";
    }
}
