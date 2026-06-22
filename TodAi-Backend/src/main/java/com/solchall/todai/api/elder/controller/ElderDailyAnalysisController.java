package com.solchall.todai.api.elder.controller;

import com.solchall.todai.api.elder.dto.ElderDailyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderDailyAnalysisResponse;
import com.solchall.todai.api.elder.service.ElderDailyAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/elder")
public class ElderDailyAnalysisController {

    private final ElderDailyAnalysisService elderDailyAnalysisService;

    public ElderDailyAnalysisController(ElderDailyAnalysisService elderDailyAnalysisService) {
        this.elderDailyAnalysisService = elderDailyAnalysisService;
    }

    @PostMapping("/daily")
    public ResponseEntity<ElderDailyAnalysisResponse> getDailyAnalysis(
            @RequestBody ElderDailyAnalysisRequest request
    ) {
        return ResponseEntity.ok(elderDailyAnalysisService.getDailyAnalysis(request));
    }
}
