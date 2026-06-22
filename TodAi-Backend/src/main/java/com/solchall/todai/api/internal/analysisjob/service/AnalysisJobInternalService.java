package com.solchall.todai.api.internal.analysisjob.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobEventRequest;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobEventResponse;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobRequest;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobResponse;
import com.solchall.todai.api.internal.analysisjob.dto.MetricPayload;
import com.solchall.todai.api.internal.analysisjob.dto.SaveAnalysisResultRequest;
import com.solchall.todai.api.internal.analysisjob.dto.SaveAnalysisResultResponse;
import com.solchall.todai.api.internal.analysisjob.dto.UpdateAnalysisJobStatusRequest;
import com.solchall.todai.api.internal.analysisjob.dto.UpdateAnalysisJobStatusResponse;
import com.solchall.todai.domain.analysis.entity.AdkStatus;
import com.solchall.todai.domain.analysis.entity.AnalysisMetric;
import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.analysis.entity.AnalysisStatus;
import com.solchall.todai.domain.analysis.entity.MetricType;
import com.solchall.todai.domain.analysis.repository.AnalysisMetricRepository;
import com.solchall.todai.domain.analysis.repository.AnalysisResultRepository;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJob;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobEvent;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobEventType;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobStatus;
import com.solchall.todai.domain.analysisjob.entity.EventStatus;
import com.solchall.todai.domain.analysisjob.entity.WorkerType;
import com.solchall.todai.domain.analysisjob.repository.AnalysisJobEventRepository;
import com.solchall.todai.domain.analysisjob.repository.AnalysisJobRepository;
import com.solchall.todai.domain.conversation.entity.ConversationSession;
import com.solchall.todai.domain.conversation.repository.ConversationSessionRepository;
import com.solchall.todai.domain.elder.entity.Elder;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalysisJobInternalService {

    private static final Map<String, MetricType> METRIC_FIELD_MAPPING = Map.of(
            "social_isolation", MetricType.SOCIAL_ISOLATION,
            "health_anxiety", MetricType.HEALTH_ANXIETY,
            "daily_vitality", MetricType.DAILY_VITALITY,
            "emotion_variance", MetricType.EMOTIONAL_VARIATION,
            "cognitive_load", MetricType.COGNITIVE_DECLINE
    );

    private final AnalysisJobRepository analysisJobRepository;
    private final AnalysisJobEventRepository analysisJobEventRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final AnalysisMetricRepository analysisMetricRepository;
    private final ConversationSessionRepository conversationSessionRepository;
    private final ElderRepository elderRepository;
    private final ObjectMapper objectMapper;

    public AnalysisJobInternalService(
            AnalysisJobRepository analysisJobRepository,
            AnalysisJobEventRepository analysisJobEventRepository,
            AnalysisResultRepository analysisResultRepository,
            AnalysisMetricRepository analysisMetricRepository,
            ConversationSessionRepository conversationSessionRepository,
            ElderRepository elderRepository,
            ObjectMapper objectMapper
    ) {
        this.analysisJobRepository = analysisJobRepository;
        this.analysisJobEventRepository = analysisJobEventRepository;
        this.analysisResultRepository = analysisResultRepository;
        this.analysisMetricRepository = analysisMetricRepository;
        this.conversationSessionRepository = conversationSessionRepository;
        this.elderRepository = elderRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CreateAnalysisJobResponse createJob(CreateAnalysisJobRequest request) {
        validateCreateRequest(request);

        if (analysisJobRepository.findByCorrelationId(request.correlationId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 존재하는 correlation_id 입니다.");
        }

        Elder elder = resolveElder(request.elderId());
        ConversationSession conversationSession = conversationSessionRepository.findBySessionKey(request.sessionId())
                .map(existing -> reuseConversationSession(existing, elder))
                .orElseGet(() -> conversationSessionRepository.save(
                        ConversationSession.createInternalSession(elder, request.sessionId())
                ));

        String requestPayload = writeJson(request);
        String requestedWorkers = writeJson(normalizeRequestedWorkers(request.requestedWorkers()));

        AnalysisJob analysisJob = AnalysisJob.createInternalJob(
                elder,
                conversationSession,
                request.sessionId(),
                request.correlationId(),
                requestedWorkers,
                requestPayload
        );

        try {
            analysisJob = analysisJobRepository.save(analysisJob);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 존재하는 correlation_id 입니다.", exception);
        }

        analysisJobEventRepository.save(new AnalysisJobEvent(
                analysisJob,
                request.correlationId(),
                null,
                AnalysisJobEventType.JOB_CREATED,
                EventStatus.INFO,
                null,
                null,
                "analysis job created",
                null,
                requestPayload,
                LocalDateTime.now()
        ));

        return new CreateAnalysisJobResponse(
                String.valueOf(analysisJob.getId()),
                analysisJob.getStatus().name()
        );
    }

    @Transactional
    public CreateAnalysisJobEventResponse appendEvent(Long jobId, CreateAnalysisJobEventRequest request) {
        AnalysisJob analysisJob = getAnalysisJob(jobId);
        validateEventRequest(request);

        AnalysisJobEvent event = analysisJobEventRepository.save(new AnalysisJobEvent(
                analysisJob,
                request.correlationId(),
                request.workerType(),
                request.eventType(),
                request.eventStatus(),
                request.queueName(),
                request.routingKey(),
                request.message(),
                request.errorReason(),
                request.payloadJson(),
                request.occurredAt()
        ));

        return new CreateAnalysisJobEventResponse(
                event.getId(),
                String.valueOf(analysisJob.getId()),
                event.getEventType().name(),
                event.getCreatedAt()
        );
    }

    @Transactional
    public UpdateAnalysisJobStatusResponse updateStatus(Long jobId, UpdateAnalysisJobStatusRequest request) {
        AnalysisJob analysisJob = getAnalysisJob(jobId);

        final AnalysisJobStatus status;
        try {
            status = AnalysisJobStatus.fromExternalStatus(request.status());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }

        analysisJob.updateStatus(
                status,
                request.message(),
                request.errorReason(),
                request.finishedAt()
        );
        analysisJob = analysisJobRepository.saveAndFlush(analysisJob);

        analysisJobEventRepository.save(new AnalysisJobEvent(
                analysisJob,
                request.correlationId(),
                null,
                resolveStatusEventType(status),
                resolveStatusEventStatus(status),
                null,
                null,
                request.message(),
                request.errorReason(),
                null,
                request.finishedAt() != null ? request.finishedAt() : LocalDateTime.now()
        ));

        return new UpdateAnalysisJobStatusResponse(
                String.valueOf(analysisJob.getId()),
                analysisJob.getStatus().name(),
                analysisJob.getUpdatedAt()
        );
    }

    @Transactional
    public SaveAnalysisResultResponse saveResult(Long jobId, SaveAnalysisResultRequest request) {
        validateSaveResultRequest(request);

        AnalysisJob analysisJob = getAnalysisJob(jobId);
        AnalysisJobStatus jobStatus = parseJobStatus(request.jobStatus());
        AnalysisStatus analysisStatus = parseAnalysisStatus(request.analysisStatus());
        AdkStatus adkStatus = parseAdkStatus(request.adkStatus());

        Elder elder = resolveResultElder(request.elderId(), analysisJob);
        ConversationSession conversationSession = resolveConversationSessionForResult(request.sessionId(), analysisJob, elder);

        analysisJob.updateStatus(jobStatus, null, request.errorReason(), null);

        MetricPayload metrics = request.metrics();
        validateMetricPayload(metrics);

        AnalysisResult analysisResult = analysisResultRepository.findByAnalysisJobId(jobId)
                .map(existing -> updateAnalysisResult(
                        existing,
                        elder,
                        conversationSession,
                        request.sessionId(),
                        analysisStatus,
                        adkStatus,
                        request
                ))
                .orElseGet(() -> AnalysisResult.create(
                        jobId,
                        elder,
                        conversationSession,
                        request.sessionId(),
                        analysisStatus,
                        adkStatus,
                        request.sttText(),
                        request.summaryText(),
                        request.overallScore(),
                        request.errorReason(),
                        request.adkErrorReason()
                ));

        analysisResult = analysisResultRepository.saveAndFlush(analysisResult);
        analysisJob.attachAnalysisResult(analysisResult);
        analysisJobRepository.saveAndFlush(analysisJob);

        int savedMetricCount = upsertMetrics(analysisResult, metrics);

        analysisJobEventRepository.save(new AnalysisJobEvent(
                analysisJob,
                request.correlationId(),
                WorkerType.system,
                AnalysisJobEventType.RESULT_SAVED,
                EventStatus.SUCCESS,
                null,
                null,
                "analysis result saved",
                null,
                writeJson(request),
                LocalDateTime.now()
        ));

        return new SaveAnalysisResultResponse(
                analysisResult.getId(),
                String.valueOf(jobId),
                analysisResult.getAnalysisStatus().name(),
                analysisResult.getAdkStatus() != null ? analysisResult.getAdkStatus().name() : null,
                savedMetricCount,
                analysisResult.getUpdatedAt()
        );
    }

    private void validateCreateRequest(CreateAnalysisJobRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.sessionId() == null || request.sessionId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_id 는 필수입니다.");
        }
        if (request.correlationId() == null || request.correlationId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "correlation_id 는 필수입니다.");
        }
    }

    private Elder resolveElder(String elderId) {
        if (elderId == null || elderId.isBlank()) {
            return null;
        }

        final Long parsedElderId;
        try {
            parsedElderId = Long.valueOf(elderId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "elder_id 형식이 올바르지 않습니다.", exception);
        }

        return elderRepository.findById(parsedElderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "어르신을 찾을 수 없습니다."));
    }

    private ConversationSession reuseConversationSession(ConversationSession session, Elder elder) {
        if (elder != null && session.getElder() != null && !session.getElder().getId().equals(elder.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_id 에 연결된 elder_id 가 일치하지 않습니다.");
        }
        if (elder != null) {
            session.attachElder(elder);
        }
        return session;
    }

    private void validateEventRequest(CreateAnalysisJobEventRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.eventType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "event_type 은 필수입니다.");
        }
    }

    private void validateSaveResultRequest(SaveAnalysisResultRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.sessionId() == null || request.sessionId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_id 는 필수입니다.");
        }
        if (request.correlationId() == null || request.correlationId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "correlation_id 는 필수입니다.");
        }
        if (request.jobStatus() == null || request.jobStatus().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "job_status 는 필수입니다.");
        }
        if (request.analysisStatus() == null || request.analysisStatus().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "analysis_status 는 필수입니다.");
        }
        if (request.adkStatus() == null || request.adkStatus().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "adk_status 는 필수입니다.");
        }
    }

    private AnalysisJob getAnalysisJob(Long jobId) {
        return analysisJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "analysis_job 을 찾을 수 없습니다."));
    }

    private ConversationSession resolveConversationSessionForResult(
            String sessionId,
            AnalysisJob analysisJob,
            Elder elder
    ) {
        return conversationSessionRepository.findBySessionKey(sessionId)
                .map(session -> reuseConversationSession(session, elder))
                .orElseGet(() -> {
                    ConversationSession fallbackSession = analysisJob.getConversationSession();
                    if (fallbackSession == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "conversation_session 을 찾을 수 없습니다.");
                    }
                    return reuseConversationSession(fallbackSession, elder);
                });
    }

    private Elder resolveResultElder(String elderId, AnalysisJob analysisJob) {
        Elder elder = resolveElder(elderId);
        if (elder != null) {
            return elder;
        }
        if (analysisJob.getElder() != null) {
            return analysisJob.getElder();
        }
        if (analysisJob.getConversationSession() != null) {
            return analysisJob.getConversationSession().getElder();
        }
        return null;
    }

    private AnalysisJobStatus parseJobStatus(String value) {
        try {
            return AnalysisJobStatus.fromExternalStatus(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    private AnalysisStatus parseAnalysisStatus(String value) {
        try {
            return AnalysisStatus.fromExternalValue(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    private AdkStatus parseAdkStatus(String value) {
        try {
            return AdkStatus.fromExternalValue(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    private void validateMetricPayload(MetricPayload metrics) {
        if (metrics != null && metrics.hasUnknownFields()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "지원하지 않는 metric field 입니다: " + metrics.getUnknownFields().keySet()
            );
        }
    }

    private AnalysisResult updateAnalysisResult(
            AnalysisResult analysisResult,
            Elder elder,
            ConversationSession conversationSession,
            String sessionKey,
            AnalysisStatus analysisStatus,
            AdkStatus adkStatus,
            SaveAnalysisResultRequest request
    ) {
        analysisResult.updateResult(
                elder,
                conversationSession,
                sessionKey,
                analysisStatus,
                adkStatus,
                request.sttText(),
                request.summaryText(),
                request.overallScore(),
                request.errorReason(),
                request.adkErrorReason()
        );
        return analysisResult;
    }

    private int upsertMetrics(AnalysisResult analysisResult, MetricPayload metrics) {
        if (metrics == null) {
            return 0;
        }

        int savedMetricCount = 0;
        for (Map.Entry<MetricType, java.math.BigDecimal> entry : extractMetricScores(metrics).entrySet()) {
            AnalysisMetric analysisMetric = analysisMetricRepository
                    .findByAnalysisResultIdAndMetricType(analysisResult.getId(), entry.getKey())
                    .map(existing -> {
                        existing.updateMetricScore(entry.getValue());
                        return existing;
                    })
                    .orElseGet(() -> new AnalysisMetric(
                            analysisResult,
                            entry.getKey(),
                            entry.getValue(),
                            null,
                            null
                    ));
            analysisMetricRepository.save(analysisMetric);
            savedMetricCount++;
        }
        return savedMetricCount;
    }

    private Map<MetricType, java.math.BigDecimal> extractMetricScores(MetricPayload metrics) {
        Map<String, java.math.BigDecimal> values = new LinkedHashMap<>();
        values.put("social_isolation", metrics.getSocialIsolation());
        values.put("health_anxiety", metrics.getHealthAnxiety());
        values.put("daily_vitality", metrics.getDailyVitality());
        values.put("emotion_variance", metrics.getEmotionVariance());
        values.put("cognitive_load", metrics.getCognitiveLoad());

        Map<MetricType, java.math.BigDecimal> result = new LinkedHashMap<>();
        for (Map.Entry<String, java.math.BigDecimal> entry : values.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            MetricType metricType = METRIC_FIELD_MAPPING.get(entry.getKey());
            if (metricType == null) {
                try {
                    metricType = MetricType.fromExternalField(entry.getKey());
                } catch (IllegalArgumentException exception) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
                }
            }
            result.put(metricType, entry.getValue());
        }
        return result;
    }

    private AnalysisJobEventType resolveStatusEventType(AnalysisJobStatus status) {
        if (status == AnalysisJobStatus.TIMEOUT || status == AnalysisJobStatus.PARTIAL_TIMEOUT) {
            return AnalysisJobEventType.AGGREGATION_TIMEOUT;
        }
        return AnalysisJobEventType.AGGREGATION_COMPLETED;
    }

    private EventStatus resolveStatusEventStatus(AnalysisJobStatus status) {
        return switch (status) {
            case COMPLETED -> EventStatus.SUCCESS;
            case PENDING, PUBLISHED, PROCESSING -> EventStatus.INFO;
            default -> EventStatus.FAILED;
        };
    }

    private List<String> normalizeRequestedWorkers(List<String> requestedWorkers) {
        return requestedWorkers == null ? List.of() : requestedWorkers;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "요청 JSON 직렬화에 실패했습니다.", exception);
        }
    }
}
