package vad

import (
	"encoding/binary"
	"math"
	"os"
	"strconv"
)

const (
	DefaultSampleRateHz      = 16000
	DefaultSilenceDurationMs = 1500
	DefaultRMSThreshold      = 100
)

// envFloat / envInt 로 마이크에 맞춰 VAD 를 보정할 수 있다(재컴파일 필요).
// 발화가 단편('몸')으로 잘리면 미들웨어 로그의 `VAD rms=` 값을 보고
//   VAD_RMS_THRESHOLD (말할 때 rms 보다 약간 낮게, 무음 rms 보다 높게)
//   VAD_SILENCE_MS    (문장 사이 호흡을 끊지 않게 늘림, 기본 1500)
// 을 조정한다.
func envFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// Detector is a minimal PCM 16-bit mono VAD for wiring the utterance boundary.
// It is intentionally simple and can be replaced without changing queue code.
type Detector struct {
	sampleRateHz     int
	silenceTargetMs  int
	rmsThreshold     float64
	hasSpeech        bool
	silenceElapsedMs int
}

func NewDetector() *Detector {
	return &Detector{
		sampleRateHz:    DefaultSampleRateHz,
		silenceTargetMs: envInt("VAD_SILENCE_MS", DefaultSilenceDurationMs),
		rmsThreshold:    envFloat("VAD_RMS_THRESHOLD", DefaultRMSThreshold),
	}
}

// Observe returns true when a speech segment has ended after enough silence.
func (d *Detector) Observe(chunk []byte) bool {
	if len(chunk) < 2 {
		return false
	}

	if rms16LE(chunk) >= d.rmsThreshold {
		d.hasSpeech = true
		d.silenceElapsedMs = 0
		return false
	}

	if !d.hasSpeech {
		return false
	}

	d.silenceElapsedMs += durationMs(chunk, d.sampleRateHz)
	if d.silenceElapsedMs < d.silenceTargetMs {
		return false
	}

	d.Reset()
	return true
}

func (d *Detector) Reset() {
	d.hasSpeech = false
	d.silenceElapsedMs = 0
}

func durationMs(chunk []byte, sampleRateHz int) int {
	samples := len(chunk) / 2
	if samples == 0 || sampleRateHz <= 0 {
		return 0
	}

	return samples * 1000 / sampleRateHz
}

// RMS returns the root mean square energy of a PCM 16-bit little-endian chunk.
func RMS(chunk []byte) float64 { return rms16LE(chunk) }

func rms16LE(chunk []byte) float64 {
	sampleCount := len(chunk) / 2
	if sampleCount == 0 {
		return 0
	}

	var sumSquares float64
	for i := 0; i+1 < len(chunk); i += 2 {
		sample := int16(binary.LittleEndian.Uint16(chunk[i : i+2]))
		value := float64(sample)
		sumSquares += value * value
	}

	return math.Sqrt(sumSquares / float64(sampleCount))
}
