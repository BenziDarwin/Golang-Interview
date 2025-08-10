package main

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"patient-registry.com/database"
	"patient-registry.com/routes"
	"patient-registry.com/service"
)

func main() {
	godotenv.Load()

	app := fiber.New(fiber.Config{
		ReadBufferSize:           16384,
		BodyLimit:                10 * 1024 * 1024,
		ReadTimeout:              30 * time.Second,
		DisableDefaultDate:       true,
		DisableHeaderNormalizing: false,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			fmt.Printf("Error: %v, Code: %d, Path: %s\n", err, code, c.Path())
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// Logging middleware
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path}\n",
	}))

	// CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:6060",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-CSRF-Token",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
		MaxAge:       86400,
	}))

	// CSRF middleware
	app.Use(csrf.New(csrf.Config{
		KeyLookup:      "header:X-CSRF-Token",
		CookieName:     "csrf_",
		CookieSameSite: "Strict",
		Expiration:     24 * time.Hour,
		CookieSecure:   false,
		ContextKey:     "csrf", // store in context for handler use
	}))

	app.Use(func(c *fiber.Ctx) error {
		if token := c.Locals("csrf"); token != nil {
			c.Set("X-CSRF-Token", fmt.Sprintf("%v", token))
		}
		return c.Next()
	})

	// Large headers protection
	app.Use(func(c *fiber.Ctx) error {
		if len(c.Request().Header.RawHeaders()) > 8192 {
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
