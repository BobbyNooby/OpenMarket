package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func UserUpdate(c *gin.Context) {
	var body User
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Println(body)
	c.JSON(http.StatusOK, gin.H{"received": body})
}
