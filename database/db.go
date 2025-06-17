package database

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"patient-registry.com/models"
)

var DB *gorm.DB

func ConnectDB() *gorm.DB {
	// Create variables for default values
	defaultHost := "localhost"
	defaultUser := "postgres"
	defaultPassword := "yourpassword"
	defaultDBName := "registry_db"
	defaultSSLMode := "disable"
	port := getEnv("DB_PORT", nil)

	var dsn string
	if port != "" {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			getEnv("DB_HOST", &defaultHost),
			getEnv("DB_USER", &defaultUser),
			getEnv("DB_PASSWORD", &defaultPassword),
			getEnv("DB_NAME", &defaultDBName),
			port,
			getEnv("DB_SSLMODE", &defaultSSLMode),
		)
	} else {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s sslmode=%s",
			getEnv("DB_HOST", &defaultHost),
			getEnv("DB_USER", &defaultUser),
			getEnv("DB_PASSWORD", &defaultPassword),
			getEnv("DB_NAME", &defaultDBName),
			getEnv("DB_SSLMODE", &defaultSSLMode),
		)
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL:", err)
	}

	err = DB.AutoMigrate(
		&models.Admin{},
		&models.Facility{},
		&models.Contact{},
		&models.Patient{},
		&models.FacilityIdentification{},
		&models.SickleCellPatient{},
		&models.SickleCellDiagnosis{},
		&models.CancerPatient{},
		&models.CancerDiagnosis{},
		&models.Referral{},
		&models.Submitter{},
	)
	if err != nil {
		log.Fatal("AutoMigrate failed:", err)
	}
	return DB
}

func getEnv(key string, fallback *string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	if fallback != nil {
		return *fallback
	}
	return ""
}
