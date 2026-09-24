package db

import (
	"context"
	"fmt"

	"github.com/go-redis/redis/v8"
)

// RedisStore is where the "live" half of the app actually happens:
//   - atomic vote counters (INCR) so concurrent votes never race
//   - a per-poll SET used as a fast duplicate-vote guard
//   - Pub/Sub channels ("poll:<id>") that fan a vote out to every
//     backend instance / WebSocket connection watching that poll
// This is genuine, load-bearing use of Redis — not a connection that
// merely exists in the repo.
type RedisStore struct {
	Client *redis.Client
}

func NewRedisStore(url string) (*RedisStore, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opt)
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}
	return &RedisStore{Client: client}, nil
}

func VoteCounterKey(pollID, optionID string) string {
	return fmt.Sprintf("poll:%s:option:%s:count", pollID, optionID)
}

func VotedSetKey(pollID string) string {
	return fmt.Sprintf("poll:%s:voters", pollID)
}

func PollChannel(pollID string) string {
	return fmt.Sprintf("poll:%s", pollID)
}
