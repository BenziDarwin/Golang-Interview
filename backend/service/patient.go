package service

import (
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang-interview.com/database"
	"golang-interview.com/models"
	"gorm.io/gorm"
)

// CreatePatient handles POST /patients
func CreatePatient(c *fiber.Ctx) error {
	req := new(models.PatientCreateRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Validate required fields
	if err := validatePatientRequest(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Check if facility exists
	facility, err := checkFacilityExists(req.FacilityID)
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

	// Check for existing patient with same registration ID if provided
	if req.RegistrationID != "" {
		exists, err := checkExistingPatientByRegistrationID(req.RegistrationID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Database error while checking existing patient",
			})
		}
		if exists {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Patient with this registration ID already exists",
			})
		}
	}

	// Parse DOB
	dob, err := time.Parse("2006-01-02", req.PatientInfo.DOB)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid Date of Birth format. Use YYYY-MM-DD",
		})
	}

	// Set registration date if provided, else now
	registrationDate := time.Now()
	if req.RegistrationDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.RegistrationDate); err == nil {
			registrationDate = parsed
		}
	}

	// Check if patient with this national ID already exists
	var existingPatient models.Patient
	err = database.DB.Where("patient_national_id = ?", req.PatientInfo.NationalId).First(&existingPatient).Error
	if err == nil {
		// Patient exists - only add new submitter
		newSubmitter := models.Submitter{
			Name:      req.Submitter.Name,
			Title:     req.Submitter.Title,
			Email:     req.Submitter.Email,
			PatientID: existingPatient.ID,
		}

		if err := database.DB.Create(&newSubmitter).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to add submitter to existing patient",
			})
		}

		var updatedPatient models.Patient
		if err := database.DB.Preload("Facility").
			Preload("Submitters").
			First(&updatedPatient, existingPatient.ID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to load updated patient",
			})
		}

		return c.Status(fiber.StatusOK).JSON(updatedPatient)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Some other DB error
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while checking for existing patient",
		})
	}

	// No existing patient found - create a new one
	patient := models.Patient{
		FacilityID: strconv.FormatUint(uint64(facility.ID), 10),
		PatientInfo: models.PatientInfo{
			FirstName:  req.PatientInfo.FirstName,
			MiddleName: req.PatientInfo.MiddleName,
			LastName:   req.PatientInfo.LastName,
			DOB:        dob,
			Gender:     req.PatientInfo.Gender,
			NationalId: req.PatientInfo.NationalId,
		},
		Submitters: []models.Submitter{{
			Name:  req.Submitter.Name,
			Title: req.Submitter.Title,
			Email: req.Submitter.Email,
		}},
		RegistrationID:   req.RegistrationID,
		RegistrationDate: registrationDate,
	}

	if err := database.DB.Create(&patient).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create patient",
		})
	}

	var createdPatient models.Patient
	if err := database.DB.Preload("Facility").
		Preload("Submitters").
		First(&createdPatient, patient.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load created patient",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(createdPatient)
}

// GetPatients handles GET /patients
func GetPatients(c *fiber.Ctx) error {
	var patients []models.Patient
	database.DB.
		Preload("Facility").
		Preload("Facility.Identification").
		Preload("Facility.Contacts").
		Preload("Facility.Technical").
		Preload("Diagnosis").
		Preload("Treatments").
		Preload("Submitters").
		Find(&patients)
	return c.JSON(patients)
}

// GetPatientByID handles GET /patients/:id
func GetPatientByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var patient models.Patient
	if err := database.DB.
		Preload("Facility").
		Preload("Facility.Identification").
		Preload("Facility.Contacts").
		Preload("Facility.Technical").
		Preload("Diagnosis").
		Preload("Treatments").
		Preload("Submitters").
		First(&patient, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Patient not found",
		})
	}

	return c.JSON(patient)
}

// DeletePatient handles DELETE /patients/:id
func DeletePatient(c *fiber.Ctx) error {
	id := c.Params("id")

	var patient models.Patient
	if err := database.DB.First(&patient, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Patient not found",
		})
	}

	if err := database.DB.Delete(&patient).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete patient",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Patient deleted successfully",
	})
}

// GetPatientsByFacility handles GET /facilities/:id/patients
func GetPatientsByFacility(c *fiber.Ctx) error {
	facilityID := c.Params("id")

	var patients []models.Patient
	if err := database.DB.
		Where("facility_id = ?", facilityID).
		Preload("Facility").
		Find(&patients).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve patients",
		})
	}

	return c.JSON(patients)
}

// GetPatientByRegistrationID handles GET /patients/registration/:registrationId
func GetPatientByRegistrationID(c *fiber.Ctx) error {
	registrationID := c.Params("registrationId")

	var patients []models.Patient
	likePattern := "%" + registrationID + "%"
	result := database.DB.
		Where("registration_id LIKE ?", likePattern).
		Preload("Facility").
		Find(&patients)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while searching patients",
		})
	}

	return c.JSON(patients)
}

// GetPatientByName handles GET /patients/name/:name
func GetPatientByName(c *fiber.Ctx) error {
	name := c.Params("name")

	var patients []models.Patient
	likePattern := "%" + name + "%"
	result := database.DB.
		Where("patient_first_name LIKE ? OR patient_middle_name LIKE ? OR patient_last_name LIKE ?",
			likePattern, likePattern, likePattern).
		Preload("Facility").
		Find(&patients)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while searching patients",
		})
	}

	return c.JSON(patients)
}

func GetPatientsByFacilityID(c *fiber.Ctx) error {
	facilityID := c.Params("id")
	var patients []models.Patient

	err := database.DB.
		Joins("JOIN facilities ON facilities.id = patients.facility_id").
		Joins("JOIN facility_identifications ON facility_identifications.facility_id = facilities.id").
		Where("facility_identifications.registry_id = ?", facilityID).
		Preload("Diagnosis").
		Preload("Treatments").
		Preload("Submitters").
		Find(&patients).Error

	if err != nil || len(patients) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No patients found for this facility",
		})
	}

	return c.JSON(patients)
}

// Helper function to validate patient request
func validatePatientRequest(req *models.PatientCreateRequest) error {
	if req.FacilityID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Facility ID is required")
	}
	if req.PatientInfo.FirstName == "" {
		return fiber.NewError(fiber.StatusBadRequest, "First name is required")
	}
	if req.PatientInfo.LastName == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Last name is required")
	}
	if req.PatientInfo.DOB == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Date of birth is required")
	}
	if req.PatientInfo.Gender == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Gender is required")
	}
	return nil
}

// Helper function to check if facility exists
func checkFacilityExists(facilityID string) (models.Facility, error) {
	var facility models.Facility
	err := database.DB.
		Preload("Identification").
		Model(&models.Facility{}).
		Joins("JOIN facility_identifications ON facilities.id = facility_identifications.facility_id").
		Where("facility_identifications.registry_id LIKE ?", facilityID).
		First(&facility).Error

	return facility, err
}

// Helper function to check if patient exists by registration ID
func checkExistingPatientByRegistrationID(registrationID string) (bool, error) {
	var count int64
	err := database.DB.
		Model(&models.Patient{}).
		Where("registration_id = ?", registrationID).
		Count(&count).Error

	return count > 0, err
}
