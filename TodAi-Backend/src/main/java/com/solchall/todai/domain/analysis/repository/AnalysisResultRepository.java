package com.solchall.todai.domain.analysis.repository;

import com.solchall.todai.domain.analysis.entity.AnalysisResult;
import com.solchall.todai.domain.analysis.entity.AnalysisStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Long> {

    Optional<AnalysisResult> findByAnalysisJobId(Long analysisJobId);

    Optional<AnalysisResult> findFirstByConversationSessionIdAndAnalysisStatusInOrderByIdDesc(
            Long conversationSessionId,
            Collection<AnalysisStatus> statuses
    );

    List<AnalysisResult> findByConversationSessionIdInAndAnalysisStatusIn(
            Collection<Long> conversationSessionIds,
            Collection<AnalysisStatus> statuses
    );
}
