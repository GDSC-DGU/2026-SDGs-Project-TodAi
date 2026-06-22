package com.solchall.todai.api.elder.controller;

import com.solchall.todai.api.elder.dto.ElderWeeklyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderWeeklyAnalysisResponse;
import com.solchall.todai.api.elder.service.ElderWeeklyAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/elder")
public class ElderWeeklyAnalysisController {

    private final ElderWeeklyAnalysisService elderWeeklyAnalysisService;

    public ElderWeeklyAnalysisController(ElderWeeklyAnalysisService elderWeeklyAnalysisService) {
        this.elderWeeklyAnalysisService = elderWeeklyAnalysisService;
    }

    @PostMapping("/weekly")
    public ResponseEntity<ElderWeeklyAnalysisResponse> getWeeklyAnalysis(
            @RequestBody ElderWeeklyAnalysisRequest request
    ) {
        return ResponseEntity.ok(elderWeeklyAnalysisService.getWeeklyAnalysis(request));
    }
}
