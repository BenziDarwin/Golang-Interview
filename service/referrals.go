package service

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"gorm.io/gorm"
	"patient-registry.com/database"
	"patient-registry.com/middleware"
	"patient-registry.com/models"
)

func CreateReferral(c *fiber.Ctx) error {
	req := new(models.Referral)

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	// Check if facility exists
	facility, err := CheckFacilityExists(req.Patient.FacilityID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while checking facility",
		})
	}
	if facility.ID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Facility not found",
		})
	}

	// Check for existing patient with the same national_id and facility_id
	var existingPatient models.Patient
	err = database.DB.Where("patient_national_id = ? AND facility_id = ?", req.Patient.PatientInfo.NationalId, facility.ID).First(&existingPatient).Error

	var patientID uint

	if err == nil {
		// Patient exists
		patientID = existingPatient.ID

		// Add new submitter if provided
		if len(req.Patient.Submitters) > 0 {
			newSubmitter := models.Submitter{
				Name:      req.Patient.Submitters[0].Name,
				Title:     req.Patient.Submitters[0].Title,
				Email:     req.Patient.Submitters[0].Email,
				PatientID: existingPatient.ID,
			}
			if err := database.DB.Create(&newSubmitter).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to add submitter to existing patient",
				})
			}
		}
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		// Patient doesn't exist, create a new one
		newPatient := models.Patient{
			FacilityID: facility.ID,
			PatientInfo: models.PatientInfo{
				FirstName:  req.Patient.PatientInfo.FirstName,
				MiddleName: req.Patient.PatientInfo.MiddleName,
				LastName:   req.Patient.PatientInfo.LastName,
				DOB:        req.Patient.PatientInfo.DOB,
				Age:        req.Patient.PatientInfo.Age,
				NationalId: req.Patient.PatientInfo.NationalId,
			},
			Submitters:       req.Patient.Submitters,
			RegistrationID:   req.Patient.RegistrationID,
			RegistrationDate: req.Patient.RegistrationDate,
		}

		if err := database.DB.Create(&newPatient).Error; err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Failed to create new patient")
		}
		patientID = newPatient.ID
	} else {
		// Some other DB error
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while checking for patient",
		})
	}

	// Create the referral using the resolved patient ID
	referral := models.Referral{
		ReferredBy:   req.ReferredBy,
		FacilityName: req.FacilityName,
		Diagnosis:    req.Diagnosis,
		ReferredTo:   req.ReferredTo,
		Country:      req.Country,
		City:         req.City,
		Facility:     req.Facility,
		Doctor:       req.Doctor,
		ReferralDate: req.ReferralDate,
		Status:       req.Status,
		PatientID:    patientID,
	}

	if err := database.DB.Create(&referral).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to create referral")
	}

	// Load full referral with associated patient and submitters
	var fullReferral models.Referral
	if err := database.DB.
		Preload("Patient").
		Preload("Patient.Submitters").
		First(&fullReferral, referral.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load created referral",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fullReferral)
}

func GetReferrals(c *fiber.Ctx) error {
	tokenStr := c.Cookies("session_token")
	if tokenStr == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "Missing session token")
	}

	token, err := jwt.ParseWithClaims(tokenStr, &middleware.UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(middleware.DefaultAuthConfig().JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return fiber.NewError(fiber.StatusUnauthorized, "Invalid or expired session token")
	}

	claims, ok := token.Claims.(*middleware.UserClaims)
	if !ok {
		return fiber.NewError(fiber.StatusUnauthorized, "Failed to parse user claims")
	}

	var referrals []models.Referral

	err = database.DB.
		Joins("JOIN patients ON patients.id = referrals.patient_id").
		Joins("JOIN facilities ON facilities.id = patients.facility_id").
		Joins("JOIN facility_identifications ON facility_identifications.facility_id = facilities.id").
		Where("facility_identifications.registry_id = ?", claims.FacilityID). // or .npi depending on your case
		Preload("Patient").
		Order("referrals.id desc").
		Find(&referrals).Error

	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to retrieve referrals")
	}

	return c.JSON(referrals)
}

func GetReferralByPatientID(c *fiber.Ctx) error {
	patientID := c.Params("id")
	if patientID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Patient ID is required")
	}

	var referrals []models.Referral
	err := database.DB.Where("patient_id = ?", patientID).
		Preload("Patient").
		Preload("Patient.Facility").
		Preload("Patient.Submitters").
		Preload("Patient.Referrals").
		Find(&referrals).Error
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to retrieve referrals for patient")
	}

	if len(referrals) == 0 {
		return fiber.NewError(fiber.StatusNotFound, "No referrals found for this patient")
	}

	return c.JSON(referrals)
}
