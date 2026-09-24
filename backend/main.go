package main

import (
	"context"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"livepoll-backend/internal/config"
	"livepoll-backend/internal/db"
	"livepoll-backend/internal/handlers"
	"livepoll-backend/internal/middleware"
	"livepoll-backend/internal/ws"
)

func main() {
	cfg := config.Load()
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET is required (set it in the environment, never hard-code it)")
	}

	mongoStore, err := db.NewMongoStore(cfg.MongoURI, cfg.MongoDBName)
	if err != nil {
		log.Fatalf("mongo connection failed: %v", err)
	}
	redisStore, err := db.NewRedisStore(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis connection failed: %v", err)
	}

	hub := ws.NewHub(redisStore)
	hub.SubscribeAll(context.Background())

	authHandler := &handlers.AuthHandler{Store: mongoStore, JWTSecret: cfg.JWTSecret}
	pollHandler := &handlers.PollHandler{Store: mongoStore, Redis: redisStore}
	socketHandler := &handlers.SocketHandler{Hub: hub, FrontendURL: cfg.FrontendURL}

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)

		polls := api.Group("/polls")
		polls.POST("", middleware.RequireAuth(cfg.JWTSecret), pollHandler.CreatePoll)
		polls.GET("", middleware.RequireAuth(cfg.JWTSecret), pollHandler.ListMyPolls)
		polls.GET("/:id", pollHandler.GetPoll)                 // public: audience needs this
		polls.GET("/:id/results", pollHandler.GetResults)      // public snapshot
		polls.GET("/:id/live", socketHandler.LivePoll)         // public websocket
		polls.POST("/:id/vote", pollHandler.Vote)              // public: anonymous audience voting
		polls.POST("/:id/close", middleware.RequireAuth(cfg.JWTSecret), pollHandler.ClosePoll)
	}

	router.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	log.Printf("LivePoll backend listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
