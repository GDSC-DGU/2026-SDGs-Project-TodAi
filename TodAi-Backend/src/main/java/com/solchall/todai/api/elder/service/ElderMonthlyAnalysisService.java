package com.solchall.todai.api.elder.service;

import com.solchall.todai.api.elder.dto.ElderMonthlyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderMonthlyAnalysisResponse;

public interface ElderMonthlyAnalysisService {

    ElderMonthlyAnalysisResponse getMonthlyAnalysis(ElderMonthlyAnalysisRequest request);
}
