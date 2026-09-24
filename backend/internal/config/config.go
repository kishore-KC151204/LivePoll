package config

import "os"

// Config holds all environment-driven settings for the service.
// Every value here MUST come from the environment — never hard-code
// secrets or connection strings in source.
type Config struct {
	Port         string
	MongoURI     string
	MongoDBName  string
	RedisURL     string
	JWTSecret    string
	FrontendURL  string
  ResendAPIKey string
  EmailFrom string
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Load reads configuration from the environment. Called once at startup.
func Load() Config {
	return Config{
		Port:        getenv("PORT", "8080"),
		MongoURI:    getenv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDBName: getenv("MONGODB_DB", "livepoll"),
		RedisURL:    getenv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getenv("JWT_SECRET", ""),
		FrontendURL: getenv("FRONTEND_URL", "http://localhost:5173"),
    ResendAPIKey: getenv("RESEND_API_KEY", ""),
    EmailFrom: getenv("EMAIL_FROM", ""),
	}
}
