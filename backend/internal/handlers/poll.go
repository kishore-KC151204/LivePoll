package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"livepoll-backend/internal/db"
	"livepoll-backend/internal/middleware"
	"livepoll-backend/internal/models"
)

type PollHandler struct {
	Store *db.MongoStore
	Redis *db.RedisStore
}

type createPollRequest struct {
	Question string   `json:"question" binding:"required,min=3,max=300"`
	Options  []string `json:"options" binding:"required,min=2,max=10"`
}

type updatePollRequest struct {
	Question string   `json:"question" binding:"required,min=3,max=300"`
	Options  []string `json:"options" binding:"required,min=2,max=10"`
}

func randomOptionID() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// CreatePoll — protected. Every field is validated server-side; client
// validation is UX-only and never trusted.
func (h *PollHandler) CreatePoll(c *gin.Context) {
	var req createPollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	seen := map[string]bool{}
	options := make([]models.PollOption, 0, len(req.Options))
	for _, raw := range req.Options {
		text := strings.TrimSpace(raw)
		if text == "" || len(text) > 200 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "each option must be 1-200 characters"})
			return
		}
		key := strings.ToLower(text)
		if seen[key] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "duplicate option: " + text})
			return
		}
		seen[key] = true
		options = append(options, models.PollOption{ID: randomOptionID(), Text: text, VoteCount: 0})
	}

	userIDHex := c.GetString(middleware.UserIDKey)
	ownerID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	pollID := primitive.NewObjectID()
	poll := models.Poll{
		ID:        pollID,
		Question:  strings.TrimSpace(req.Question),
		Options:   options,
		OwnerID:   ownerID,
		Status:    models.PollActive,
		CreatedAt: time.Now().UTC(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	_, err = h.Store.Polls.InsertOne(ctx, poll)
	if err != nil {
		log.Printf("CreatePoll insert failed owner=%s poll=%s: %v", ownerID.Hex(), pollID.Hex(), err)
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "this poll conflicts with an existing database rule. Try changing the question."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create poll. The database rejected the poll; please try again."})
		return
	}

	c.JSON(http.StatusCreated, poll)
}

// ListMyPolls — protected. Returns only the caller's own polls (dashboard).
func (h *PollHandler) ListMyPolls(c *gin.Context) {
	userIDHex := c.GetString(middleware.UserIDKey)
	ownerID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	cursor, err := h.Store.Polls.Find(context.Background(), bson.M{"ownerId": ownerID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list polls"})
		return
	}
	defer cursor.Close(context.Background())

	polls := []models.Poll{}
	if err := cursor.All(context.Background(), &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read polls"})
		return
	}
	c.JSON(http.StatusOK, polls)
}

// GetPoll — public. Anyone with the link can view/vote; no account needed
// for the audience (documented tradeoff in README).
func (h *PollHandler) GetPoll(c *gin.Context) {
	poll, status, err := h.fetchPoll(c.Param("id"))
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, poll)
}

// UpdatePoll — protected + ownership-checked. Question and options can be edited
// before voting. Once votes exist, the option structure is locked so historical
// vote records can never become ambiguous.
func (h *PollHandler) UpdatePoll(c *gin.Context) {
	pollID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"invalid poll id"}); return }
	ownerID, err := primitive.ObjectIDFromHex(c.GetString(middleware.UserIDKey))
	if err != nil { c.JSON(http.StatusUnauthorized, gin.H{"error":"invalid user"}); return }

	var req updatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":err.Error()}); return }

	var poll models.Poll
	if err := h.Store.Polls.FindOne(context.Background(), bson.M{"_id":pollID,"ownerId":ownerID}).Decode(&poll); err != nil {
		if errors.Is(err,mongo.ErrNoDocuments) { c.JSON(http.StatusNotFound,gin.H{"error":"poll not found"}); return }
		c.JSON(http.StatusInternalServerError,gin.H{"error":"failed to load poll"}); return
	}
	if poll.Status != models.PollActive { c.JSON(http.StatusConflict,gin.H{"error":"closed polls cannot be edited"}); return }

	seen:=map[string]bool{}
	options:=make([]models.PollOption,0,len(req.Options))
	for _, raw:=range req.Options {
		text:=strings.TrimSpace(raw)
		if text=="" || len(text)>200 { c.JSON(http.StatusBadRequest,gin.H{"error":"each option must be 1-200 characters"}); return }
		key:=strings.ToLower(text)
		if seen[key] { c.JSON(http.StatusBadRequest,gin.H{"error":"duplicate option: "+text}); return }
		seen[key]=true
		options=append(options,models.PollOption{ID:randomOptionID(),Text:text})
	}
	votes, err := h.Store.Votes.CountDocuments(context.Background(),bson.M{"pollId":pollID})
	if err != nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"failed to inspect poll votes"}); return }
	if votes>0 {
		if len(options)!=len(poll.Options) { c.JSON(http.StatusConflict,gin.H{"error":"answer choices are locked after the first vote"}); return }
		for i:=range options { if options[i].Text!=poll.Options[i].Text { c.JSON(http.StatusConflict,gin.H{"error":"answer choices are locked after the first vote"}); return } }
		options=poll.Options
	}
	for i:=range options { if i<len(poll.Options) { options[i].VoteCount=poll.Options[i].VoteCount; options[i].ID=poll.Options[i].ID } }

	_, err = h.Store.Polls.UpdateOne(context.Background(),bson.M{"_id":pollID,"ownerId":ownerID},
		bson.M{"$set":bson.M{"question":strings.TrimSpace(req.Question),"options":options}})
	if err != nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"failed to update poll"}); return }
	poll.Question=strings.TrimSpace(req.Question); poll.Options=options
	c.JSON(http.StatusOK,poll)
}

