"""사투리 STT 추론 모듈 — 미들웨어/파이프라인 워커가 import 하는 진입점.

emotion_model/infer.py 의 EmotionRecognizer 와 동일한 패턴:
모델(siyeonsung/whisper-korean-dialect, Whisper-large-v3-turbo + LoRA 병합본)을
인스턴스 생성 시 1회만 로드하고 transcribe() 를 반복 호출한다.

예:
    from stt_model.infer import DialectTranscriber
    stt = DialectTranscriber()                 # 프로세스 시작 시 1회 (모델 로드, GPU 권장)
    text = stt.transcribe_pcm16(pcm_bytes)      # 발화마다 (PCM 16bit/16kHz/mono)
    # 또는
    text = stt.transcribe_file("utt.wav")

모델은 HF Hub 공개 repo 라 토큰 불필요. 사투리 음성 -> 표준어 텍스트.
"""
import os

import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

DEFAULT_MODEL_ID = os.environ.get("STT_MODEL_ID", "siyeonsung/whisper-korean-dialect")
SR = 16000


class DialectTranscriber:
    """whisper-korean-dialect 래퍼. 모델 1회 로드 + transcribe() 제공."""

    def __init__(self, model_id: str = DEFAULT_MODEL_ID, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.processor = WhisperProcessor.from_pretrained(model_id)
        self.model = WhisperForConditionalGeneration.from_pretrained(
            model_id,
            dtype=self.dtype,
            device_map="auto" if self.device == "cuda" else None,
        ).eval()
        if self.device != "cuda":
            self.model.to(self.device)
        # transformers 5.x 는 forced_decoder_ids 대신 generate(language=, task=) 사용.
        # 잔존 forced_decoder_ids 가 있으면 generate 와 충돌하므로 비운다.
        if getattr(self.model.generation_config, "forced_decoder_ids", None):
            self.model.generation_config.forced_decoder_ids = None

    @torch.no_grad()
    def transcribe(self, audio: np.ndarray, sr: int = SR) -> str:
        """float32 mono 오디오(권장 16kHz) -> 표준어 텍스트."""
        if sr != SR:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=SR)
        inputs = self.processor.feature_extractor(
            [audio], sampling_rate=SR, return_tensors="pt"
        ).to(self.model.device, dtype=self.dtype)
        try:
            generated = self.model.generate(
                **inputs, language="korean", task="transcribe", max_new_tokens=225
            )
        except TypeError:
            # 구버전 transformers 호환 (language/task 미지원)
            generated = self.model.generate(**inputs, max_new_tokens=225)
        text = self.processor.tokenizer.batch_decode(generated, skip_special_tokens=True)[0]
        return text.strip()

    def transcribe_pcm16(self, pcm_bytes: bytes, sr: int = SR) -> str:
        """PCM 16bit little-endian mono 바이트 -> 표준어 텍스트 (미들웨어 audio_data 형식)."""
        audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        if audio.size == 0:
            return ""
        return self.transcribe(audio, sr)

    def transcribe_file(self, path: str) -> str:
        import soundfile as sf
        audio, sr = sf.read(path, dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        return self.transcribe(audio, sr)


# 모듈 단위 싱글톤 (함수형으로 쓰고 싶을 때)
_TRANSCRIBER: DialectTranscriber | None = None


def transcribe_pcm16(pcm_bytes: bytes, sr: int = SR) -> str:
    global _TRANSCRIBER
    if _TRANSCRIBER is None:
        _TRANSCRIBER = DialectTranscriber()
    return _TRANSCRIBER.transcribe_pcm16(pcm_bytes, sr)
