package service

import (
	"fmt"

	"golang-interview.com/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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
