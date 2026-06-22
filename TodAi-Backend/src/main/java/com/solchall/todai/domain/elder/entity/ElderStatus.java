package com.solchall.todai.domain.elder.entity;

public enum ElderStatus {
    DANGER, //위기
    WARNING,//주의
    STABLE,//안정
    NO_DATA // 아직 세션이 없는 경우 대비
}
