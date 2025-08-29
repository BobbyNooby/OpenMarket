package api

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

//
// ──────────────────────────────────────────────────────────────────────────────
//  Go ENUMS (string-backed) + Scanner/Valuer
// ──────────────────────────────────────────────────────────────────────────────
//

type VoteType string

const (
	VoteUp   VoteType = "upvote"
	VoteDown VoteType = "downvote"
)

func (e VoteType) Valid() bool { return e == VoteUp || e == VoteDown }
func (e VoteType) Value() (driver.Value, error) {
	if !e.Valid() {
		return nil, fmt.Errorf("invalid VoteType %q", e)
	}
	return string(e), nil
}
func (e *VoteType) Scan(value any) error {
	if value == nil {
		*e = ""
		return nil
	}
	var s string
	switch v := value.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("cannot scan %T into VoteType", value)
	}
	t := VoteType(strings.ToLower(s))
	if !t.Valid() {
		return fmt.Errorf("invalid VoteType %q", s)
	}
	*e = t
	return nil
}

type PayingType string

const (
	PayingEach  PayingType = "each"
	PayingTotal PayingType = "total"
)

func (e PayingType) Valid() bool { return e == PayingEach || e == PayingTotal }
func (e PayingType) Value() (driver.Value, error) {
	if !e.Valid() {
		return nil, fmt.Errorf("invalid PayingType %q", e)
	}
	return string(e), nil
}
func (e *PayingType) Scan(value any) error {
	if value == nil {
		*e = ""
		return nil
	}
	var s string
	switch v := value.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("cannot scan %T into PayingType", value)
	}
	t := PayingType(strings.ToLower(s))
	if !t.Valid() {
		return fmt.Errorf("invalid PayingType %q", s)
	}
	*e = t
	return nil
}

type OrderType string

const (
	OrderBuy  OrderType = "buy"
	OrderSell OrderType = "sell"
)

func (e OrderType) Valid() bool { return e == OrderBuy || e == OrderSell }
func (e OrderType) Value() (driver.Value, error) {
	if !e.Valid() {
		return nil, fmt.Errorf("invalid OrderType %q", e)
	}
	return string(e), nil
}
func (e *OrderType) Scan(value any) error {
	if value == nil {
		*e = ""
		return nil
	}
	var s string
	switch v := value.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("cannot scan %T into OrderType", value)
	}
	t := OrderType(strings.ToLower(s))
	if !t.Valid() {
		return fmt.Errorf("invalid OrderType %q", s)
	}
	*e = t
	return nil
}

//
// ──────────────────────────────────────────────────────────────────────────────
//  Schemas (DTO-friendly)
// ──────────────────────────────────────────────────────────────────────────────
//

