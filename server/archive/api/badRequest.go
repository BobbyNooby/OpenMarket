package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func BadRequest(c *gin.Context, msg string, details any) {
	c.JSON(http.StatusBadRequest, gin.H{
		"message": "Bad request",
	})
}
