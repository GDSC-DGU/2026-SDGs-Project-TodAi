package com.solchall.todai.api.main;

import com.solchall.todai.api.main.dto.MainResponse;
import com.solchall.todai.api.main.service.MainService;
import com.solchall.todai.domain.elder.entity.Elder;
import com.solchall.todai.domain.elder.entity.ElderGender;
import com.solchall.todai.domain.elder.entity.ElderStatus;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class MainControllerTest {

    @Autowired
    private ElderRepository elderRepository;

    @Autowired
    private MainService mainService;

    @BeforeEach
    void setUp() {
        elderRepository.deleteAll();
    }

    @Test
    void getMainPageReturnsEmptyArrayWhenNoEldersExist() {
        MainResponse response = mainService.getMainPage();

        assertThat(response.data()).isEmpty();
    }

    @Test
    void getMainPageReturnsElderSummaryList() {
        elderRepository.save(new Elder(
                "김영자",
                LocalDate.of(1947, 1, 10),
                79,
                ElderGender.FEMALE,
                "010-1111-1111",
                "서울특별시 종로구",
                "101동 1001호",
                "김민수",
                "010-2222-2222",
                null,
                ElderStatus.STABLE
        ));

        MainResponse response = mainService.getMainPage();

        assertThat(response.data()).hasSize(1);
        assertThat(response.data().get(0).name()).isEqualTo("김영자");
        assertThat(response.data().get(0).age()).isEqualTo(79);
        assertThat(response.data().get(0).gender()).isEqualTo(ElderGender.FEMALE);
        assertThat(response.data().get(0).weeklyConv()).isZero();
        assertThat(response.data().get(0).score()).isEmpty();
        assertThat(response.data().get(0).status()).isEqualTo(ElderStatus.STABLE);
    }

    @Test
    void getMainPageReturnsNoDataWhenElderStatusIsNullOnCreate() {
        elderRepository.save(new Elder(
                "박순자",
                LocalDate.of(1945, 5, 5),
                81,
                ElderGender.FEMALE,
                "010-3333-3333",
                "서울특별시 마포구",
                "202동 202호",
                "박철수",
                "010-4444-4444",
                null,
                null
        ));

        MainResponse response = mainService.getMainPage();

        assertThat(response.data()).hasSize(1);
        assertThat(response.data().get(0).status()).isEqualTo(ElderStatus.NO_DATA);
    }
}
