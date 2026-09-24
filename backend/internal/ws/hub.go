package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
	"livepoll-backend/internal/db"
)

// Hub keeps track of which WebSocket connections are watching which poll,
// and relays every Redis Pub/Sub message on "poll:<id>" out to those
// connections. This is the last leg of the real-time pipeline:
//
//   vote -> Mongo write -> Redis INCR -> Redis PUBLISH -> Hub -> browsers
type Hub struct {
	redis *db.RedisStore

	mu      sync.RWMutex
	clients map[string]map[*websocket.Conn]bool // pollID -> set of conns
}

func NewHub(redisStore *db.RedisStore) *Hub {
	return &Hub{
		redis:   redisStore,
		clients: make(map[string]map[*websocket.Conn]bool),
	}
}

func (h *Hub) Register(pollID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[pollID] == nil {
		h.clients[pollID] = make(map[*websocket.Conn]bool)
	}
	h.clients[pollID][conn] = true
}

func (h *Hub) Unregister(pollID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.clients[pollID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.clients, pollID)
		}
	}
	_ = conn.Close()
}

func (h *Hub) broadcast(pollID string, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range h.clients[pollID] {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			log.Printf("ws write error (poll %s): %v", pollID, err)
			// Drop is handled by the read loop noticing the closed conn.
		}
	}
}

// SubscribeAll opens ONE Redis subscription to the "poll:*" pattern for the
// lifetime of the process, and fans every message out to whichever local
// WebSocket clients are watching that specific poll. Using a pattern
// subscription (instead of one per poll) keeps this cheap regardless of
// how many polls are active, and — importantly — means this also works
// correctly if the backend is later scaled to multiple instances: every
// instance sees every publish and only forwards to the clients connected
// to it.
func (h *Hub) SubscribeAll(ctx context.Context) {
	pubsub := h.redis.Client.PSubscribe(ctx, "poll:*")
	ch := pubsub.Channel()

	go func() {
		defer pubsub.Close()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				h.handleMessage(msg)
			}
		}
	}()
}

func (h *Hub) handleMessage(msg *redis.Message) {
	// Channel name is "poll:<id>"; strip the prefix to get the poll id.
	pollID := msg.Channel[len("poll:"):]
	var probe struct {
		PollID string `json:"pollId"`
	}
	if err := json.Unmarshal([]byte(msg.Payload), &probe); err == nil && probe.PollID != "" {
		pollID = probe.PollID
	}
	h.broadcast(pollID, []byte(msg.Payload))
}
