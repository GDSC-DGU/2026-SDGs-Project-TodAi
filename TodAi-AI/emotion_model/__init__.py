"""음성 감정 인식 패키지.

todai-emotion-wav2vec2 (kresnik/wav2vec2-large-xlsr-korean 파인튜닝, 6-class)로
한국어 발화의 감정을 추론한다. STT(stt_model)와 병렬로 미들웨어 워커에서 호출되어,
종합 컨텍스트의 '음성 감정' 신호를 제공한다.
"""
from emotion_model.infer import EmotionRecognizer, analyze_emotion, LABELS

__all__ = ["EmotionRecognizer", "analyze_emotion", "LABELS"]
