package websocket

import (
	"sync"

	gws "github.com/gorilla/websocket"
)

// Session holds state for a single WebSocket client connection.
type Session struct {
	ID   string
	conn *gws.Conn

	writeMu sync.Mutex // gorilla conn 은 동시 쓰기 불가 — 쓰기를 직렬화
	done    chan struct{}
}

func newSession(id string, conn *gws.Conn) *Session {
	return &Session{
		ID:   id,
		conn: conn,
		done: make(chan struct{}),
	}
}

// Done returns a channel closed when the session ends.
func (s *Session) Done() <-chan struct{} {
	return s.done
}

// Send writes a message to the client (thread-safe). 읽기 루프와 동시 호출 가능.
func (s *Session) Send(messageType int, data []byte) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return s.conn.WriteMessage(messageType, data)
}
