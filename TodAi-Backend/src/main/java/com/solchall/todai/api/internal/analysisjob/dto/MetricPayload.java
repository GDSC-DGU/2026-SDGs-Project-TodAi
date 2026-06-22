package com.solchall.todai.api.internal.analysisjob.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

public class MetricPayload {

    @JsonProperty("social_isolation")
    private BigDecimal socialIsolation;

    @JsonProperty("health_anxiety")
    private BigDecimal healthAnxiety;

    @JsonProperty("daily_vitality")
    private BigDecimal dailyVitality;

    @JsonProperty("emotion_variance")
    private BigDecimal emotionVariance;

    @JsonProperty("cognitive_load")
    private BigDecimal cognitiveLoad;

    private final Map<String, Object> unknownFields = new LinkedHashMap<>();

    @JsonAnySetter
    void addUnknownField(String key, Object value) {
        unknownFields.put(key, value);
    }

    public BigDecimal getSocialIsolation() {
        return socialIsolation;
    }

    public void setSocialIsolation(BigDecimal socialIsolation) {
        this.socialIsolation = socialIsolation;
    }

    public BigDecimal getHealthAnxiety() {
        return healthAnxiety;
    }

    public void setHealthAnxiety(BigDecimal healthAnxiety) {
        this.healthAnxiety = healthAnxiety;
    }

    public BigDecimal getDailyVitality() {
        return dailyVitality;
    }

    public void setDailyVitality(BigDecimal dailyVitality) {
        this.dailyVitality = dailyVitality;
    }

    public BigDecimal getEmotionVariance() {
        return emotionVariance;
    }

    public void setEmotionVariance(BigDecimal emotionVariance) {
        this.emotionVariance = emotionVariance;
    }

    public BigDecimal getCognitiveLoad() {
        return cognitiveLoad;
    }

    public void setCognitiveLoad(BigDecimal cognitiveLoad) {
        this.cognitiveLoad = cognitiveLoad;
    }

    public boolean hasUnknownFields() {
        return !unknownFields.isEmpty();
    }

    public Map<String, Object> getUnknownFields() {
        return Map.copyOf(unknownFields);
    }
}
