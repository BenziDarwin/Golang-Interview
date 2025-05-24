package service

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang-interview.com/database"
	"golang-interview.com/models"
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
	} else if facility.ID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Facility not found",
		})
	}

	// Check for existing patient with same registration ID
	if req.RegistrationID != "" {
		if exists, err := checkExistingPatientByRegistrationID(req.RegistrationID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Database error while checking existing patient",
			})
		} else if exists {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Patient with this registration ID already exists",
			})
		}
	}

	// Parse dates
	dob, err := time.Parse("2006-01-02", req.PatientInfo.DOB)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid date of birth format. Use YYYY-MM-DD",
		})
	}

	dateOfDiagnosis, err := time.Parse("2006-01-02", req.Diagnosis.DateOfDiagnosis)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid date of diagnosis format. Use YYYY-MM-DD",
		})
	}

	firstTreatmentDate, err := time.Parse("2006-01-02", req.Treatment.FirstTreatmentDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid first treatment date format. Use YYYY-MM-DD",
		})
	}

	// Set registration date if not provided
	registrationDate := time.Now()
	if req.RegistrationDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.RegistrationDate); err == nil {
			registrationDate = parsed
		}
	}

	// Process treatment types array to string
	treatmentTypesStr := strings.Join(req.Treatment.Types, ",")

	// Create patient with all related data
	patient := models.Patient{
		FacilityID: strconv.FormatUint(uint64(facility.ID), 10),
		PatientInfo: models.PatientInfo{
			FirstName:           req.PatientInfo.FirstName,
			MiddleName:          req.PatientInfo.MiddleName,
			LastName:            req.PatientInfo.LastName,
			DOB:                 dob,
			Gender:              req.PatientInfo.Gender,
			SSNLast4:            req.PatientInfo.SSNLast4,
			MedicalRecordNumber: req.PatientInfo.MedicalRecordNumber,
		},
		Address: models.Address{
			Street: req.Address.Street,
			City:   req.Address.City,
			State:  req.Address.State,
			Zip:    req.Address.Zip,
		},
		Diagnosis: models.Diagnosis{
			PrimarySite:            req.Diagnosis.PrimarySite,
			Histology:              req.Diagnosis.Histology,
			DateOfDiagnosis:        dateOfDiagnosis,
			DiagnosticConfirmation: req.Diagnosis.DiagnosticConfirmation,
			Stage:                  req.Diagnosis.Stage,
			Laterality:             req.Diagnosis.Laterality,
		},
		Treatment: models.Treatment{
			Types:              treatmentTypesStr,
			FirstTreatmentDate: firstTreatmentDate,
			TreatingPhysician:  req.Treatment.TreatingPhysician,
			Notes:              req.Treatment.Notes,
			ReportingSource:    req.Treatment.ReportingSource,
		},
		Submitter: models.Submitter{
			Name:  req.Submitter.Name,
			Title: req.Submitter.Title,
			Email: req.Submitter.Email,
		},
		RegistrationID:   req.RegistrationID,
		RegistrationDate: registrationDate,
	}

	// Create patient in database
	if err := database.DB.Create(&patient).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create patient",
		})
	}

	// Load the created patient with facility for response
	var createdPatient models.Patient
	if err := database.DB.
		Preload("Facility").
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
		First(&patient, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Patient not found",
		})
	}

	return c.JSON(patient)
}

// UpdatePatient handles PUT /patients/:id
func UpdatePatient(c *fiber.Ctx) error {
	id := c.Params("id")

	var patient models.Patient
	if err := database.DB.First(&patient, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Patient not found",
		})
	}

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
	} else if facility.ID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Facility not found",
		})
	}

	// Parse dates
	dob, err := time.Parse("2006-01-02", req.PatientInfo.DOB)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid date of birth format. Use YYYY-MM-DD",
		})
	}

	dateOfDiagnosis, err := time.Parse("2006-01-02", req.Diagnosis.DateOfDiagnosis)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid date of diagnosis format. Use YYYY-MM-DD",
		})
	}

	firstTreatmentDate, err := time.Parse("2006-01-02", req.Treatment.FirstTreatmentDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid first treatment date format. Use YYYY-MM-DD",
		})
	}

	// Process treatment types array to string
	treatmentTypesStr := strings.Join(req.Treatment.Types, ",")

	// Update patient fields
	patient.FacilityID = strconv.FormatUint(uint64(facility.ID), 10)
	patient.PatientInfo.FirstName = req.PatientInfo.FirstName
	patient.PatientInfo.MiddleName = req.PatientInfo.MiddleName
	patient.PatientInfo.LastName = req.PatientInfo.LastName
	patient.PatientInfo.DOB = dob
	patient.PatientInfo.Gender = req.PatientInfo.Gender
	patient.PatientInfo.SSNLast4 = req.PatientInfo.SSNLast4
	patient.PatientInfo.MedicalRecordNumber = req.PatientInfo.MedicalRecordNumber
	patient.Address.Street = req.Address.Street
	patient.Address.City = req.Address.City
	patient.Address.State = req.Address.State
	patient.Address.Zip = req.Address.Zip
	patient.Diagnosis.PrimarySite = req.Diagnosis.PrimarySite
	patient.Diagnosis.Histology = req.Diagnosis.Histology
	patient.Diagnosis.DateOfDiagnosis = dateOfDiagnosis
	patient.Diagnosis.DiagnosticConfirmation = req.Diagnosis.DiagnosticConfirmation
	patient.Diagnosis.Stage = req.Diagnosis.Stage
	patient.Diagnosis.Laterality = req.Diagnosis.Laterality
	patient.Treatment.Types = treatmentTypesStr
	patient.Treatment.FirstTreatmentDate = firstTreatmentDate
	patient.Treatment.TreatingPhysician = req.Treatment.TreatingPhysician
	patient.Treatment.Notes = req.Treatment.Notes
	patient.Treatment.ReportingSource = req.Treatment.ReportingSource
	patient.Submitter.Name = req.Submitter.Name
	patient.Submitter.Title = req.Submitter.Title
	patient.Submitter.Email = req.Submitter.Email

	// Save updated patient
	if err := database.DB.Save(&patient).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update patient",
		})
	}

	// Load updated patient with facility for response
	var updatedPatient models.Patient
	if err := database.DB.
		Preload("Facility").
		First(&updatedPatient, patient.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load updated patient",
		})
	}

	return c.JSON(updatedPatient)
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
	if req.Diagnosis.DateOfDiagnosis == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Date of diagnosis is required")
	}
	if req.Treatment.FirstTreatmentDate == "" {
		return fiber.NewError(fiber.StatusBadRequest, "First treatment date is required")
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
