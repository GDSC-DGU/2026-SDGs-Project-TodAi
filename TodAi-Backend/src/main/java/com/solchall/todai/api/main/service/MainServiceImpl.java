package com.solchall.todai.api.main.service;

import com.solchall.todai.api.main.dto.MainElderResponse;
import com.solchall.todai.api.main.dto.MainResponse;
import com.solchall.todai.api.main.dto.MainScoreResponse;
import com.solchall.todai.domain.elder.entity.Elder;
import com.solchall.todai.domain.elder.repository.ElderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MainServiceImpl implements MainService {

    private final ElderRepository elderRepository;

    public MainServiceImpl(ElderRepository elderRepository) {
        this.elderRepository = elderRepository;
    }

    @Override
    public MainResponse getMainPage() {
        List<MainElderResponse> elderResponses = elderRepository.findAllByOrderByIdAsc()
                .stream()
                .map(this::toMainElderResponse)
                .toList();

        return MainResponse.from(elderResponses);
    }

    private MainElderResponse toMainElderResponse(Elder elder) {
        return MainElderResponse.of(
                elder.getId(),
                elder.getName(),
                elder.getAge(),
                elder.getGender(),
                getWeeklyConversationCount(elder),
                getScores(elder),
                elder.getStatus()
        );
    }

    private int getWeeklyConversationCount(Elder elder) {
        return 0;
    }

    private List<MainScoreResponse> getScores(Elder elder) {
        return Collections.emptyList();
    }
}
