package com.solchall.todai.api.internal.analysisjob;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.solchall.todai.domain.analysis.entity.AdkStatus;
import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.analysis.entity.AnalysisStatus;
import com.solchall.todai.domain.analysis.entity.MetricType;
import com.solchall.todai.domain.analysis.repository.AnalysisMetricRepository;
import com.solchall.todai.domain.analysis.repository.AnalysisResultRepository;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJob;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobEvent;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobEventType;
import com.solchall.todai.domain.analysisjob.entity.AnalysisJobStatus;
import com.solchall.todai.domain.analysisjob.repository.AnalysisJobEventRepository;
import com.solchall.todai.domain.analysisjob.repository.AnalysisJobRepository;
import com.solchall.todai.domain.conversation.repository.ConversationSessionRepository;
import com.solchall.todai.domain.elder.entity.Elder;
import com.solchall.todai.domain.elder.entity.ElderGender;
import com.solchall.todai.domain.elder.entity.ElderStatus;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
@AutoConfigureMockMvc
class AnalysisJobInternalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ElderRepository elderRepository;

    @Autowired
    private ConversationSessionRepository conversationSessionRepository;

    @Autowired
    private AnalysisJobRepository analysisJobRepository;

    @Autowired
    private AnalysisJobEventRepository analysisJobEventRepository;

    @Autowired
    private AnalysisResultRepository analysisResultRepository;

    @Autowired
    private AnalysisMetricRepository analysisMetricRepository;

    @Test
    void createJobSuccessReturnsStringJobId() throws Exception {
        Elder elder = createElder();

        MvcResult result = mockMvc.perform(post("/api/internal/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "go-session-1",
                                  "elder_id": "%d",
                                  "correlation_id": "corr-1",
                                  "requested_workers": ["emotion", "stt"]
                                }
                                """.formatted(elder.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(response.get("job_id").isTextual()).isTrue();
        assertThat(analysisJobRepository.count()).isEqualTo(1);
        assertThat(analysisJobEventRepository.count()).isEqualTo(1);
    }

    @Test
    void createJobReusesConversationSessionForSameSessionId() throws Exception {
        Elder elder = createElder();

        createJob("shared-session", String.valueOf(elder.getId()), "corr-2");
        createJob("shared-session", String.valueOf(elder.getId()), "corr-3");

        assertThat(conversationSessionRepository.count()).isEqualTo(1);
        assertThat(analysisJobRepository.count()).isEqualTo(2);
    }

    @Test
    void createJobSucceedsWhenElderIdIsBlank() throws Exception {
        Long jobId = createJob("session-without-elder", "", "corr-4");

        AnalysisJob analysisJob = analysisJobRepository.findById(jobId).orElseThrow();

        assertThat(analysisJob.getElder()).isNull();
        assertThat(analysisJob.getConversationSession().getElder()).isNull();
    }

    @Test
    void createJobReturnsConflictWhenCorrelationIdIsDuplicated() throws Exception {
        Elder elder = createElder();
        createJob("duplicate-session", String.valueOf(elder.getId()), "corr-5");

        mockMvc.perform(post("/api/internal/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "duplicate-session-2",
                                  "elder_id": "%d",
                                  "correlation_id": "corr-5",
                                  "requested_workers": ["emotion", "stt"]
                                }
                                """.formatted(elder.getId())))
                .andExpect(status().isConflict());
    }

    @Test
    void appendEventSuccessWithExtendedFields() throws Exception {
        Long jobId = createJob("event-session-1", "", "corr-6");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/events", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "event_type": "PUBLISH_SUCCESS",
                                  "worker_type": "emotion",
                                  "correlation_id": "corr-6",
                                  "event_status": "SUCCESS",
                                  "queue_name": "todai.worker.emotion",
                                  "routing_key": "todai.worker.emotion",
                                  "message": "emotion worker request published",
                                  "error_reason": null,
                                  "payload_json": null,
                                  "occurred_at": "2026-06-20T22:00:01"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.job_id").value(String.valueOf(jobId)))
                .andExpect(jsonPath("$.event_type").value("PUBLISH_SUCCESS"))
                .andExpect(jsonPath("$.created_at").isNotEmpty());

        AnalysisJobEvent latestEvent = latestEvent();
        assertThat(latestEvent.getAnalysisJob().getId()).isEqualTo(jobId);
        assertThat(latestEvent.getWorkerType().name()).isEqualTo("emotion");
        assertThat(latestEvent.getQueueName()).isEqualTo("todai.worker.emotion");
    }

    @Test
    void appendEventSuccessWithoutExtendedFields() throws Exception {
        Long jobId = createJob("event-session-2", "", "corr-7");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/events", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "event_type": "PUBLISH_SUCCESS",
                                  "worker_type": "emotion",
                                  "correlation_id": "corr-7",
                                  "message": "emotion worker request published"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.job_id").value(String.valueOf(jobId)));

        AnalysisJobEvent latestEvent = latestEvent();
        assertThat(latestEvent.getEventStatus()).isNull();
        assertThat(latestEvent.getQueueName()).isNull();
        assertThat(latestEvent.getOccurredAt()).isNull();
    }

    @Test
    void appendEventReturnsNotFoundWhenJobDoesNotExist() throws Exception {
        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/events", 99999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "event_type": "PUBLISH_SUCCESS",
                                  "worker_type": "emotion",
                                  "correlation_id": "missing-job",
                                  "message": "emotion worker request published"
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateStatusMapsCompletedToCompleted() throws Exception {
        Long jobId = createJob("status-session-1", "", "corr-8");

        mockMvc.perform(patch("/api/internal/analysis-jobs/{jobId}/status", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "completed",
                                  "correlation_id": "corr-8",
                                  "message": "Both emotion and stt workers completed",
                                  "finished_at": "2026-06-20T22:00:10"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.updated_at").isNotEmpty());

        assertThat(analysisJobRepository.findById(jobId).orElseThrow().getStatus()).isEqualTo(AnalysisJobStatus.COMPLETED);
    }

    @Test
    void updateStatusMapsPartialFailedToPartialFailed() throws Exception {
        Long jobId = createJob("status-session-2", "", "corr-9");

        mockMvc.perform(patch("/api/internal/analysis-jobs/{jobId}/status", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "partial_failed",
                                  "correlation_id": "corr-9",
                                  "message": "one worker failed",
                                  "error_reason": "stt worker error"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIAL_FAILED"));

        assertThat(analysisJobRepository.findById(jobId).orElseThrow().getStatus()).isEqualTo(AnalysisJobStatus.PARTIAL_FAILED);
    }

    @Test
    void updateStatusMapsPartialTimeoutToPartialTimeout() throws Exception {
        Long jobId = createJob("status-session-3", "", "corr-10");

        mockMvc.perform(patch("/api/internal/analysis-jobs/{jobId}/status", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "partial_timeout",
                                  "correlation_id": "corr-10",
                                  "message": "one worker timed out"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIAL_TIMEOUT"));

        assertThat(analysisJobRepository.findById(jobId).orElseThrow().getStatus()).isEqualTo(AnalysisJobStatus.PARTIAL_TIMEOUT);
    }

    @Test
    void updateStatusMapsTimeoutToTimeout() throws Exception {
        Long jobId = createJob("status-session-4", "", "corr-11");

        mockMvc.perform(patch("/api/internal/analysis-jobs/{jobId}/status", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "timeout",
                                  "correlation_id": "corr-11",
                                  "message": "all workers timed out"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TIMEOUT"));

        assertThat(analysisJobRepository.findById(jobId).orElseThrow().getStatus()).isEqualTo(AnalysisJobStatus.TIMEOUT);
    }

    @Test
    void updateStatusReturnsBadRequestForInvalidStatus() throws Exception {
        Long jobId = createJob("status-session-5", "", "corr-12");

        mockMvc.perform(patch("/api/internal/analysis-jobs/{jobId}/status", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "done",
                                  "correlation_id": "corr-12",
                                  "message": "invalid"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void saveResultStoresAdkSuccessResultAndFiveMetrics() throws Exception {
        Long jobId = createJob("result-session-1", "", "corr-13");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-1",
                                  "elder_id": "",
                                  "correlation_id": "corr-13",
                                  "job_status": "completed",
                                  "analysis_status": "SUCCESS",
                                  "adk_status": "SUCCESS",
                                  "stt_text": "오늘은 몸이 조금 무겁지만 괜찮아요.",
                                  "metrics": {
                                    "social_isolation": 0.2,
                                    "health_anxiety": 0.4,
                                    "daily_vitality": 0.7,
                                    "emotion_variance": 0.3,
                                    "cognitive_load": 0.5
                                  },
                                  "summary_text": null,
                                  "overall_score": null,
                                  "error_reason": null,
                                  "adk_error_reason": null
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.job_id").value(String.valueOf(jobId)))
                .andExpect(jsonPath("$.analysis_status").value("SUCCESS"))
                .andExpect(jsonPath("$.adk_status").value("SUCCESS"))
                .andExpect(jsonPath("$.saved_metric_count").value(5))
                .andExpect(jsonPath("$.updated_at").isNotEmpty());

        AnalysisResult result = analysisResultRepository.findByAnalysisJobId(jobId).orElseThrow();
        assertThat(result.getAnalysisStatus()).isEqualTo(AnalysisStatus.SUCCESS);
        assertThat(result.getAdkStatus()).isEqualTo(AdkStatus.SUCCESS);
        assertThat(result.getSttText()).isEqualTo("오늘은 몸이 조금 무겁지만 괜찮아요.");
        assertThat(analysisMetricRepository.findByAnalysisResultId(result.getId())).hasSize(5);
    }

    @Test
    void saveResultStoresAdkFailedResultWithoutMetrics() throws Exception {
        Long jobId = createJob("result-session-2", "", "corr-14");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-2",
                                  "elder_id": "",
                                  "correlation_id": "corr-14",
                                  "job_status": "completed",
                                  "analysis_status": "PARTIAL",
                                  "adk_status": "FAILED",
                                  "stt_text": "오늘은 몸이 조금 무겁지만 괜찮아요.",
                                  "metrics": null,
                                  "summary_text": null,
                                  "overall_score": null,
                                  "error_reason": null,
                                  "adk_error_reason": "ADK request failed"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysis_status").value("PARTIAL"))
                .andExpect(jsonPath("$.adk_status").value("FAILED"))
                .andExpect(jsonPath("$.saved_metric_count").value(0));

        AnalysisResult result = analysisResultRepository.findByAnalysisJobId(jobId).orElseThrow();
        assertThat(result.getAdkStatus()).isEqualTo(AdkStatus.FAILED);
        assertThat(result.getAdkErrorReason()).isEqualTo("ADK request failed");
        assertThat(analysisMetricRepository.findByAnalysisResultId(result.getId())).isEmpty();
    }

    @Test
    void saveResultSupportsPartialTimeoutWithNullSttText() throws Exception {
        Long jobId = createJob("result-session-3", "", "corr-15");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-3",
                                  "elder_id": "",
                                  "correlation_id": "corr-15",
                                  "job_status": "partial_timeout",
                                  "analysis_status": "PARTIAL",
                                  "adk_status": "SKIPPED",
                                  "stt_text": null,
                                  "metrics": null,
                                  "summary_text": null,
                                  "overall_score": null,
                                  "error_reason": "emotion worker timeout",
                                  "adk_error_reason": null
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysis_status").value("PARTIAL"))
                .andExpect(jsonPath("$.adk_status").value("SKIPPED"));

        AnalysisResult result = analysisResultRepository.findByAnalysisJobId(jobId).orElseThrow();
        assertThat(result.getAnalysisStatus()).isEqualTo(AnalysisStatus.PARTIAL);
        assertThat(result.getAdkStatus()).isEqualTo(AdkStatus.SKIPPED);
        assertThat(result.getSttText()).isNull();
    }

    @Test
    void saveResultUpdatesExistingResultAndMetricsForSameJobId() throws Exception {
        Long jobId = createJob("result-session-4", "", "corr-16");

        saveResult(jobId, """
                {
                  "session_id": "result-session-4",
                  "elder_id": "",
                  "correlation_id": "corr-16",
                  "job_status": "completed",
                  "analysis_status": "SUCCESS",
                  "adk_status": "SUCCESS",
                  "stt_text": "초기 텍스트",
                  "metrics": {
                    "social_isolation": 0.2,
                    "health_anxiety": 0.4,
                    "daily_vitality": 0.7,
                    "emotion_variance": 0.3,
                    "cognitive_load": 0.5
                  },
                  "summary_text": "초기 요약",
                  "overall_score": 0.6,
                  "error_reason": null,
                  "adk_error_reason": null
                }
                """);

        saveResult(jobId, """
                {
                  "session_id": "result-session-4",
                  "elder_id": "",
                  "correlation_id": "corr-16",
                  "job_status": "completed",
                  "analysis_status": "PARTIAL",
                  "adk_status": "FAILED",
                  "stt_text": "수정 텍스트",
                  "metrics": {
                    "social_isolation": 0.9,
                    "health_anxiety": 0.8,
                    "daily_vitality": 0.7,
                    "emotion_variance": 0.6,
                    "cognitive_load": 0.5
                  },
                  "summary_text": "수정 요약",
                  "overall_score": 0.4,
                  "error_reason": "partial result",
                  "adk_error_reason": "ADK request failed"
                }
                """);

        assertThat(analysisResultRepository.findAll()).hasSize(1);

        AnalysisResult result = analysisResultRepository.findByAnalysisJobId(jobId).orElseThrow();
        assertThat(result.getAnalysisStatus()).isEqualTo(AnalysisStatus.PARTIAL);
        assertThat(result.getAdkStatus()).isEqualTo(AdkStatus.FAILED);
        assertThat(result.getSttText()).isEqualTo("수정 텍스트");
        assertThat(result.getSummaryText()).isEqualTo("수정 요약");
        assertThat(result.getAdkErrorReason()).isEqualTo("ADK request failed");

        assertThat(analysisMetricRepository.findByAnalysisResultId(result.getId())).hasSize(5);
        assertThat(analysisMetricRepository.findByAnalysisResultIdAndMetricType(result.getId(), MetricType.SOCIAL_ISOLATION)
                .orElseThrow()
                .getMetricScore())
                .isEqualByComparingTo("0.9");
    }

    @Test
    void saveResultReturnsNotFoundWhenJobDoesNotExist() throws Exception {
        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", 99999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "missing-session",
                                  "elder_id": "",
                                  "correlation_id": "missing-corr",
                                  "job_status": "completed",
                                  "analysis_status": "SUCCESS",
                                  "adk_status": "SUCCESS"
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void saveResultReturnsBadRequestForInvalidAnalysisStatus() throws Exception {
        Long jobId = createJob("result-session-5", "", "corr-17");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-5",
                                  "elder_id": "",
                                  "correlation_id": "corr-17",
                                  "job_status": "completed",
                                  "analysis_status": "DONE",
                                  "adk_status": "SUCCESS"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void saveResultReturnsBadRequestForInvalidJobStatus() throws Exception {
        Long jobId = createJob("result-session-invalid-job-status", "", "corr-17b");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-invalid-job-status",
                                  "elder_id": "",
                                  "correlation_id": "corr-17b",
                                  "job_status": "done",
                                  "analysis_status": "SUCCESS",
                                  "adk_status": "SUCCESS"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void saveResultReturnsBadRequestForInvalidAdkStatus() throws Exception {
        Long jobId = createJob("result-session-6", "", "corr-18");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-6",
                                  "elder_id": "",
                                  "correlation_id": "corr-18",
                                  "job_status": "completed",
                                  "analysis_status": "SUCCESS",
                                  "adk_status": "DONE"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void saveResultReturnsBadRequestForInvalidMetricField() throws Exception {
        Long jobId = createJob("result-session-7", "", "corr-19");

        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "result-session-7",
                                  "elder_id": "",
                                  "correlation_id": "corr-19",
                                  "job_status": "completed",
                                  "analysis_status": "SUCCESS",
                                  "adk_status": "SUCCESS",
                                  "metrics": {
                                    "social_isolation": 0.2,
                                    "unknown_metric": 0.9
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void saveResultRecordsResultSavedEvent() throws Exception {
        Long jobId = createJob("result-session-8", "", "corr-20");

        saveResult(jobId, """
                {
                  "session_id": "result-session-8",
                  "elder_id": "",
                  "correlation_id": "corr-20",
                  "job_status": "completed",
                  "analysis_status": "SUCCESS",
                  "adk_status": "SUCCESS",
                  "metrics": {
                    "social_isolation": 0.2,
                    "health_anxiety": 0.4,
                    "daily_vitality": 0.7,
                    "emotion_variance": 0.3,
                    "cognitive_load": 0.5
                  }
                }
                """);

        AnalysisJobEvent latestEvent = latestEvent();
        assertThat(latestEvent.getAnalysisJob().getId()).isEqualTo(jobId);
        assertThat(latestEvent.getEventType()).isEqualTo(AnalysisJobEventType.RESULT_SAVED);
    }

    private Elder createElder() {
        return elderRepository.save(new Elder(
                "김연자",
                LocalDate.of(1948, 1, 10),
                78,
                ElderGender.FEMALE,
                "010-1111-1111",
                "서울특별시 종로구",
                "101동 1001호",
                "김보호",
                "010-2222-2222",
                null,
                ElderStatus.STABLE
        ));
    }

    private Long createJob(String sessionId, String elderId, String correlationId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/internal/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "session_id": "%s",
                                  "elder_id": "%s",
                                  "correlation_id": "%s",
                                  "requested_workers": ["emotion", "stt"]
                                }
                                """.formatted(sessionId, elderId, correlationId)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return Long.valueOf(response.get("job_id").asText());
    }

    private void saveResult(Long jobId, String content) throws Exception {
        mockMvc.perform(post("/api/internal/analysis-jobs/{jobId}/result", jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(content))
                .andExpect(status().isOk());
    }

    private AnalysisJobEvent latestEvent() {
        return analysisJobEventRepository.findAll().stream()
                .max(Comparator.comparing(AnalysisJobEvent::getId))
                .orElseThrow();
    }
}
