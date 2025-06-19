package middleware

import (
	"crypto/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

// AuthConfig holds configuration for authentication middleware
type AuthConfig struct {
	JWTSecret       string
	CookieName      string
	LoginRedirect   string
	SessionDuration time.Duration
}

// DefaultAuthConfig returns default configuration
func DefaultAuthConfig() AuthConfig {
	return AuthConfig{
		JWTSecret:       getEnv("JWT_SECRET_KEY", "jwt123"),
		CookieName:      "session_token",
		LoginRedirect:   "/login.html",
		SessionDuration: 7 * 24 * time.Hour, // 7 days
	}
}

// UserClaims represents JWT claims structure
type UserClaims struct {
	UserID     string `json:"user_id"`
	UserName   string `json:"user_name"`
	Role       string `json:"role"`
	FacilityID string `json:"facility_id"`
	jwt.RegisteredClaims
}

// Protected pages that require authentication
var protectedPages = map[string]bool{
	"register-cancer-patient.html":      true,
	"cancer-patients.html":              true,
	"register-sickle-cell-patient.html": true,
	"sickle-cell-patients.html":         true,
	"external-referrals.html":           true,
	"register-external-referral.html":   true,
	"cancer-patient-detail.html":        true,
	"sickle-cell-patient-detail.html":   true,
	"admin.html":                        true,
	"dashboard.html":                    true,
	"reports.html":                      true,
}

// Public pages that are always accessible
var publicPages = map[string]bool{
	"index.html":             true,
	"check-facility.html":    true,
	"register-facility.html": true,
	"login.html":             true,
	"about.html":             true,
}

// Admin-only pages
var adminPages = map[string]bool{
	"admin.html": true,
}

// AuthMiddleware creates authentication middleware
func AuthMiddleware(config ...AuthConfig) fiber.Handler {
	cfg := DefaultAuthConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		// Get the requested file path
		requestPath := c.Path()
		fileName := filepath.Base(requestPath)

		// Handle root path
		if requestPath == "/" || requestPath == "" {
			fileName = "index.html"
		}

		// Skip middleware for API routes and assets
		if strings.HasPrefix(requestPath, "/api/") ||
			strings.HasPrefix(requestPath, "/assets/") ||
			strings.HasPrefix(requestPath, "/css/") ||
			strings.HasPrefix(requestPath, "/js/") ||
			strings.HasPrefix(requestPath, "/images/") ||
			strings.Contains(requestPath, ".css") ||
			strings.Contains(requestPath, ".js") ||
			strings.Contains(requestPath, ".png") ||
			strings.Contains(requestPath, ".jpg") ||
			strings.Contains(requestPath, ".ico") {
			return c.Next()
		}

		// Check if page is public (always allow)
		if publicPages[fileName] {
			return c.Next()
		}

		// Check if page requires authentication
		if protectedPages[fileName] {
			// Verify session token
			token := c.Cookies(cfg.CookieName)
			if token == "" {
				return c.Redirect(cfg.LoginRedirect + "?redirect=" + requestPath)
			}

			// Validate JWT token
			claims, err := validateToken(token, cfg.JWTSecret)
			if err != nil {
				// Clear invalid cookie
				c.Cookie(&fiber.Cookie{
					Name:     cfg.CookieName,
					Value:    "",
					Expires:  time.Now().Add(-time.Hour),
					HTTPOnly: true,
				})
				return c.Redirect(cfg.LoginRedirect + "?redirect=" + requestPath)
			}

			// Check if admin page requires admin role
			if adminPages[fileName] {
				if claims.Role != "admin" && claims.Role != "super_admin" {
					return c.Status(fiber.StatusForbidden).SendString("Access denied: Admin privileges required")
				}
			}

			// Store user info in context for use in templates
			c.Locals("user", claims)
			c.Locals("authenticated", true)
		}

		return c.Next()
	}
}

// SessionHelper creates session management helper middleware
func SessionHelper(config ...AuthConfig) fiber.Handler {
	cfg := DefaultAuthConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		// Add session helper functions to context
		c.Locals("hasValidSession", func() bool {
			token := c.Cookies(cfg.CookieName)
			if token == "" {
				return false
			}
			_, err := validateToken(token, cfg.JWTSecret)
			return err == nil
		})

		c.Locals("getUserRole", func() string {
			token := c.Cookies(cfg.CookieName)
			if token == "" {
				return "guest"
			}
			claims, err := validateToken(token, cfg.JWTSecret)
			if err != nil {
				return "guest"
			}
			return claims.Role
		})

		c.Locals("getUserName", func() string {
			token := c.Cookies(cfg.CookieName)
			if token == "" {
				return ""
			}
			claims, err := validateToken(token, cfg.JWTSecret)
			if err != nil {
				return ""
			}
			return claims.UserName
		})

		return c.Next()
	}
}

