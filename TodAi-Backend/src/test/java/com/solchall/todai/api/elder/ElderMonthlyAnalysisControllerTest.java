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
class ElderMonthlyAnalysisControllerTest {

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
    void getMonthlyAnalysisReturnsMonthDataWeeklyAggregatesAndSummaries() throws Exception {
        Elder elder = elderRepository.save(new Elder(
                "김영자",
                LocalDate.of(1945, 5, 8),
                81,
                ElderGender.FEMALE,
                "010-1111-3333",
                "서울특별시 종로구",
                "101동 1001호",
                "김보호",
                "010-9999-8888",
                null,
                ElderStatus.STABLE
        ));

        ConversationSession sessionOne = conversationSessionRepository.save(new ConversationSession(
                elder,
                "monthly-1",
                LocalDateTime.of(2026, 1, 2, 9, 0, 0),
                LocalDateTime.of(2026, 1, 2, 9, 10, 0),
                600,
                5,
                SessionStatus.COMPLETED,
                "월초 세션"
        ));

        ConversationSession sessionTwo = conversationSessionRepository.save(new ConversationSession(
                elder,
                "monthly-2",
                LocalDateTime.of(2026, 1, 2, 16, 0, 0),
                LocalDateTime.of(2026, 1, 2, 16, 20, 0),
                1200,
                8,
                SessionStatus.COMPLETED,
                "월초 두 번째 세션"
        ));

        ConversationSession sessionThree = conversationSessionRepository.save(new ConversationSession(
                elder,
                "monthly-3",
                LocalDateTime.of(2026, 1, 10, 14, 0, 0),
                LocalDateTime.of(2026, 1, 10, 14, 15, 0),
                null,
                6,
                SessionStatus.COMPLETED,
                "중반 세션"
        ));

        ConversationSession sessionFour = conversationSessionRepository.save(new ConversationSession(
                elder,
                "monthly-4",
                LocalDateTime.of(2026, 1, 23, 11, 0, 0),
                LocalDateTime.of(2026, 1, 23, 11, 30, 0),
                1800,
                12,
                SessionStatus.COMPLETED,
                "후반 세션"
        ));

        conversationSessionRepository.save(new ConversationSession(
                elder,
                "monthly-5",
                LocalDateTime.of(2026, 1, 29, 10, 0, 0),
                LocalDateTime.of(2026, 1, 29, 10, 40, 0),
                2400,
                10,
                SessionStatus.COMPLETED,
                "후반 추가 세션"
        ));

        conversationSessionRepository.save(new ConversationSession(
                elder,
                "ignored-failed",
                LocalDateTime.of(2026, 1, 15, 10, 0, 0),
                LocalDateTime.of(2026, 1, 15, 10, 50, 0),
                3000,
                10,
                SessionStatus.FAILED,
                "제외 세션"
        ));

        conversationSessionRepository.save(new ConversationSession(
                elder,
                "ignored-next-month",
                LocalDateTime.of(2026, 2, 1, 9, 0, 0),
                LocalDateTime.of(2026, 2, 1, 9, 30, 0),
                1800,
                6,
                SessionStatus.COMPLETED,
                "다음 달 세션"
        ));

        AnalysisResult resultOne = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionOne,
                1L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("70.0"),
                "월초 안정적이었습니다."
        ));

        AnalysisResult resultTwo = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionTwo,
                2L,
                AnalysisStatus.PARTIAL,
                new BigDecimal("80.0"),
                "대화가 자연스럽게 이어졌습니다."
        ));

        AnalysisResult resultThree = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionThree,
                3L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("60.0"),
                "건강 관련 대화가 있었습니다."
        ));

        AnalysisResult resultFour = analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionFour,
                4L,
                AnalysisStatus.SUCCESS,
                new BigDecimal("90.0"),
                "월 후반에는 대화 시간이 늘었습니다."
        ));

        analysisResultRepository.save(new AnalysisResult(
                elder,
                sessionFour,
                5L,
                AnalysisStatus.FAILED,
                new BigDecimal("99.0"),
                "실패 분석"
        ));

        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.HEALTH_ANXIETY, new BigDecimal("80"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultTwo, MetricType.HEALTH_ANXIETY, new BigDecimal("60"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultFour, MetricType.HEALTH_ANXIETY, new BigDecimal("70"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultOne, MetricType.EMOTIONAL_VARIATION, new BigDecimal("30"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultTwo, MetricType.EMOTIONAL_VARIATION, new BigDecimal("50"), null, null));
        analysisMetricRepository.save(new AnalysisMetric(resultThree, MetricType.EMOTIONAL_VARIATION, new BigDecimal("40"), null, null));

        mockMvc.perform(post("/api/elder/monthly")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MonthlyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.monthly_data.length()").value(31))
                .andExpect(jsonPath("$.data.monthly_data[0].date").value("2026-01-01"))
                .andExpect(jsonPath("$.data.monthly_data[0].day").value("목"))
                .andExpect(jsonPath("$.data.monthly_data[0].score").value(nullValue()))
                .andExpect(jsonPath("$.data.monthly_data[0].conv_time").value(0))
                .andExpect(jsonPath("$.data.monthly_data[1].date").value("2026-01-02"))
                .andExpect(jsonPath("$.data.monthly_data[1].day").value("금"))
                .andExpect(jsonPath("$.data.monthly_data[1].score").value(75))
                .andExpect(jsonPath("$.data.monthly_data[1].conv_time").value(30))
                .andExpect(jsonPath("$.data.monthly_data[9].date").value("2026-01-10"))
                .andExpect(jsonPath("$.data.monthly_data[9].day").value("토"))
                .andExpect(jsonPath("$.data.monthly_data[9].score").value(60))
                .andExpect(jsonPath("$.data.monthly_data[9].conv_time").value(15))
                .andExpect(jsonPath("$.data.monthly_data[22].date").value("2026-01-23"))
                .andExpect(jsonPath("$.data.monthly_data[22].day").value("금"))
                .andExpect(jsonPath("$.data.monthly_data[22].score").value(90))
                .andExpect(jsonPath("$.data.monthly_data[22].conv_time").value(30))
                .andExpect(jsonPath("$.data.weekly_scores.length()").value(5))
                .andExpect(jsonPath("$.data.weekly_scores[0].week").value(1))
                .andExpect(jsonPath("$.data.weekly_scores[0].score").value(75))
                .andExpect(jsonPath("$.data.weekly_scores[1].week").value(2))
                .andExpect(jsonPath("$.data.weekly_scores[1].score").value(60))
                .andExpect(jsonPath("$.data.weekly_scores[2].week").value(3))
                .andExpect(jsonPath("$.data.weekly_scores[2].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_scores[3].week").value(4))
                .andExpect(jsonPath("$.data.weekly_scores[3].score").value(90))
                .andExpect(jsonPath("$.data.weekly_scores[4].week").value(5))
                .andExpect(jsonPath("$.data.weekly_scores[4].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_conv_time.length()").value(5))
                .andExpect(jsonPath("$.data.weekly_conv_time[0].week").value(1))
                .andExpect(jsonPath("$.data.weekly_conv_time[0].conv_time").value(30))
                .andExpect(jsonPath("$.data.weekly_conv_time[1].week").value(2))
                .andExpect(jsonPath("$.data.weekly_conv_time[1].conv_time").value(15))
                .andExpect(jsonPath("$.data.weekly_conv_time[2].week").value(3))
                .andExpect(jsonPath("$.data.weekly_conv_time[2].conv_time").value(0))
                .andExpect(jsonPath("$.data.weekly_conv_time[3].week").value(4))
                .andExpect(jsonPath("$.data.weekly_conv_time[3].conv_time").value(30))
                .andExpect(jsonPath("$.data.weekly_conv_time[4].week").value(5))
                .andExpect(jsonPath("$.data.weekly_conv_time[4].conv_time").value(40))
                .andExpect(jsonPath("$.data.monthly_summaries.length()").value(4))
                .andExpect(jsonPath("$.data.monthly_summaries[0].type").value("SUMMARY"))
                .andExpect(jsonPath("$.data.monthly_summaries[0].title").value("한 달 요약"))
                .andExpect(jsonPath("$.data.monthly_summaries[0].content").value("월초 안정적이었습니다. 대화가 자연스럽게 이어졌습니다. 건강 관련 대화가 있었습니다."))
                .andExpect(jsonPath("$.data.monthly_summaries[1].type").value("CONVERSATION_TREND"))
                .andExpect(jsonPath("$.data.monthly_summaries[1].title").value("대화 추이 분석"))
                .andExpect(jsonPath("$.data.monthly_summaries[1].content").value("월 초보다 월 후반에 대화 시간이 증가했습니다. 현재의 대화 흐름을 꾸준히 유지해주세요."))
                .andExpect(jsonPath("$.data.monthly_summaries[2].type").value("HEALTH_ANXIETY"))
                .andExpect(jsonPath("$.data.monthly_summaries[2].title").value("건강 우려 분석"))
                .andExpect(jsonPath("$.data.monthly_summaries[2].content").value("건강 관련 불안은 비교적 안정적인 흐름을 보였습니다. 현재의 안부 확인과 건강 루틴을 유지해주세요."))
                .andExpect(jsonPath("$.data.monthly_summaries[3].type").value("EMOTIONAL_STABILITY"))
                .andExpect(jsonPath("$.data.monthly_summaries[3].title").value("정서 안정도 분석"))
                .andExpect(jsonPath("$.data.monthly_summaries[3].content").value("정서 상태의 변동이 일부 관찰됩니다. 감정 표현의 흐름을 계속 살피며 공감 중심의 대화를 이어가주세요."));
    }

    @Test
    void getMonthlyAnalysisReturnsEmptyMonthWhenNoSessionsExist() throws Exception {
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

        mockMvc.perform(post("/api/elder/monthly")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MonthlyRequest(elder.getId(), LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.monthly_data.length()").value(31))
                .andExpect(jsonPath("$.data.monthly_data[0].date").value("2026-01-01"))
                .andExpect(jsonPath("$.data.monthly_data[0].score").value(nullValue()))
                .andExpect(jsonPath("$.data.monthly_data[0].conv_time").value(0))
                .andExpect(jsonPath("$.data.weekly_scores.length()").value(5))
                .andExpect(jsonPath("$.data.weekly_scores[0].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_scores[4].score").value(nullValue()))
                .andExpect(jsonPath("$.data.weekly_conv_time.length()").value(5))
                .andExpect(jsonPath("$.data.weekly_conv_time[0].conv_time").value(0))
                .andExpect(jsonPath("$.data.weekly_conv_time[4].conv_time").value(0))
                .andExpect(jsonPath("$.data.monthly_summaries.length()").value(4))
                .andExpect(jsonPath("$.data.monthly_summaries[0].content").value("이번 달 분석 요약 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요."))
                .andExpect(jsonPath("$.data.monthly_summaries[1].content").value("이번 달 대화 시간 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요."))
                .andExpect(jsonPath("$.data.monthly_summaries[2].content").value("이번 달 건강 불안 분석 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요."))
                .andExpect(jsonPath("$.data.monthly_summaries[3].content").value("이번 달 정서 안정도 분석 데이터가 부족합니다. 대화가 충분히 누적된 뒤 다시 확인해주세요."));
    }

    @Test
    void getMonthlyAnalysisReturnsNotFoundWhenElderDoesNotExist() throws Exception {
        mockMvc.perform(post("/api/elder/monthly")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MonthlyRequest(999L, LocalDate.of(2026, 1, 30)))))
                .andExpect(status().isNotFound());
    }

    @Test
    void openApiDocsExposePostApiElderMonthly() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/elder/monthly'].post", notNullValue()));
    }

    private record MonthlyRequest(Long elder_id, LocalDate date) {
    }
}
