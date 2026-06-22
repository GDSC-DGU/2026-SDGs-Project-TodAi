"""미들웨어 WebSocket 으로 한 발화(utterance)를 흘려보내는 테스트 클라이언트.

미들웨어 VAD(PCM 16bit mono 16kHz, RMS 임계 100, 침묵 1500ms 후 발화 종료)를 만족시키도록
  [말소리 ~1초(사인파, RMS>>100)] + [침묵 ~2초(0, 1500ms 초과)]
를 100ms 청크 바이너리 프레임으로 전송한다. 그러면 미들웨어가 발화 1건을 감지해
emotion/STT 큐로 publish 하고 전체 파이프라인이 돈다.

사용: python ws_audio_client.py [ws://localhost:8090/ws]
"""
import math
import struct
import sys
import time

import websocket  # websocket-client

URL = sys.argv[1] if len(sys.argv) > 1 else "ws://localhost:8090/ws"
SR = 16000
CHUNK_MS = 100
SAMPLES_PER_CHUNK = SR * CHUNK_MS // 1000  # 1600
AMPLITUDE = 6000  # int16 사인 진폭 -> RMS ~4200 (임계 100 훨씬 초과)


def sine_chunk(phase: float):
    buf = bytearray()
    freq = 220.0
    for i in range(SAMPLES_PER_CHUNK):
        t = (phase + i) / SR
        val = int(AMPLITUDE * math.sin(2 * math.pi * freq * t))
        buf += struct.pack("<h", val)
    return bytes(buf), phase + SAMPLES_PER_CHUNK


def silence_chunk():
    return b"\x00\x00" * SAMPLES_PER_CHUNK


def main():
    ws = websocket.create_connection(URL, timeout=10)
    print(f"connected: {URL}")

    # 1) 말소리 ~1초 (10 청크)
    phase = 0.0
    for _ in range(10):
        chunk, phase = sine_chunk(phase)
        ws.send_binary(chunk)
        time.sleep(0.02)
    print("sent ~1.0s speech (sine)")

    # 2) 침묵 ~2초 (20 청크 = 2000ms > 1500ms 임계)
    for _ in range(20):
        ws.send_binary(silence_chunk())
        time.sleep(0.02)
    print("sent ~2.0s silence -> utterance end should trigger")

    time.sleep(1.0)  # 미들웨어가 발화 종료 처리/publish 할 시간
    ws.close()
    print("closed. check middleware + analysis_service logs, then DB.")


if __name__ == "__main__":
    main()
