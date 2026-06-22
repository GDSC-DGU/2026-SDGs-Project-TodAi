"""미들웨어 WebSocket 으로 한 발화(utterance)를 흘려보내는 테스트 클라이언트.

미들웨어 VAD(PCM 16bit mono 16kHz, RMS 임계 100, 침묵 1500ms 후 발화 종료)를 만족시키도록
말소리 + [침묵 ~2초] 를 100ms 청크 바이너리 프레임으로 전송한다. 그러면 미들웨어가 발화 1건을
감지해 emotion/STT 큐로 publish 하고 전체 파이프라인이 돈다.

사용:
  python ws_audio_client.py                          # 사인파(STT 의미없음, 배관 테스트용)
  python ws_audio_client.py --wav speech.wav         # 실제 한국어 발화 (실 STT 테스트)
  python ws_audio_client.py ws://host:8090/ws --wav speech.wav
"""
import argparse
import math
import struct
import time

import numpy as np
import websocket  # websocket-client

SR = 16000
CHUNK_MS = 100
SAMPLES_PER_CHUNK = SR * CHUNK_MS // 1000  # 1600
AMPLITUDE = 6000


def sine_chunks():
    out = []
    phase = 0
    for _ in range(10):  # ~1초
        buf = bytearray()
        for i in range(SAMPLES_PER_CHUNK):
            val = int(AMPLITUDE * math.sin(2 * math.pi * 220.0 * (phase + i) / SR))
            buf += struct.pack("<h", val)
        out.append(bytes(buf))
        phase += SAMPLES_PER_CHUNK
    return out


def wav_chunks(path: str):
    import soundfile as sf
    audio, sr = sf.read(path, dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sr != SR:
        import librosa
        audio = librosa.resample(audio, orig_sr=sr, target_sr=SR)
    pcm = np.clip(audio * 32767.0, -32768, 32767).astype("<i2").tobytes()
    chunks = [pcm[i:i + SAMPLES_PER_CHUNK * 2] for i in range(0, len(pcm), SAMPLES_PER_CHUNK * 2)]
    dur = len(audio) / SR
    print(f"loaded wav: {path} | {dur:.1f}s -> {len(chunks)} chunks (16k mono)")
    return chunks


def silence_chunk():
    return b"\x00\x00" * SAMPLES_PER_CHUNK


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?", default="ws://localhost:8090/ws")
    ap.add_argument("--wav", default=None, help="실제 발화 wav 경로 (없으면 사인파)")
    args = ap.parse_args()

    speech = wav_chunks(args.wav) if args.wav else sine_chunks()

    ws = websocket.create_connection(args.url, timeout=10)
    print(f"connected: {args.url}")

    for c in speech:
        if c:
            ws.send_binary(c)
            time.sleep(0.02)
    print(f"sent speech ({'wav' if args.wav else 'sine'})")

    # 침묵 ~2초 (>1500ms VAD 임계) -> 발화 종료 트리거
    for _ in range(20):
        ws.send_binary(silence_chunk())
        time.sleep(0.02)
    print("sent ~2.0s silence -> utterance end should trigger")

    # 미들웨어가 fast track 대답(JSON text frame)을 WS 로 push 할 때까지 대기/수신
    import json
    import base64
    import numpy as np
    import soundfile as sf
    ws.settimeout(40)
    print("waiting for 토닥이 reply over WS ...")
    try:
        while True:
            msg = ws.recv()
            if isinstance(msg, bytes):
                continue
            data = json.loads(msg)
            if data.get("type") == "reply":
                print(f"\n[토닥이 대답] {data.get('text')}")
                ab64 = data.get("audio_b64") or ""
                if ab64:
                    pcm = base64.b64decode(ab64)
                    wav = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
                    sr = data.get("sample_rate") or 16000
                    sf.write("reply_out.wav", wav, sr)
                    print(f"[음성] reply_out.wav 저장 ({len(wav)/sr:.1f}s, {sr}Hz)")
                break
    except Exception as exc:  # noqa: BLE001
        print(f"(no reply received: {exc})")

    ws.close()
    print("closed.")


if __name__ == "__main__":
    main()
