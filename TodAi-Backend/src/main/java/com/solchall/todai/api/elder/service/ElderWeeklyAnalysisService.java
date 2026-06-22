package com.solchall.todai.api.elder.service;

import com.solchall.todai.api.elder.dto.ElderWeeklyAnalysisRequest;
import com.solchall.todai.api.elder.dto.ElderWeeklyAnalysisResponse;
import com.solchall.todai.api.elder.dto.ElderWeeklyDetailRequest;
import com.solchall.todai.api.elder.dto.ElderWeeklyDetailResponse;

public interface ElderWeeklyAnalysisService {

    ElderWeeklyAnalysisResponse getWeeklyAnalysis(ElderWeeklyAnalysisRequest request);

    ElderWeeklyDetailResponse getWeeklyDetail(ElderWeeklyDetailRequest request);
}
