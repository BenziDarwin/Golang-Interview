package service

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"patient-registry.com/database"
	"patient-registry.com/middleware"
	"patient-registry.com/models"
)

func CreateAdmin(username, password, email string, DB *gorm.DB) error {
	// Check if admin with the given email already exists
	var existingAdmin models.Admin
	if err := DB.Where("email = ?", email).First(&existingAdmin).Error; err == nil {
		// Admin found, return conflict error
		return fmt.Errorf("admin with email %s already exists", email)
	} else if err != gorm.ErrRecordNotFound {
		// An actual DB error occurred (not just not found)
		return err
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Create the new admin
	admin := models.Admin{
		Username: username,
		Password: hashedPassword,
		Email:    email,
	}

	if result := DB.Create(&admin); result.Error != nil {
		return result.Error
	}

	return nil
}

func LoginAdmin(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input",
		})
	}

	var admin models.Admin
	err := database.DB.
		Where("email = ?", req.Email).First(&admin).Error
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	// ✅ Set cookie using middleware helper
	token, err := middleware.CreateSession(c, admin.Username, admin.Email, strconv.FormatUint(uint64(admin.ID), 10), "admin")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create session",
		})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"admin": admin,
	})
}