type DefaultIdentifier struct {
	ID        string    `db:"id" json:"id"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type GenericItem struct {
	DefaultIdentifier
	Name        string  `db:"name" json:"name"`
	Description *string `db:"description" json:"description,omitempty"`
	WikiLink    *string `db:"wiki_link" json:"wiki_link,omitempty"`
	ImageURL    *string `db:"image_url" json:"image_url,omitempty"`
}

type Item = GenericItem
type Currency = GenericItem

type User struct {
	DefaultIdentifier
	DiscordID      string     `db:"discord_id" json:"discord_id"`
	Username       string     `db:"username" json:"username"`
	DisplayName    string     `db:"display_name" json:"display_name"`
	IsActive       bool       `db:"is_active" json:"is_active"`
	AvatarURL      *string    `db:"avatar_url" json:"avatar_url,omitempty"`
	Description    *string    `db:"description" json:"description,omitempty"`
	LastActivityAt *time.Time `db:"last_activity_at" json:"last_activity_at,omitempty"`
}

type ProfileVote struct {
	DefaultIdentifier
	ProfileUserID string   `db:"profile_user_id" json:"profile_user_id"` // the user being voted on
	VoterUserID   string   `db:"voter_user_id" json:"voter_user_id"`
	Type          VoteType `db:"type" json:"type"` // 'upvote' | 'downvote'
}

type ProfileComment struct {
	DefaultIdentifier
	ProfileUserID string `db:"profile_user_id" json:"profile_user_id"` // profile owner
	AuthorUserID  string `db:"author_user_id" json:"author_user_id"`   // commenter
	Content       string `db:"content" json:"content"`
}

type MarketOrder struct {
	DefaultIdentifier
	AuthorID        string     `db:"author_id" json:"author_id"`
	RequestedItemID string     `db:"requested_item_id" json:"requested_item_id"`
	Amount          float64    `db:"amount" json:"amount"`           // units of requested_item
	PayingType      PayingType `db:"paying_type" json:"paying_type"` // 'each' | 'total'
	OrderType       OrderType  `db:"order_type" json:"order_type"`   // 'buy'  | 'sell'
}

type OfferedItem struct {
	OrderID string  `db:"order_id" json:"order_id"`
	ItemID  string  `db:"item_id" json:"item_id"`
	Amount  float64 `db:"amount" json:"amount"`
}

type OfferedCurrency struct {
	OrderID    string  `db:"order_id" json:"order_id"`
	CurrencyID string  `db:"currency_id" json:"currency_id"`
	Amount     float64 `db:"amount" json:"amount"`
}

//
// ──────────────────────────────────────────────────────────────────────────────
//  Schema Creation (SQL)
// ──────────────────────────────────────────────────────────────────────────────
//

func InitDBSchemas(ctx context.Context, db *sql.DB) error {
	stmts := []string{
		// UUIDs & helpers
		`CREATE EXTENSION IF NOT EXISTS pgcrypto;`,

		// Enums (Postgres)
		`DO $$
		BEGIN
		  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_type') THEN
		    CREATE TYPE vote_type AS ENUM ('upvote','downvote');
		  END IF;
		END$$;`,

		`DO $$
		BEGIN
		  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paying_type') THEN
		    CREATE TYPE paying_type AS ENUM ('each','total');
		  END IF;
		END$$;`,

		`DO $$
		BEGIN
		  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
		    CREATE TYPE order_type AS ENUM ('buy','sell');
		  END IF;
		END$$;`,

		// Users
		`CREATE TABLE IF NOT EXISTS users (
		  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
		  created_at       timestamptz NOT NULL DEFAULT now(),
		  discord_id       text NOT NULL UNIQUE,
		  username         text NOT NULL,
		  display_name     text NOT NULL,
		  is_active        boolean NOT NULL DEFAULT true,
		  last_activity_at timestamptz,
		  avatar_url       text,
		  description      text
		);`,
		`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);`,

		// Items & Currencies (GenericItem shape)
		`CREATE TABLE IF NOT EXISTS items (
		  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
		  created_at  timestamptz NOT NULL DEFAULT now(),
		  name        text NOT NULL,
		  description text,
		  wiki_link   text,
		  image_url   text
		);`,
		`CREATE INDEX IF NOT EXISTS idx_items_name ON items (name);`,

		`CREATE TABLE IF NOT EXISTS currencies (
		  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
		  created_at  timestamptz NOT NULL DEFAULT now(),
		  name        text NOT NULL,
		  description text,
		  wiki_link   text,
		  image_url   text
		);`,
		`CREATE INDEX IF NOT EXISTS idx_currencies_name ON currencies (name);`,

		// Market Orders (normalized)
		`CREATE TABLE IF NOT EXISTS market_orders (
		  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
		  created_at         timestamptz NOT NULL DEFAULT now(),
		  author_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
		  requested_item_id  uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
		  amount             numeric NOT NULL CHECK (amount > 0),
		  paying_type        paying_type NOT NULL,
		  order_type         order_type  NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_market_orders_author    ON market_orders (author_id);`,
		`CREATE INDEX IF NOT EXISTS idx_market_orders_item      ON market_orders (requested_item_id);`,
		`CREATE INDEX IF NOT EXISTS idx_market_orders_type_time ON market_orders (order_type, created_at DESC);`,

		`CREATE TABLE IF NOT EXISTS market_order_offered_items (
		  order_id uuid NOT NULL REFERENCES market_orders(id) ON DELETE CASCADE,
		  item_id  uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
		  amount   numeric NOT NULL CHECK (amount > 0),
		  PRIMARY KEY (order_id, item_id)
		);`,
		`CREATE INDEX IF NOT EXISTS idx_mo_offered_items_order ON market_order_offered_items (order_id);`,

		`CREATE TABLE IF NOT EXISTS market_order_offered_currencies (
		  order_id    uuid NOT NULL REFERENCES market_orders(id) ON DELETE CASCADE,
		  currency_id uuid NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
		  amount      numeric NOT NULL CHECK (amount > 0),
		  PRIMARY KEY (order_id, currency_id)
		);`,
		`CREATE INDEX IF NOT EXISTS idx_mo_offered_currencies_order ON market_order_offered_currencies (order_id);`,

		// Profile Votes & Comments
		`CREATE TABLE IF NOT EXISTS profile_votes (
		  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
		  created_at       timestamptz NOT NULL DEFAULT now(),
		  profile_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		  voter_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		  type             vote_type NOT NULL,
		  CONSTRAINT profile_vote_unique UNIQUE (profile_user_id, voter_user_id)
		);`,
		`CREATE INDEX IF NOT EXISTS idx_profile_votes_profile ON profile_votes (profile_user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_profile_votes_voter   ON profile_votes (voter_user_id);`,

		`CREATE TABLE IF NOT EXISTS profile_comments (
		  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
		  created_at       timestamptz NOT NULL DEFAULT now(),
		  profile_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		  author_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		  content          text NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_profile_comments_profile ON profile_comments (profile_user_id, created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_profile_comments_author  ON profile_comments (author_user_id);`,
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	for i, s := range stmts {
		if _, execErr := tx.ExecContext(ctx, s); execErr != nil {
			return fmt.Errorf("exec stmt %d failed: %w\nSQL:\n%s", i+1, execErr, s)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
