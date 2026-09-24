package handlers

import (
  "log"
  "net/http"
  "strings"

  "github.com/gin-gonic/gin"
  "github.com/gorilla/websocket"
  "livepoll-backend/internal/ws"
)

type SocketHandler struct {
  Hub *ws.Hub
  FrontendURL string
}

var upgrader=websocket.Upgrader{
  ReadBufferSize:1024,
  WriteBufferSize:1024,
}

func (s *SocketHandler) LivePoll(c *gin.Context){
  origin:=c.GetHeader("Origin")
  if origin!="" && strings.TrimRight(origin,"/")!=strings.TrimRight(s.FrontendURL,"/") {
    c.JSON(http.StatusForbidden,gin.H{"error":"websocket origin not allowed"})
    return
  }
  conn,err:=upgrader.Upgrade(c.Writer,c.Request,nil)
  if err!=nil{log.Printf("ws upgrade failed: %v",err);return}
  s.Hub.Register(c.Param("id"),conn)
  go func(){
    defer s.Hub.Unregister(c.Param("id"),conn)
    for{if _,_,err:=conn.ReadMessage();err!=nil{return}}
  }()
}
