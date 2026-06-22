package com.solchall.todai.domain.analysisjob.repository;

import com.solchall.todai.domain.analysisjob.entity.AnalysisJobEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisJobEventRepository extends JpaRepository<AnalysisJobEvent, Long> {
}
