package com.solchall.todai.api.elder.service;

import com.solchall.todai.api.elder.dto.ElderDailyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderDailyAnalysisResponse;

public interface ElderDailyAnalysisService {

    ElderDailyAnalysisResponse getDailyAnalysis(ElderDailyAnalysisRequest request);
}
