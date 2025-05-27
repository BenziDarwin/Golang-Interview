package main

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"golang-interview.com/database"
	"golang-interview.com/routes"
	"golang-interview.com/service"
)

func main() {
	godotenv.Load()

	// Configure Fiber with increased limits
	app := fiber.New(fiber.Config{
		// Increase the read buffer size (default is 4096)
		ReadBufferSize: 16384, // 16KB

		// Increase body limit if needed (default is 4MB)
		BodyLimit: 10 * 1024 * 1024, // 10MB

		// Set read timeout
		ReadTimeout: 30 * time.Second,

		// Disable server header to reduce header size
		DisableDefaultDate:       true,
		DisableHeaderNormalizing: false,

		// Custom error handler for better debugging
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			// Log the error for debugging
			fmt.Printf("Error: %v, Code: %d, Path: %s\n", err, code, c.Path())

			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Add logging middleware
	app.Use(logger.New(logger.Config{
		// Reduce log format to minimize processing
		Format: "[${time}] ${status} - ${method} ${path}\n",
	}))

	// Optimized CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization", // Be specific about allowed headers
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
		MaxAge:       86400, // Cache preflight requests for 24 hours
	}))

	// Add middleware to handle large headers specifically
	app.Use(func(c *fiber.Ctx) error {
		// Check if headers are too large and provide helpful error
		if len(c.Request().Header.RawHeaders()) > 8192 { // 8KB limit
			return c.Status(fiber.StatusRequestHeaderFieldsTooLarge).JSON(fiber.Map{
				"error": "Request headers too large. Please reduce header size.",
			})
		}
		return c.Next()
	})

	DB := database.ConnectDB()
	service.CreateAdmin(getEnv("ADMIN_USERNAME", "Super Admin"),
		getEnv("ADMIN_PASSWORD", "password=1"),
		getEnv("ADMIN_EMAIL", "admin@gmail.com"), DB)
	routes.SetupRoutes(app)

	fmt.Println("Server starting on port 6060...")
	app.Listen(":6060")
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
