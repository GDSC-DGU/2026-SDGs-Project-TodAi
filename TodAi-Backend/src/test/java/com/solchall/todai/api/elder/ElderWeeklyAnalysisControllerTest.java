package com.solchall.todai.api.elder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solchall.todai.domain.analysis.entity.AnalysisMetric;
import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.analysis.entity.AnalysisStatus;
import com.solchall.todai.domain.analysis.entity.MetricType;
import com.solchall.todai.domain.analysis.repository.AnalysisMetricRepository;
import com.solchall.todai.domain.analysis.repository.AnalysisResultRepository;
import com.solchall.todai.domain.conversation.entity.ConversationSession;
import com.solchall.todai.domain.conversation.entity.SessionStatus;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
@AutoConfigureMockMvc
class ElderWeeklyAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ElderRepository elderRepository;

    @Autowired
    private ConversationSessionRepository conversationSessionRepository;

    @Autowired
    private AnalysisResultRepository analysisResultRepository;

    @Autowired
    private AnalysisMetricRepository analysisMetricRepository;

    @BeforeEach
    void setUp() {
        analysisMetricRepository.deleteAll();
        analysisResultRepository.deleteAll();
        conversationSessionRepository.deleteAll();
        elderRepository.deleteAll();
    }

    @Test
    void getWeeklyAnalysisReturnsSevenDaysAndAggregatedData() throws Exception {
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

        ConversationSession sessionOne = conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-1",
                LocalDateTime.of(2026, 1, 24, 10, 0, 0),
                LocalDateTime.of(2026, 1, 24, 10, 10, 0),
                600,
                6,
                SessionStatus.COMPLETED,
                "24일 세션"
        ));

        ConversationSession sessionTwo = conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-2",
                LocalDateTime.of(2026, 1, 30, 9, 0, 0),
                LocalDateTime.of(2026, 1, 30, 9, 15, 0),
                null,
                7,
                SessionStatus.COMPLETED,
                "30일 오전 세션"
        ));

        ConversationSession sessionThree = conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-3",
                LocalDateTime.of(2026, 1, 30, 18, 0, 0),
                LocalDateTime.of(2026, 1, 30, 18, 10, 0),
                600,
                5,
                SessionStatus.COMPLETED,
                "30일 오후 세션"
        ));

        conversationSessionRepository.save(new ConversationSession(
                elder,
                "session-4",
                LocalDateTime.of(2026, 1, 29, 11, 0, 0),
                LocalDateTime.of(2026, 1, 29, 11, 5, 0),
                300,
                3,
                SessionStatus.FAILED,
                "제외 세션"
        ));

        AnalysisResult resultOne = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionOne,
                1L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("70.0"),
                "1월 24일 요약"
        ));

        AnalysisResult resultTwo = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionTwo,
                2L,
                AnalysisStatus.PARTIAL,
                new BigDecimal("70.0"),
                "1월 30일 오전 요약"
        ));

        AnalysisResult resultThree = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionThree,
                3L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("75.0"),
                "1월 30일 오후 요약"
        ));

        analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionThree,
                4L,
                AnalysisStatus.FAILED,
                new BigDecimal("99.0"),
                "실패 요약"
        ));

        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.SOCIAL_ISOLATION, new BigDecimal("80"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.COGNITIVE_DECLINE, new BigDecimal("70"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.EMOTIONAL_VARIATION, new BigDecimal("60"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.DAILY_VITALITY, new BigDecimal("75"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.HEALTH_ANXIETY, new BigDecimal("50"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultTwo, MetricType.SOCIAL_ISOLATION, new BigDecimal("70"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultThree, MetricType.DAILY_VITALITY, new BigDecimal("85"), null, null));

        mockMvc.perform(post("/api/elder/weekly")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new WeeklyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weekly_data.length()").value(7))
                .andExpect(jsonPath("$.data.weekly_data[0].date").value("2026-01-24"))
                .andExpect(jsonPath("$.data.weekly_data[0].day").value("토"))
                .andExpect(jsonPath("$.data.weekly_data[0].score").value(70))
                .andExpect(jsonPath("$.data.weekly_data[0].conv_time").value(10))
                .andExpect(jsonPath("$.data.weekly_data[1].date").value("2026-01-25"))
                .andExpect(jsonPath("$.data.weekly_data[1].day").value("일"))
                .andExpect(jsonPath("$.data.weekly_data[1].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_data[1].conv_time").value(0))
                .andExpect(jsonPath("$.data.weekly_data[6].date").value("2026-01-30"))
                .andExpect(jsonPath("$.data.weekly_data[6].day").value("금"))
                .andExpect(jsonPath("$.data.weekly_data[6].score").value(73))
                .andExpect(jsonPath("$.data.weekly_data[6].conv_time").value(25))
                .andExpect(jsonPath("$.data.weekly_scores_radar.length()").value(5))
                .andExpect(jsonPath("$.data.weekly_scores_radar[0].type").value("SOCIAL_ISOLATION"))
                .andExpect(jsonPath("$.data.weekly_scores_radar[0].score").value(75))
                .andExpect(jsonPath("$.data.weekly_scores_radar[1].type").value("COGNITIVE_DECLINE"))
                .andExpect(jsonPath("$.data.weekly_scores_radar[1].score").value(70))
                .andExpect(jsonPath("$.data.weekly_scores_radar[2].type").value("EMOTIONAL_VARIATION"))
                .andExpect(jsonPath("$.data.weekly_scores_radar[2].score").value(60))
                .andExpect(jsonPath("$.data.weekly_scores_radar[3].type").value("DAILY_VITALITY"))
                .andExpect(jsonPath("$.data.weekly_scores_radar[3].score").value(80))
                .andExpect(jsonPath("$.data.weekly_scores_radar[4].type").value("HEALTH_ANXIETY"))
                .andExpect(jsonPath("$.data.weekly_scores_radar[4].score").value(50))
                .andExpect(jsonPath("$.data.summaries.length()").value(3))
                .andExpect(jsonPath("$.data.summaries[0].date").value("2026-01-24"))
                .andExpect(jsonPath("$.data.summaries[0].summary_text").value("1월 24일 요약"))
                .andExpect(jsonPath("$.data.summaries[1].date").value("2026-01-30"))
                .andExpect(jsonPath("$.data.summaries[1].summary_text").value("1월 30일 오후 요약"))
                .andExpect(jsonPath("$.data.summaries[2].date").value("2026-01-30"))
                .andExpect(jsonPath("$.data.summaries[2].summary_text").value("1월 30일 오전 요약"));
    }

    @Test
    void getWeeklyAnalysisReturnsEmptyWeekWhenNoSessionsExist() throws Exception {
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

        mockMvc.perform(post("/api/elder/weekly")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new WeeklyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weekly_data.length()").value(7))
                .andExpect(jsonPath("$.data.weekly_data[0].date").value("2026-01-24"))
                .andExpect(jsonPath("$.data.weekly_data[0].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_data[0].conv_time").value(0))
                .andExpect(jsonPath("$.data.weekly_scores_radar.length()").value(5))
                .andExpect(jsonPath("$.data.weekly_scores_radar[0].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_scores_radar[4].score").value(nullValue()))
                .andExpect(jsonPath("$.data.summaries").isArray())
                .andExpect(jsonPath("$.data.summaries").isEmpty());
    }

    @Test
    void getWeeklyAnalysisReturnsNotFoundWhenElderDoesNotExist() throws Exception {
        mockMvc.perform(post("/api/elder/weekly")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new WeeklyRequest(999L, LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isNotFound());
    }

    @Test
    void getWeeklyDetailReturnsGuidesForSevenDayAverage() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "문정희",
                LocalDate.of(1947, 8, 19),
                79,
                ElderGender.FEMALE,
                "010-1111-9999",
                "서울특별시 동작구",
                "505동 503호",
                "문보호",
                "010-8888-7777",
                null,
                ElderStatus.WARNING
        ));

        ConversationSession completedSessionOne = conversationSessionRepository.save(new ConversationSession(
                elder,
                "weekly-detail-1",
                LocalDateTime.of(2026, 1, 24, 10, 0, 0),
                LocalDateTime.of(2026, 1, 24, 10, 20, 0),
                1200,
                10,
                SessionStatus.COMPLETED,
                "첫 번째 세션"
        ));

        ConversationSession completedSessionTwo = conversationSessionRepository.save(new ConversationSession(
                elder,
                "weekly-detail-2",
                LocalDateTime.of(2026, 1, 30, 15, 0, 0),
                LocalDateTime.of(2026, 1, 30, 15, 12, 0),
                720,
                7,
                SessionStatus.COMPLETED,
                "두 번째 세션"
        ));

        ConversationSession failedSession = conversationSessionRepository.save(new ConversationSession(
                elder,
                "weekly-detail-3",
                LocalDateTime.of(2026, 1, 29, 11, 0, 0),
                LocalDateTime.of(2026, 1, 29, 11, 10, 0),
                600,
                5,
                SessionStatus.FAILED,
                "제외 세션"
        ));

        AnalysisResult successResult = analysisResultRepository.save(new AnalysisResult(
                elder,
                completedSessionOne,
                30L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("55.0"),
                "성공 분석"
        ));

        AnalysisResult partialResult = analysisResultRepository.save(new AnalysisResult(
                elder,
                completedSessionTwo,
                31L,
                AnalysisStatus.PARTIAL,
                new BigDecimal("65.0"),
                "부분 분석"
        ));

        AnalysisResult failedResult = analysisResultRepository.save(new AnalysisResult(
                elder,
                completedSessionTwo,
                32L,
                AnalysisStatus.FAILED,
                new BigDecimal("10.0"),
                "실패 분석"
        ));

        AnalysisResult ignoredBySessionStatusResult = analysisResultRepository.save(new AnalysisResult(
                elder,
                failedSession,
                33L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("99.0"),
                "실패 세션 분석"
        ));

        analysisMetricRepository.save(new AnalysisMetric(successResult, MetricType.SOCIAL_ISOLATION, new BigDecimal("20"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(partialResult, MetricType.SOCIAL_ISOLATION, new BigDecimal("30"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(successResult, MetricType.COGNITIVE_DECLINE, new BigDecimal("60"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(partialResult, MetricType.COGNITIVE_DECLINE, new BigDecimal("70"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(successResult, MetricType.EMOTIONAL_VARIATION, new BigDecimal("80"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(partialResult, MetricType.HEALTH_ANXIETY, new BigDecimal("80"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(failedResult, MetricType.HEALTH_ANXIETY, new BigDecimal("10"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(ignoredBySessionStatusResult, MetricType.DAILY_VITALITY, new BigDecimal("95"), null, null));

        mockMvc.perform(post("/api/elder/weekly/detail")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new WeeklyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.guides.length()").value(5))
                .andExpect(jsonPath("$.data.guides[0].type").value(0))
                .andExpect(jsonPath("$.data.guides[0].status").value("LOW"))
                .andExpect(jsonPath("$.data.guides[1].type").value(1))
                .andExpect(jsonPath("$.data.guides[1].status").value("MEDIUM"))
                .andExpect(jsonPath("$.data.guides[2].type").value(2))
                .andExpect(jsonPath("$.data.guides[2].status").value("HIGH"))
                .andExpect(jsonPath("$.data.guides[3].type").value(3))
                .andExpect(jsonPath("$.data.guides[3].status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.guides[4].type").value(4))
                .andExpect(jsonPath("$.data.guides[4].status").value("HIGH"));
    }

    @Test
    void getWeeklyDetailReturnsDefaultGuidesWhenNoSessionsExist() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "박순자",
                LocalDate.of(1943, 4, 7),
                83,
                ElderGender.FEMALE,
                "010-2323-4545",
                "서울특별시 노원구",
                "707동 702호",
                "박보호",
                "010-1010-2020",
                null,
                ElderStatus.NO_DATA
        ));

        mockMvc.perform(post("/api/elder/weekly/detail")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new WeeklyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.guides.length()").value(5))
                .andExpect(jsonPath("$.data.guides[0].type").value(0))
                .andExpect(jsonPath("$.data.guides[0].status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.guides[1].type").value(1))
                .andExpect(jsonPath("$.data.guides[1].status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.guides[2].type").value(2))
                .andExpect(jsonPath("$.data.guides[2].status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.guides[3].type").value(3))
                .andExpect(jsonPath("$.data.guides[3].status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.guides[4].type").value(4))
                .andExpect(jsonPath("$.data.guides[4].status").value("NO_DATA"));
    }

    @Test
    void getWeeklyDetailReturnsNotFoundWhenElderDoesNotExist() throws Exception {
        mockMvc.perform(post("/api/elder/weekly/detail")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new WeeklyRequest(999L, LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isNotFound());
    }

    @Test
    void openApiDocsExposePostApiElderWeekly() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/elder/weekly'].post", notNullValue()));
    }

    @Test
    void openApiDocsExposePostApiElderWeeklyDetail() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/elder/weekly/detail'].post", notNullValue()));
    }

    private record WeeklyRequest(Long elder_id, LocalDate date) {
    }
}
