package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/Hyuk-II/todai-middleware/pkg/model"
	amqp "github.com/rabbitmq/amqp091-go"
)

const userReplyConsumerTag = "todai-user-reply-consumer"

// UserReplyHandler 는 사용자에게 전달할 대답을 받아 처리한다(보통 WS push).
type UserReplyHandler func(reply model.UserReply) error

// UserReplyConsumer 는 todai.user.reply 큐에서 fast track 대답을 받아 핸들러로 넘긴다.
type UserReplyConsumer struct {
	channel *amqp.Channel
	queue   string
}

func NewUserReplyConsumer(client *Client, topology Topology) (*UserReplyConsumer, error) {
	if topology.UserReplyQueue == "" {
		return nil, fmt.Errorf("user reply queue not configured")
	}
	channel, err := client.conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("open user reply consumer channel: %w", err)
	}
	return &UserReplyConsumer{channel: channel, queue: topology.UserReplyQueue}, nil
}

func (c *UserReplyConsumer) Close() error {
	if c == nil || c.channel == nil {
		return nil
	}
	return c.channel.Close()
}

func (c *UserReplyConsumer) Consume(ctx context.Context, handler UserReplyHandler) error {
	if handler == nil {
		return fmt.Errorf("user reply handler is required")
	}
	deliveries, err := c.channel.ConsumeWithContext(
		ctx, c.queue, userReplyConsumerTag,
		false, false, false, false, nil,
	)
	if err != nil {
		return fmt.Errorf("consume user reply queue %s: %w", c.queue, err)
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case delivery, ok := <-deliveries:
			if !ok {
				if ctx.Err() != nil {
					return nil
				}
				return fmt.Errorf("user reply delivery channel closed")
			}
			var reply model.UserReply
			if err := json.Unmarshal(delivery.Body, &reply); err != nil {
				log.Printf("reject invalid user reply: %v", err)
				_ = delivery.Reject(false)
				continue
			}
			if err := handler(reply); err != nil {
				// 세션이 없거나(이미 끊김) push 실패는 버린다(재시도 의미 없음).
				log.Printf("user reply delivery skipped | session_id=%s error=%v", reply.SessionID, err)
				_ = delivery.Ack(false)
				continue
			}
			_ = delivery.Ack(false)
		}
	}
}