// DeletePoll — protected + ownership-checked. Removes the durable poll and
// its vote records, then clears its Redis live state.
func (h *PollHandler) DeletePoll(c *gin.Context) {
	pollID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil { c.JSON(http.StatusBadRequest,gin.H{"error":"invalid poll id"}); return }
	ownerID, err := primitive.ObjectIDFromHex(c.GetString(middleware.UserIDKey))
	if err != nil { c.JSON(http.StatusUnauthorized,gin.H{"error":"invalid user"}); return }

	res, err := h.Store.Polls.DeleteOne(context.Background(),bson.M{"_id":pollID,"ownerId":ownerID})
	if err != nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"failed to delete poll"}); return }
	if res.DeletedCount==0 { c.JSON(http.StatusNotFound,gin.H{"error":"poll not found"}); return }

	_, _ = h.Store.Votes.DeleteMany(context.Background(),bson.M{"pollId":pollID})
	if h.Redis!=nil {
		for _, optID := range []string{} { _ = optID }
		h.Redis.Client.Del(context.Background(), "poll:"+pollID.Hex()+":voters")
		var oldPoll models.Poll
		_ = oldPoll
	}
	c.JSON(http.StatusOK,gin.H{"message":"poll deleted"})
}

// ClosePoll — protected + ownership-checked server-side. A logged-in user
// can never close someone else's poll just by guessing an ID.
func (h *PollHandler) ClosePoll(c *gin.Context) {
	pollID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid poll id"})
		return
	}
	userIDHex := c.GetString(middleware.UserIDKey)
	ownerID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	now := time.Now().UTC()
	res, err := h.Store.Polls.UpdateOne(context.Background(),
		bson.M{"_id": pollID, "ownerId": ownerID},
		bson.M{"$set": bson.M{"status": models.PollClosed, "closedAt": now}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close poll"})
		return
	}
	if res.MatchedCount == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "poll not found or not owned by you"})
		return
	}

	// Tell every connected viewer immediately: voting has ended.
	results, _ := h.buildResultsEvent(pollID)
	results.Type = "closed"
	results.Status = models.PollClosed
	h.publish(pollID.Hex(), results)

	c.JSON(http.StatusOK, gin.H{"message": "poll closed"})
}

// GetResults — public. Snapshot of current counts (used on initial page
// load, before the WebSocket takes over for live updates).
func (h *PollHandler) GetResults(c *gin.Context) {
	pollID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid poll id"})
		return
	}
	event, err := h.buildResultsEvent(pollID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "poll not found"})
		return
	}
	c.JSON(http.StatusOK, event)
}

func (h *PollHandler) fetchPoll(idHex string) (*models.Poll, int, error) {
	pollID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		return nil, http.StatusBadRequest, errors.New("invalid poll id")
	}
	var poll models.Poll
	err = h.Store.Polls.FindOne(context.Background(), bson.M{"_id": pollID}).Decode(&poll)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, http.StatusNotFound, errors.New("poll not found")
	}
	if err != nil {
		return nil, http.StatusInternalServerError, errors.New("failed to fetch poll")
	}
	return &poll, http.StatusOK, nil
}
