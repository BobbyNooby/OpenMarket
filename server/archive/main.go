package main

import (
	"log"

	"bobbynooby.dev/openmarket-server/initialize"
	_ "github.com/lib/pq"
)

func main() {

	db, err := initialize.InitializeDB()
	if err != nil {
		log.Fatalf("initialize db: %v", err)
	}
	defer db.Close()

	initialize.InitializeRouter()

}
