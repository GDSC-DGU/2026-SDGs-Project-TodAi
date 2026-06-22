package com.solchall.todai.api.elder.controller;

import com.solchall.todai.api.elder.dto.ElderWeeklyDetailRequest;
import com.solchall.todai.api.elder.dto.ElderWeeklyDetailResponse;
import com.solchall.todai.api.elder.service.ElderWeeklyAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/elder/weekly")
public class ElderWeeklyDetailController {

    private final ElderWeeklyAnalysisService elderWeeklyAnalysisService;

    public ElderWeeklyDetailController(ElderWeeklyAnalysisService elderWeeklyAnalysisService) {
        this.elderWeeklyAnalysisService = elderWeeklyAnalysisService;
    }

    @PostMapping("/detail")
    public ResponseEntity<ElderWeeklyDetailResponse> getWeeklyDetail(
            @RequestBody ElderWeeklyDetailRequest request
    ) {
        return ResponseEntity.ok(elderWeeklyAnalysisService.getWeeklyDetail(request));
    }
}