// CreateSession creates a new session and sets the cookie
func CreateSession(c *fiber.Ctx, name, email, facility_id string, role string) (string, error) {
	cfg := DefaultAuthConfig()
	// Generate a secure session token
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// Create JWT claims
	claims := UserClaims{
		UserID:     email, // or generate a proper user ID
		UserName:   name,
		Role:       role,
		FacilityID: facility_id,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.SessionDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", err
	}

	// Set multiple cookies for frontend access
	// Session token
	c.Cookie(&fiber.Cookie{
		Name:     cfg.CookieName,
		Value:    tokenString,
		Path:     "/",
		Domain:   "",               // Leave empty for same-origin
		MaxAge:   7 * 24 * 60 * 60, // 7 days in seconds
		Secure:   false,            // Set to true in production with HTTPS
		HTTPOnly: false,            // Allow JavaScript access
		SameSite: "Lax",            // Less restrictive than "Strict"
	})

	// User role
	c.Cookie(&fiber.Cookie{
		Name:     "user_role",
		Value:    role,
		Path:     "/",
		Domain:   "",
		MaxAge:   7 * 24 * 60 * 60,
		Secure:   false,
		HTTPOnly: false,
		SameSite: "Lax",
	})

	// User role
	c.Cookie(&fiber.Cookie{
		Name:     "facility_id",
		Value:    facility_id,
		Path:     "/",
		Domain:   "",
		MaxAge:   7 * 24 * 60 * 60,
		Secure:   false,
		HTTPOnly: false,
		SameSite: "Lax",
	})

	// User name
	c.Cookie(&fiber.Cookie{
		Name:     "user_name",
		Value:    name,
		Path:     "/",
		Domain:   "",
		MaxAge:   7 * 24 * 60 * 60,
		Secure:   false,
		HTTPOnly: false,
		SameSite: "Lax",
	})

	// User email
	c.Cookie(&fiber.Cookie{
		Name:     "user_email",
		Value:    email,
		Path:     "/",
		Domain:   "",
		MaxAge:   7 * 24 * 60 * 60,
		Secure:   false,
		HTTPOnly: false,
		SameSite: "Lax",
	})

	return tokenString, nil
}

// ClearSession removes all session cookies
func ClearSession(c *fiber.Ctx) {
	cookies := []string{"session_token", "user_role", "user_name", "user_email"}

	for _, cookieName := range cookies {
		c.Cookie(&fiber.Cookie{
			Name:     cookieName,
			Value:    "",
			Path:     "/",
			Domain:   "",
			MaxAge:   -1, // Expire immediately
			Secure:   false,
			HTTPOnly: false,
			SameSite: "Lax",
		})
	}
}

// validateToken validates JWT token and returns claims
func validateToken(tokenString, secret string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// RequireAuth middleware for API routes that need authentication
func RequireAuth(config ...AuthConfig) fiber.Handler {
	cfg := DefaultAuthConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		token := c.Cookies(cfg.CookieName)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		claims, err := validateToken(token, cfg.JWTSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Store user info in context
		c.Locals("user", claims)
		c.Locals("userID", claims.UserID)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

// RequireAdmin middleware for admin-only routes
func RequireAdmin(config ...AuthConfig) fiber.Handler {
	cfg := DefaultAuthConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		token := c.Cookies(cfg.CookieName)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		claims, err := validateToken(token, cfg.JWTSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		if claims.Role != "admin" && claims.Role != "super_admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Admin privileges required",
			})
		}

		// Store user info in context
		c.Locals("user", claims)
		c.Locals("userID", claims.UserID)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

// CORS middleware for API routes
func CORS() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization,X-Requested-With")
		c.Set("Access-Control-Allow-Credentials", "true")

		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}

// SecurityHeaders adds security headers
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data:; font-src 'self' https://cdnjs.cloudflare.com")

		return c.Next()
	}
}

// RequestLogger logs incoming requests
func RequestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {

		// Process request
		err := c.Next()

		status := c.Response().StatusCode()

		// You can customize this logging based on your needs
		if status >= 400 {
			// Log errors
		}

		return err
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
