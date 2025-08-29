package initialize

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"bobbynooby.dev/openmarket-server/api"
)

func InitializeDB() (*sql.DB, error) {
	connURL := "postgres://admin:wutdabobdoing727wysi@37.27.254.124:5432/openmarket?sslmode=disable"
	fmt.Println(connURL)

	db, err := sql.Open("postgres", connURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
		return nil, err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping db: %v", err)
		return nil, err
	}

	fmt.Println("✅ Connected to PostgreSQL!")
	if err := api.InitDBSchemas(ctx, db); err != nil {
		log.Fatalf("create schema: %v", err)
	}
	fmt.Println("✅ Schema created / verified")

	return db, nil
}
