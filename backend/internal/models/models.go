package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User is a registered account. Only account holders can create/manage polls.
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"passwordHash" json:"-"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}

// PollOption is one selectable answer on a poll. VoteCount is a denormalized
// counter kept in sync with Redis (source of truth for "live") and MongoDB
// (source of truth for durability / restart survival).
type PollOption struct {
	ID        string `bson:"id" json:"id"`
	Text      string `bson:"text" json:"text"`
	VoteCount int64  `bson:"voteCount" json:"voteCount"`
}

type PollStatus string

const (
	PollActive PollStatus = "ACTIVE"
	PollClosed PollStatus = "CLOSED"
)

// Poll is the durable poll document stored in MongoDB.
type Poll struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Question  string             `bson:"question" json:"question"`
	Options   []PollOption       `bson:"options" json:"options"`
	OwnerID   primitive.ObjectID `bson:"ownerId" json:"ownerId"`
	Status    PollStatus         `bson:"status" json:"status"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	ClosedAt  *time.Time         `bson:"closedAt,omitempty" json:"closedAt,omitempty"`
}

// Vote is an individual vote record, kept for audit / duplicate-detection
// durability (Redis handles the fast-path duplicate check; this is the
// permanent record so results survive a Redis flush or restart).
type Vote struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID    primitive.ObjectID `bson:"pollId" json:"pollId"`
	OptionID  string             `bson:"optionId" json:"optionId"`
	VoterID   string             `bson:"voterId" json:"voterId"` // anonymous device/session id, see README
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// PollResultsEvent is what gets published on the poll's Redis channel and
// broadcast to every WebSocket client watching that poll.
type PollResultsEvent struct {
	Type      string       `json:"type"` // "results" | "closed"
	PollID    string       `json:"pollId"`
	Options   []PollOption `json:"options"`
	Total     int64        `json:"total"`
	Status    PollStatus   `json:"status"`
}
