package com.solchall.todai.domain.analysisjob.entity;

public enum AnalysisJobEventType {
    JOB_CREATED,
    PUBLISH_STARTED,
    PUBLISH_SUCCESS,
    PUBLISH_FAILED,
    WORKER_REPLY_RECEIVED,
    WORKER_REPLY_FAILED,
    AGGREGATION_COMPLETED,
    AGGREGATION_TIMEOUT,
    ADK_REQUESTED,
    ADK_SUCCESS,
    ADK_FAILED,
    RESULT_SAVED
}
