package model

import "encoding/json"

const (
	WorkerTypeEmotion = "emotion"
	WorkerTypeSTT     = "stt"

	WorkerStatusSuccess = "success"
	WorkerStatusFailed  = "failed"
)

// WorkerRequest is the message Go sends to Python workers via RabbitMQ.
type WorkerRequest struct {
	JobID         string `json:"job_id"`
	SessionID     string `json:"session_id"`
	ElderID       string `json:"elder_id"`
	CorrelationID string `json:"correlation_id"`
	WorkerType    string `json:"worker_type"`
	ReplyTo       string `json:"reply_to"`
	AudioData     []byte `json:"audio_data"` // PCM 16bit, 16kHz, Mono
	Timestamp     int64  `json:"timestamp"`
}

// WorkerResponse is the response contract for the RabbitMQ reply queue.
type WorkerResponse struct {
	JobID         string          `json:"job_id"`
	SessionID     string          `json:"session_id"`
	ElderID       string          `json:"elder_id"`
	CorrelationID string          `json:"correlation_id"`
	WorkerType    string          `json:"worker_type"`
	Status        string          `json:"status"`
	Result        json.RawMessage `json:"result,omitempty"`
	ErrorMessage  string          `json:"error_message,omitempty"`
	Timestamp     int64           `json:"timestamp"`
}

// WorkerReply is the message Python workers send back via the reply queue.
// Deprecated: use WorkerResponse for new worker integrations.
type WorkerReply struct {
	CorrelationID string      `json:"correlation_id"`
	WorkerType    string      `json:"worker_type"` // "emotion" | "stt"
	Status        string      `json:"status"`      // "ok" | "error" | "partial"
	Result        interface{} `json:"result"`
	ElapsedMs     int64       `json:"elapsed_ms"`
}

// EmotionResult is the output of Worker A (emotion analysis).
type EmotionResult struct {
	Sadness float64 `json:"sadness"`
	Anxiety float64 `json:"anxiety"`
	Neutral float64 `json:"neutral"`
	Joy     float64 `json:"joy"`
}

// STTResult is the output of Worker B (speech-to-text).
type STTResult struct {
	Text string `json:"text"`
}

// UserReply is the assistant (말벗) reply pushed back to the user's WebSocket (fast track).
// 분석 서비스가 todai.user.reply 큐로 publish 하면, 미들웨어가 session_id 로 WS 세션을 찾아 전달한다.
type UserReply struct {
	SessionID  string `json:"session_id"`
	Text       string `json:"text"`
	AudioB64   string `json:"audio_b64,omitempty"`    // PCM16 LE mono base64 (TTS 음성)
	SampleRate int    `json:"sample_rate,omitempty"`  // 오디오 샘플레이트(보통 16000)
}
