package database

import (
	"fmt"
	"log"
	"os"

	"golang-interview.com/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "yourpassword"),
		getEnv("DB_NAME", "registry_db"),
		getEnv("DB_PORT", "5432"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL:", err)
	}

	err = DB.AutoMigrate(
		&models.Admin{},
		&models.Facility{},
		&models.Contact{},
		&models.Technical{},
		&models.FacilityIdentification{},
		&models.Diagnosis{},
		&models.Referral{},
		&models.Submitter{},
		&models.Patient{},
	)
	if err != nil {
		log.Fatal("AutoMigrate failed:", err)
	}
	return DB
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
