"""음성 감정 인식 추론 모듈.

미들웨어/에이전트가 import 해서 재사용하는 진입점.
모델(todai-emotion-wav2vec2, 1.2GB)은 인스턴스 생성 시 1회만 로드한다 —
RabbitMQ 워커처럼 장기 실행 프로세스에서는 EmotionRecognizer 를 한 번만 만들고
predict() 만 반복 호출할 것 (메시지마다 로드 금지).

예:
    from emotion_model.infer import EmotionRecognizer
    rec = EmotionRecognizer()            # 프로세스 시작 시 1회
    out = rec.predict("utterance.wav")   # 메시지마다
    # {'emotion': '슬픔', 'confidence': 0.62,
    #  'probabilities': {'기쁨':0.05, ..., '화남':0.10}}
"""
import os
import numpy as np
import torch
import torch.nn.functional as F
import soundfile as sf
import resampy
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForSequenceClassification

# HF Hub 모델 ID (private repo면 HF_TOKEN 환경변수 필요)
DEFAULT_MODEL_ID = os.environ.get("EMOTION_MODEL_ID", "HyukII/todai-emotion-wav2vec2")

# 로짓 인덱스 i ↔ 감정. config.json의 id2label과 동일 순서.
LABELS = ["기쁨", "놀라움", "두려움", "사랑스러움", "슬픔", "화남"]
KO2EN  = {"기쁨": "Joy", "놀라움": "Surprise", "두려움": "Fear",
          "사랑스러움": "Lovely", "슬픔": "Sadness", "화남": "Anger"}

SR          = 16000
MAX_SEC     = 8
MAX_SAMPLES = SR * MAX_SEC
HOP_SAMPLES = SR * 4        # 8초 초과 클립: 50% 겹침 창
MIN_SAMPLES = SR // 10      # 0.1초 (빈/극단적 짧은 입력 방어)


class EmotionRecognizer:
    """todai-emotion-wav2vec2 래퍼. 모델을 1회 로드하고 predict()를 제공한다."""

    def __init__(self, model_id: str = DEFAULT_MODEL_ID, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.fe = Wav2Vec2FeatureExtractor.from_pretrained(model_id)
        self.model = (Wav2Vec2ForSequenceClassification
                      .from_pretrained(model_id).to(self.device).eval())

    # ── 전처리 (학습과 동일) ──
    def _load_audio(self, path: str) -> np.ndarray:
        audio, file_sr = sf.read(path, dtype="float32", always_2d=False)
        if audio.ndim == 2:
            audio = audio.mean(axis=1)          # mono
        if file_sr != SR:
            audio = resampy.resample(audio, file_sr, SR)
        if len(audio) < MIN_SAMPLES:
            audio = np.pad(audio, (0, MIN_SAMPLES - len(audio)))
        return audio

    def _windows(self, audio: np.ndarray) -> list[np.ndarray]:
        if len(audio) <= MAX_SAMPLES:
            return [audio]
        segs, start = [], 0
        while start < len(audio):
            chunk = audio[start:start + MAX_SAMPLES]
            if len(chunk) >= MIN_SAMPLES:
                segs.append(chunk)
            if start + MAX_SAMPLES >= len(audio):
                break
            start += HOP_SAMPLES
        return segs

    @torch.no_grad()
    def _infer_chunk(self, chunk: np.ndarray) -> np.ndarray:
        inp = self.fe([chunk], sampling_rate=SR, return_tensors="pt",
                      padding=True, return_attention_mask=True)
        logits = self.model(input_values=inp["input_values"].to(self.device),
                            attention_mask=inp["attention_mask"].to(self.device)).logits
        return F.softmax(logits.float(), dim=-1)[0].cpu().numpy()

    def predict(self, audio_path: str) -> dict:
        """오디오 파일 1개의 감정을 예측한다.

        Returns:
            {
              "emotion":       최빈 감정(한국어),
              "emotion_en":    영문,
              "confidence":    top-1 확률,
              "probabilities": {감정: 확률} 6개 (한국어 키),
            }
        8초 초과 클립은 창별 확률을 평균해 종합한다.
        """
        audio = self._load_audio(audio_path)
        probs = np.mean([self._infer_chunk(c) for c in self._windows(audio)], axis=0)
        top = int(probs.argmax())
        return {
            "emotion":       LABELS[top],
            "emotion_en":    KO2EN[LABELS[top]],
            "confidence":    round(float(probs[top]), 4),
            "probabilities": {l: round(float(p), 4) for l, p in zip(LABELS, probs)},
        }


# 모듈 단위 싱글톤 — 함수형으로 쓰고 싶을 때(예: ADK FunctionTool)
_RECOGNIZER: EmotionRecognizer | None = None


def analyze_emotion(audio_path: str) -> dict:
    """한국어 음성 파일의 감정을 분석한다 (지연 로딩 싱글톤).

    Args:
        audio_path: 분석할 오디오 파일 경로(wav/mp3 등, 16kHz로 자동 변환).
    Returns:
        예측 감정과 6개 감정별 확률을 담은 dict.
    """
    global _RECOGNIZER
    if _RECOGNIZER is None:
        _RECOGNIZER = EmotionRecognizer()
    return _RECOGNIZER.predict(audio_path)
