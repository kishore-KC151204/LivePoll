package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"livepoll-backend/internal/db"
	"livepoll-backend/internal/models"
)

type voteRequest struct {
	OptionID string `json:"optionId" binding:"required"`
	VoterID  string `json:"voterId" binding:"required,min=8,max=100"`
}

// Vote is the heart of the "core problem statement": validate -> persist to
// Mongo -> atomically increment in Redis -> publish on the poll's Redis
// channel -> the Hub relays that to every WebSocket client -> React updates
// with no refresh. See README "Real-time architecture" for the full diagram.
func (h *PollHandler) Vote(c *gin.Context) {
	var req voteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	poll, status, err := h.fetchPoll(c.Param("id"))
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	if poll.Status != models.PollActive {
		c.JSON(http.StatusConflict, gin.H{"error": "this poll is closed and no longer accepting votes"})
		return
	}

	var matchedOption *models.PollOption
	for i := range poll.Options {
		if poll.Options[i].ID == req.OptionID {
			matchedOption = &poll.Options[i]
			break
		}
	}
	if matchedOption == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid option for this poll"})
		return
	}

	ctx := context.Background()

	// --- Duplicate-vote protection, two layers ---
	// 1. Fast path: Redis SET of voterIds who already voted on this poll.
	//    SADD returns 0 if the member already existed.
	added, err := h.Redis.Client.SAdd(ctx, db.VotedSetKey(poll.ID.Hex()), req.VoterID).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "vote service unavailable, try again"})
		return
	}
	if added == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "you have already voted on this poll"})
		return
	}

	// 2. Durable path: a unique Mongo index on (pollId, voterId) is the
	//    real source of truth, in case Redis state was ever lost/reset.
	voteDoc := models.Vote{
		PollID:    poll.ID,
		OptionID:  req.OptionID,
		VoterID:   req.VoterID,
		CreatedAt: time.Now().UTC(),
	}
	_, err = h.Store.Votes.InsertOne(ctx, voteDoc)
	if mongo.IsDuplicateKeyError(err) {
		// Redis said "new" but Mongo disagrees (e.g. Redis was flushed) —
		// trust Mongo, undo the Redis add, and reject.
		h.Redis.Client.SRem(ctx, db.VotedSetKey(poll.ID.Hex()), req.VoterID)
		c.JSON(http.StatusConflict, gin.H{"error": "you have already voted on this poll"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record vote"})
		return
	}

	// --- Atomic live counter (Redis INCR — race-safe under concurrent votes) ---
	if err := h.Redis.Client.Incr(ctx, db.VoteCounterKey(poll.ID.Hex(), req.OptionID)).Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update live count"})
		return
	}

	// Mongo counter updated too, so counts are correct even if Redis is
	// later flushed/restarted (durability, requirement #13).
	_, err = h.Store.Polls.UpdateOne(ctx,
		bson.M{"_id": poll.ID, "options.id": req.OptionID},
		bson.M{"$inc": bson.M{"options.$.voteCount": 1}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to persist updated count"})
		return
	}

	// --- Publish for real-time fan-out ---
	event, err := h.buildResultsEvent(poll.ID)
	if err == nil {
		h.publish(poll.ID.Hex(), event)
	}

	c.JSON(http.StatusOK, gin.H{"message": "vote recorded", "results": event})
}

// buildResultsEvent reads live counts. Redis is checked first (fast,
// always current); Mongo's voteCount is the fallback if a key expired or
// Redis was reset, so results are correct either way.
func (h *PollHandler) buildResultsEvent(pollID primitive.ObjectID) (models.PollResultsEvent, error) {
	ctx := context.Background()
	var poll models.Poll
	err := h.Store.Polls.FindOne(ctx, bson.M{"_id": pollID}).Decode(&poll)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return models.PollResultsEvent{}, errors.New("poll not found")
	}
	if err != nil {
		return models.PollResultsEvent{}, err
	}

	var total int64
	options := make([]models.PollOption, len(poll.Options))
	for i, opt := range poll.Options {
		count, redisErr := h.Redis.Client.Get(ctx, db.VoteCounterKey(pollID.Hex(), opt.ID)).Int64()
		if redisErr != nil {
			count = opt.VoteCount // fall back to durable Mongo count
		}
		options[i] = models.PollOption{ID: opt.ID, Text: opt.Text, VoteCount: count}
		total += count
	}

	return models.PollResultsEvent{
		Type:    "results",
		PollID:  pollID.Hex(),
		Options: options,
		Total:   total,
		Status:  poll.Status,
	}, nil
}

func (h *PollHandler) publish(pollID string, event models.PollResultsEvent) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.Redis.Client.Publish(context.Background(), "poll:"+pollID, payload)
}

