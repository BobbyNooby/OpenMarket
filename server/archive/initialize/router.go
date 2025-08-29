package initialize

import (
	"fmt"
	"time"

	"bobbynooby.dev/openmarket-server/api"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func InitializeRouter() {
	fmt.Println("✅ Starting Gin router...")

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // or your exact origin(s)
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false, // set true only if you send cookies/Authorization with credentials mode
		MaxAge:           12 * time.Hour,
	}))

	apiRoute := router.Group("/api")
	{
		apiRoute.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})

		apiRoute.POST("/userUpdate", api.UserUpdate)
	}

	router.Run(":3000")
}
