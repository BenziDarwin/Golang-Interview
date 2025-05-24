package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"golang-interview.com/database"
	"golang-interview.com/routes"
)

func main() {
	godotenv.Load()
	app := fiber.New()

	// Add logging middleware
	app.Use(logger.New())

	// Add CORS middleware with default config (you can customize it)
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	database.ConnectDB()
	routes.SetupRoutes(app)

	app.Listen(":6060")
}
