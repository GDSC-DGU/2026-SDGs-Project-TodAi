package queue

// Topology keeps queue names configurable because the final Python worker
// contract may still change.
type Topology struct {
	EmotionQueue string
	STTQueue     string
	ReplyQueue   string
	// UserReplyQueue 는 fast track 대답을 사용자 WS 로 되돌리기 위한 큐.
	// NewTopology 시그니처 유지를 위해 별도 필드로 두고 main 에서 설정한다(빈 값이면 미사용).
	UserReplyQueue string
}

func NewTopology(emotionQueue, sttQueue, replyQueue string) Topology {
	return Topology{
		EmotionQueue: emotionQueue,
		STTQueue:     sttQueue,
		ReplyQueue:   replyQueue,
	}
}

func (t Topology) Queues() []string {
	queues := []string{t.EmotionQueue, t.STTQueue, t.ReplyQueue}
	if t.UserReplyQueue != "" {
		queues = append(queues, t.UserReplyQueue)
	}
	return queues
}
