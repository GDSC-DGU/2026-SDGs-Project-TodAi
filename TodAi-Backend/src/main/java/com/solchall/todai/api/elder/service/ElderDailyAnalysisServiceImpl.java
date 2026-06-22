package com.solchall.todai.api.elder.service;

import com.solchall.todai.api.elder.dto.ConversationLogDto;
import com.solchall.todai.api.elder.dto.DailyAnalysisData;
import com.solchall.todai.api.elder.dto.DailyScoreDto;
import com.solchall.todai.api.elder.dto.ElderDailyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderDailyAnalysisResponse;
import com.solchall.todai.api.elder.dto.TimelineDto;
import com.solchall.todai.domain.analysis.entity.AnalysisMetric;
import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.analysis.entity.AnalysisStatus;
import com.solchall.todai.domain.analysis.entity.MetricType;
import com.solchall.todai.domain.analysis.repository.AnalysisMetricRepository;
import com.solchall.todai.domain.analysis.repository.AnalysisResultRepository;
import com.solchall.todai.domain.conversation.entity.ConversationMessage;
import com.solchall.todai.domain.conversation.entity.ConversationSession;
import com.solchall.todai.domain.conversation.entity.SessionStatus;
import com.solchall.todai.domain.conversation.entity.SpeakerType;
import com.solchall.todai.domain.conversation.repository.ConversationMessageRepository;
import com.solchall.todai.domain.conversation.repository.ConversationSessionRepository;
import com.solchall.todai.domain.elder.entity.Elder;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ElderDailyAnalysisServiceImpl implements ElderDailyAnalysisService {

    private static final List<AnalysisStatus> AVAILABLE_ANALYSIS_STATUSES = List.of(
            AnalysisStatus.SUCCESS,
            AnalysisStatus.PARTIAL
    );

    private static final Map<MetricType, Integer> METRIC_ORDER = Map.of(
            MetricType.SOCIAL_ISOLATION, 1,
            MetricType.COGNITIVE_DECLINE, 2,
            MetricType.EMOTIONAL_VARIATION, 3,
            MetricType.DAILY_VITALITY, 4,
            MetricType.HEALTH_ANXIETY, 5
    );

    private final ElderRepository elderRepository;
    private final ConversationSessionRepository conversationSessionRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final AnalysisMetricRepository analysisMetricRepository;

    public ElderDailyAnalysisServiceImpl(
            ElderRepository elderRepository,
            ConversationSessionRepository conversationSessionRepository,
            ConversationMessageRepository conversationMessageRepository,
            AnalysisResultRepository analysisResultRepository,
            AnalysisMetricRepository analysisMetricRepository
    ) {
        this.elderRepository = elderRepository;
        this.conversationSessionRepository = conversationSessionRepository;
        this.conversationMessageRepository = conversationMessageRepository;
        this.analysisResultRepository = analysisResultRepository;
        this.analysisMetricRepository = analysisMetricRepository;
    }

    @Override
    public ElderDailyAnalysisResponse getDailyAnalysis(ElderDailyAnalysisRequest request) {
        Elder elder = elderRepository.findById(request.elderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "어르신을 찾을 수 없습니다."));

        LocalDateTime startDateTime = request.date().atStartOfDay();
        LocalDateTime endDateTime = request.date().plusDays(1).atStartOfDay();

        Optional<ConversationSession> conversationSession = findConversationSession(elder.getId(), startDateTime, endDateTime);
        if (conversationSession.isEmpty()) {
            return ElderDailyAnalysisResponse.from(emptyData());
        }

        ConversationSession session = conversationSession.get();
        Optional<AnalysisResult> analysisResult = findAnalysisResult(session.getId());

        List<ConversationLogDto> conversationLogs = conversationMessageRepository
                .findByConversationSessionIdOrderByMessageOrderAsc(session.getId())
                .stream()
                .map(message -> toConversationLog(message, elder))
                .toList();

        List<DailyScoreDto> scores = analysisResult
                .map(result -> analysisMetricRepository.findByAnalysisResultId(result.getId())
                        .stream()
                        .sorted(Comparator.comparingInt(metric -> METRIC_ORDER.getOrDefault(metric.getMetricType(), Integer.MAX_VALUE)))
                        .map(this::toDailyScore)
                        .toList())
                .orElseGet(List::of);

        DailyAnalysisData data = DailyAnalysisData.of(
                toTimeline(session),
                conversationLogs,
                resolveSummaryText(analysisResult, session),
                scores
        );

        return ElderDailyAnalysisResponse.from(data);
    }

    private DailyAnalysisData emptyData() {
        return DailyAnalysisData.of(emptyTimeline(), List.of(), null, List.of());
    }

    private TimelineDto emptyTimeline() {
        return new TimelineDto(null, null, null);
    }

    private Optional<ConversationSession> findConversationSession(Long elderId, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        return conversationSessionRepository
                .findFirstByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanAndSessionStatusOrderByStartedAtDesc(
                        elderId,
                        startDateTime,
                        endDateTime,
                        SessionStatus.COMPLETED
                )
                .or(() -> conversationSessionRepository
                        .findFirstByElderIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAtDesc(
                                elderId,
                                startDateTime,
                                endDateTime
                        ));
    }

    private Optional<AnalysisResult> findAnalysisResult(Long conversationSessionId) {
        return analysisResultRepository
                .findFirstByConversationSessionIdAndAnalysisStatusInOrderByIdDesc(conversationSessionId, AVAILABLE_ANALYSIS_STATUSES);
    }

    private TimelineDto toTimeline(ConversationSession conversationSession) {
        return new TimelineDto(
                conversationSession.getStartedAt().toLocalTime(),
                conversationSession.getEndedAt() == null ? null : conversationSession.getEndedAt().toLocalTime(),
                resolveConversationSeconds(conversationSession)
        );
    }

    private Integer resolveConversationSeconds(ConversationSession conversationSession) {
        if (conversationSession.getDurationSeconds() != null) {
            return conversationSession.getDurationSeconds();
        }
        if (conversationSession.getStartedAt() != null && conversationSession.getEndedAt() != null) {
            return Math.toIntExact(Duration.between(
                    conversationSession.getStartedAt(),
                    conversationSession.getEndedAt()
            ).getSeconds());
        }
        return null;
    }

    private ConversationLogDto toConversationLog(ConversationMessage message, Elder elder) {
        return new ConversationLogDto(
                String.valueOf(message.getId()),
                message.getContent(),
                resolveSpeakerName(message, elder)
        );
    }

    private String resolveSpeakerName(ConversationMessage message, Elder elder) {
        if (message.getSpeakerName() != null) {
            return message.getSpeakerName();
        }
        if (message.getSpeakerType() == SpeakerType.ELDER) {
            return elder.getName();
        }
        if (message.getSpeakerType() == SpeakerType.AI) {
            return "말벗 AI";
        }
        return null;
    }

    private String resolveSummaryText(Optional<AnalysisResult> analysisResult, ConversationSession conversationSession) {
        return analysisResult
                .map(AnalysisResult::getSummaryText)
                .filter(summaryText -> summaryText != null)
                .orElse(conversationSession.getSummaryText());
    }

    private DailyScoreDto toDailyScore(AnalysisMetric analysisMetric) {
        return new DailyScoreDto(
                analysisMetric.getMetricType().name(),
                analysisMetric.getMetricType().getDisplayName(),
                analysisMetric.getMetricScore()
        );
    }
}
