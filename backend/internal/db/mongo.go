package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoStore wraps the collections the app needs. MongoDB is the durable
// system of record: users, polls, and votes all live here so the app
// survives a full restart with no data loss.
type MongoStore struct {
	Client *mongo.Client
	DB     *mongo.Database
	Users  *mongo.Collection
	Polls  *mongo.Collection
	Votes  *mongo.Collection
}

func NewMongoStore(uri, dbName string) (*MongoStore, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	database := client.Database(dbName)
	store := &MongoStore{
		Client: client,
		DB:     database,
		Users:  database.Collection("users"),
		Polls:  database.Collection("polls"),
		Votes:  database.Collection("votes"),
	}

	if err := store.ensureIndexes(ctx); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *MongoStore) ensureIndexes(ctx context.Context) error {
	_, err := s.Users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}
	// One vote per (pollId, voterId) — this is the durable half of duplicate
	// vote protection; Redis SETs give the fast pre-check.
	_, err = s.Votes.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "pollId", Value: 1}, {Key: "voterId", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return err
}
