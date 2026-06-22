"""로컬 한국어 TTS (GPU) — 말벗 대답 텍스트 -> 음성.

facebook/mms-tts-kor (VITS, transformers). 한국어는 uroman 로마자화가 필요(is_uroman=True).
모델은 인스턴스 생성 시 1회 로드. synth_to_pcm16() 은 미들웨어/프론트로 보낼 PCM16(16kHz) 바이트를 준다.
"""
import os

import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel

TTS_MODEL_ID = os.getenv("TTS_MODEL_ID", "facebook/mms-tts-kor")


class KoreanTTS:
    def __init__(self, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = VitsModel.from_pretrained(TTS_MODEL_ID).to(self.device).eval()
        self.tok = AutoTokenizer.from_pretrained(TTS_MODEL_ID)
        self.sr = self.model.config.sampling_rate
        self._uroman = None
        if getattr(self.tok, "is_uroman", False):
            import uroman as ur
            self._uroman = ur.Uroman()

    def _prep(self, text: str) -> str:
        text = (text or "").strip()
        if self._uroman is not None and text:
            text = self._uroman.romanize_string(text)
        return text

    @torch.no_grad()
    def synth(self, text: str) -> np.ndarray:
        """텍스트 -> float32 파형 (sr = self.sr)."""
        prepped = self._prep(text)
        if not prepped:
            return np.zeros(1, dtype=np.float32)
        inputs = self.tok(prepped, return_tensors="pt").to(self.device)
        wav = self.model(**inputs).waveform[0].detach().cpu().numpy().astype(np.float32)
        return wav

    def synth_to_pcm16(self, text: str, target_sr: int = 16000) -> bytes:
        """텍스트 -> PCM 16bit LE mono 바이트 (기본 16kHz)."""
        wav = self.synth(text)
        if self.sr != target_sr:
            import librosa
            wav = librosa.resample(wav, orig_sr=self.sr, target_sr=target_sr)
        return np.clip(wav * 32767.0, -32768, 32767).astype("<i2").tobytes()

    def synth_to_wav(self, text: str, path: str):
        import soundfile as sf
        sf.write(path, self.synth(text), self.sr)


_TTS: KoreanTTS | None = None


def synth_to_pcm16(text: str, target_sr: int = 16000) -> bytes:
    global _TTS
    if _TTS is None:
        _TTS = KoreanTTS()
    return _TTS.synth_to_pcm16(text, target_sr)
