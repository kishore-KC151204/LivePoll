package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"livepoll-backend/internal/ws"
)

type SocketHandler struct {
	Hub         *ws.Hub
	FrontendURL string
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// LivePoll — GET /api/polls/:id/live. Upgrades to a WebSocket and joins the
// caller to that poll's room on the Hub. From here on, any vote anywhere
// on this poll (Mongo write -> Redis INCR -> Redis PUBLISH) arrives here
// automatically — no polling loop on the frontend.
func (s *SocketHandler) LivePoll(c *gin.Context) {
	pollID := c.Param("id")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade failed: %v", err)
		return
	}
	s.Hub.Register(pollID, conn)

	// Read loop just detects disconnects (client sends no meaningful
	// messages); on error/close we unregister and stop leaking the conn.
	go func() {
		defer s.Hub.Unregister(pollID, conn)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
}

// CheckOrigin is intentionally permissive here for local dev; in
// production this should be tightened to FrontendURL (see README).
func init() {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
}
