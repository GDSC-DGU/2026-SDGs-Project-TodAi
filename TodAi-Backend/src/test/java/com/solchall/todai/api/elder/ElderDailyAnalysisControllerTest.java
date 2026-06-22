package com.solchall.todai.api.elder;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.solchall.todai.domain.elder.entity.ElderGender;
import com.solchall.todai.domain.elder.entity.ElderStatus;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
@AutoConfigureMockMvc
class ElderDailyAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ElderRepository elderRepository;

    @Autowired
    private ConversationSessionRepository conversationSessionRepository;

    @Autowired
    private ConversationMessageRepository conversationMessageRepository;

    @Autowired
    private AnalysisResultRepository analysisResultRepository;

    @Autowired
    private AnalysisMetricRepository analysisMetricRepository;

    @BeforeEach
    void setUp() {
        analysisMetricRepository.deleteAll();
        analysisResultRepository.deleteAll();
        conversationMessageRepository.deleteAll();
        conversationSessionRepository.deleteAll();
        elderRepository.deleteAll();
    }

    @Test
    void getDailyAnalysisReturnsLatestCompletedSessionForDate() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "정이안",
                LocalDate.of(1948, 3, 12),
                78,
                ElderGender.FEMALE,
                "010-1111-2222",
                "서울특별시 서대문구",
                "101동 101호",
                "정보호",
                "010-9999-9999",
                null,
                ElderStatus.STABLE
        ));

        ConversationSession olderCompletedSession = conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-1",
                LocalDateTime.of(2026, 1, 30, 9, 0, 0),
                LocalDateTime.of(2026, 1, 30, 9, 10, 0),
                600,
                10,
                SessionStatus.COMPLETED,
                "이전 요약"
        ));

        ConversationSession latestCompletedSession = conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-2",
                LocalDateTime.of(2026, 1, 30, 10, 32, 10),
                LocalDateTime.of(2026, 1, 30, 10, 55, 30),
                1400,
                14,
                SessionStatus.COMPLETED,
                "세션 요약"
        ));

        conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-3",
                LocalDateTime.of(2026, 1, 30, 11, 0, 0),
                null,
                null,
                3,
                SessionStatus.IN_PROGRESS,
                "진행 중 요약"
        ));

        AnalysisResult analysisResult = analysisResultRepository.save(new AnalysisResult(
                elder,
                latestCompletedSession,
                10L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("75.00"),
                "행복한 하루인듯 쏼라쏼라"
        ));

        analysisResultRepository.save(new AnalysisResult(
                elder,
                olderCompletedSession,
                11L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("10.00"),
                "이전 분석"
        ));

        analysisMetricRepository.save(new AnalysisMetric(
                analysisResult,
                MetricType.DAILY_VITALITY,
                new BigDecimal("75"),
                null,
                null
        ));
        analysisMetricRepository.save(new AnalysisMetric(
                analysisResult,
                MetricType.HEALTH_ANXIETY,
                new BigDecimal("50"),
                null,
                null
        ));
        analysisMetricRepository.save(new AnalysisMetric(
                analysisResult,
                MetricType.SOCIAL_ISOLATION,
                new BigDecimal("80"),
                null,
                null
        ));
        analysisMetricRepository.save(new AnalysisMetric(
                analysisResult,
                MetricType.EMOTIONAL_VARIATION,
                new BigDecimal("60"),
                null,
                null
        ));
        analysisMetricRepository.save(new AnalysisMetric(
                analysisResult,
                MetricType.COGNITIVE_DECLINE,
                new BigDecimal("70"),
                null,
                null
        ));

        ConversationMessage elderMessage = conversationMessageRepository.save(new ConversationMessage(
                latestCompletedSession,
                SpeakerType.ELDER,
                null,
                "오늘은 기분이 괜찮았어.",
                1,
                LocalDateTime.of(2026, 1, 30, 10, 32, 10)
        ));
        ConversationMessage aiMessage = conversationMessageRepository.save(new ConversationMessage(
                latestCompletedSession,
                SpeakerType.AI,
                null,
                "좋은 하루를 보내셨군요.",
                2,
                LocalDateTime.of(2026, 1, 30, 10, 32, 30)
        ));

        mockMvc.perform(post("/api/elder/daily")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DailyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.timeline.start_time").value("10:32:10"))
                .andExpect(jsonPath("$.data.timeline.end_time").value("10:55:30"))
                .andExpect(jsonPath("$.data.timeline.conv_time").value(1400))
                .andExpect(jsonPath("$.data.summary_text").value("행복한 하루인듯 쏼라쏼라"))
                .andExpect(jsonPath("$.data.conv_logs[0].message_id").value(String.valueOf(elderMessage.getId())))
                .andExpect(jsonPath("$.data.conv_logs[0].name").value("정이안"))
                .andExpect(jsonPath("$.data.conv_logs[1].message_id").value(String.valueOf(aiMessage.getId())))
                .andExpect(jsonPath("$.data.conv_logs[1].name").value("말벗 AI"))
                .andExpect(jsonPath("$.data.score[0].type").value("SOCIAL_ISOLATION"))
                .andExpect(jsonPath("$.data.score[1].type").value("COGNITIVE_DECLINE"))
                .andExpect(jsonPath("$.data.score[2].type").value("EMOTIONAL_VARIATION"))
                .andExpect(jsonPath("$.data.score[3].type").value("DAILY_VITALITY"))
                .andExpect(jsonPath("$.data.score[4].type").value("HEALTH_ANXIETY"));
    }

    @Test
    void getDailyAnalysisReturnsNotFoundWhenElderDoesNotExist() throws Exception {
        mockMvc.perform(post("/api/elder/daily")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DailyRequest(999L, LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDailyAnalysisReturnsNotFoundWhenAnalysisResultDoesNotExist() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "이영희",
                LocalDate.of(1946, 7, 20),
                80,
                ElderGender.FEMALE,
                "010-5555-6666",
                "서울특별시 은평구",
                "202동 203호",
                "이보호",
                "010-1212-3434",
                null,
                ElderStatus.WARNING
        ));

        conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-4",
                LocalDateTime.of(2026, 1, 30, 8, 0, 0),
                LocalDateTime.of(2026, 1, 30, 8, 20, 0),
                1200,
                10,
                SessionStatus.COMPLETED,
                "요약"
        ));

        mockMvc.perform(post("/api/elder/daily")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DailyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.timeline.start_time").value("08:00:00"))
                .andExpect(jsonPath("$.data.timeline.end_time").value("08:20:00"))
                .andExpect(jsonPath("$.data.timeline.conv_time").value(1200))
                .andExpect(jsonPath("$.data.summary_text").value("요약"))
                .andExpect(jsonPath("$.data.conv_logs").isArray())
                .andExpect(jsonPath("$.data.conv_logs").isEmpty())
                .andExpect(jsonPath("$.data.score").isArray())
                .andExpect(jsonPath("$.data.score").isEmpty());
    }

    @Test
    void getDailyAnalysisReturnsEmptyDataWhenConversationSessionDoesNotExist() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "최순자",
                LocalDate.of(1944, 11, 2),
                82,
                ElderGender.FEMALE,
                "010-3131-4141",
                "서울특별시 강북구",
                "303동 301호",
                "최보호",
                "010-5656-7878",
                null,
                ElderStatus.NO_DATA
        ));

                mockMvc.perform(post("/api/elder/daily")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DailyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.timeline.start_time").value(nullValue()))
                .andExpect(jsonPath("$.data.timeline.end_time").value(nullValue()))
                .andExpect(jsonPath("$.data.timeline.conv_time").value(nullValue()))
                .andExpect(jsonPath("$.data.summary_text").value(nullValue()))
                .andExpect(jsonPath("$.data.conv_logs").isArray())
                .andExpect(jsonPath("$.data.conv_logs").isEmpty())
                .andExpect(jsonPath("$.data.score").isArray())
                .andExpect(jsonPath("$.data.score").isEmpty());
    }

    @Test
    void getDailyAnalysisReturnsEmptyScoresWhenAnalysisMetricDoesNotExist() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "한정자",
                LocalDate.of(1949, 9, 9),
                77,
                ElderGender.FEMALE,
                "010-8787-1212",
                "서울특별시 성북구",
                "404동 402호",
                "한보호",
                "010-3434-9090",
                null,
                ElderStatus.STABLE
        ));

        ConversationSession session = conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-5",
                LocalDateTime.of(2026, 1, 30, 14, 0, 0),
                LocalDateTime.of(2026, 1, 30, 14, 15, 0),
                900,
                8,
                SessionStatus.COMPLETED,
                "세션 요약"
        ));

        analysisResultRepository.save(new AnalysisResult(
                elder,
                session,
                20L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("42.00"),
                "분석 결과 요약"
        ));

        mockMvc.perform(post("/api/elder/daily")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DailyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.timeline.start_time").value("14:00:00"))
                .andExpect(jsonPath("$.data.timeline.end_time").value("14:15:00"))
                .andExpect(jsonPath("$.data.timeline.conv_time").value(900))
                .andExpect(jsonPath("$.data.summary_text").value("분석 결과 요약"))
                .andExpect(jsonPath("$.data.score").isArray())
                .andExpect(jsonPath("$.data.score").isEmpty());
    }

    @Test
    void openApiDocsExposePostApiElderDaily() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/elder/daily'].post", notNullValue()));
    }

    private record DailyRequest(Long elder_id, LocalDate date) {
    }
}
