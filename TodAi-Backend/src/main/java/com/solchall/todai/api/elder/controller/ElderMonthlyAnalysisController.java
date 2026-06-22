package com.solchall.todai.api.elder.controller;

import com.solchall.todai.api.elder.dto.ElderMonthlyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderMonthlyAnalysisResponse;
import com.solchall.todai.api.elder.service.ElderMonthlyAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/elder")
public class ElderMonthlyAnalysisController {

    private final ElderMonthlyAnalysisService elderMonthlyAnalysisService;

    public ElderMonthlyAnalysisController(ElderMonthlyAnalysisService elderMonthlyAnalysisService) {
        this.elderMonthlyAnalysisService = elderMonthlyAnalysisService;
    }

    @PostMapping("/monthly")
    public ResponseEntity<ElderMonthlyAnalysisResponse> getMonthlyAnalysis(
            @RequestBody ElderMonthlyAnalysisRequest request
    ) {
        return ResponseEntity.ok(elderMonthlyAnalysisService.getMonthlyAnalysis(request));
    }
}
