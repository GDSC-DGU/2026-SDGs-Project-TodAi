package com.solchall.todai.api.internal.analysisjob.controller;

import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobEventRequest;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobEventResponse;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobRequest;
import com.solchall.todai.api.internal.analysisjob.dto.CreateAnalysisJobResponse;
import com.solchall.todai.api.internal.analysisjob.dto.SaveAnalysisResultRequest;
import com.solchall.todai.api.internal.analysisjob.dto.SaveAnalysisResultResponse;
import com.solchall.todai.api.internal.analysisjob.dto.UpdateAnalysisJobStatusRequest;
import com.solchall.todai.api.internal.analysisjob.dto.UpdateAnalysisJobStatusResponse;
import com.solchall.todai.api.internal.analysisjob.service.AnalysisJobInternalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/analysis-jobs")
public class AnalysisJobInternalController {

    private final AnalysisJobInternalService analysisJobInternalService;

    public AnalysisJobInternalController(AnalysisJobInternalService analysisJobInternalService) {
        this.analysisJobInternalService = analysisJobInternalService;
    }

    @PostMapping
    public ResponseEntity<CreateAnalysisJobResponse> createJob(@RequestBody CreateAnalysisJobRequest request) {
        return ResponseEntity.ok(analysisJobInternalService.createJob(request));
    }

    @PostMapping("/{jobId}/events")
    public ResponseEntity<CreateAnalysisJobEventResponse> appendEvent(
            @PathVariable Long jobId,
            @RequestBody CreateAnalysisJobEventRequest request
    ) {
        return ResponseEntity.ok(analysisJobInternalService.appendEvent(jobId, request));
    }

    @PatchMapping("/{jobId}/status")
    public ResponseEntity<UpdateAnalysisJobStatusResponse> updateStatus(
            @PathVariable Long jobId,
            @RequestBody UpdateAnalysisJobStatusRequest request
    ) {
        return ResponseEntity.ok(analysisJobInternalService.updateStatus(jobId, request));
    }

    @PostMapping("/{jobId}/result")
    public ResponseEntity<SaveAnalysisResultResponse> saveResult(
            @PathVariable Long jobId,
            @RequestBody SaveAnalysisResultRequest request
    ) {
        return ResponseEntity.ok(analysisJobInternalService.saveResult(jobId, request));
    }
}
