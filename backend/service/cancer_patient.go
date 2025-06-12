package service

import (
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"patient-registry.com/database"
	"patient-registry.com/models"
)

func CreateCancerPatient(c *fiber.Ctx) error {
	req := new(models.CancerPatientCreateRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Validate required fields
	if err := validateCancerPatientRequest(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Check if facility exists
	facility, err := CheckFacilityExists(req.FacilityID)
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

	// Check for duplicate registration ID
	if req.RegistrationID != "" {
		exists, err := checkExistingCancerPatientByRegistrationIDAndFacilityId(req.RegistrationID, req.FacilityID)
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
	var dob time.Time
	if req.PatientInfo.DOB != nil {
		dob, err = time.Parse("2006-01-02", *req.PatientInfo.DOB)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid Date of Birth format. Use YYYY-MM-DD",
			})
		}
	}

	// Parse registration date or use now
	registrationDate := time.Now()
	if req.RegistrationDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.RegistrationDate); err == nil {
			registrationDate = parsed
		}
	}

	// Check for existing patient with national ID
	var existing models.Patient
	err = database.DB.Where("patient_national_id  = ? AND facility_id = ?", req.PatientInfo.NationalId, req.FacilityID).First(&existing).Error
	if err == nil {
		// Patient exists — add new submitter only
		newSubmitter := models.Submitter{
			Name:      req.Submitter.Name,
			Title:     req.Submitter.Title,
			Email:     req.Submitter.Email,
			PatientID: existing.ID,
		}

		if err := database.DB.Create(&newSubmitter).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to add submitter to existing patient",
			})
		}

		var updated models.CancerPatient
		if err := database.DB.
			Preload("Patient").
			Preload("Patient.Facility").
			Preload("Patient.Submitters").
			Preload("Patient.Referrals").
			Preload("CancerDiagnosis").
			Where("patient_id = ?", existing.ID).
			First(&updated).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to load updated patient",
			})
		}

		return c.Status(fiber.StatusOK).JSON(updated)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while checking national ID",
		})
	}

	// No patient found, create everything new
	patient := models.CancerPatient{
		Patient: models.Patient{
			FacilityID: facility.ID,
			PatientInfo: models.PatientInfo{
				FirstName:  req.PatientInfo.FirstName,
				MiddleName: req.PatientInfo.MiddleName,
				LastName:   req.PatientInfo.LastName,
				DOB:        dob,
				Age:        req.PatientInfo.Age,
				Gender:     req.PatientInfo.Gender,
				NationalId: req.PatientInfo.NationalId,
			},
			RegistrationID:   req.RegistrationID,
			RegistrationDate: registrationDate,
			Submitters: []models.Submitter{
				{
					Name:  req.Submitter.Name,
					Title: req.Submitter.Title,
					Email: req.Submitter.Email,
				},
			},
		},
		CancerDiagnosis: []models.CancerDiagnosis{
			{
				DateOfDiagnosis:        registrationDate,
				PrimarySite:            req.CancerDiagnosis.PrimarySite,
				Histology:              req.CancerDiagnosis.Histology,
				DiagnosticConfirmation: req.CancerDiagnosis.DiagnosticConfirmation,
				Laterality:             req.CancerDiagnosis.Laterality,
				Stage:                  req.CancerDiagnosis.Stage,
			},
		},
	}

	if err := database.DB.Create(&patient).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create patient",
		})
	}

	var created models.CancerPatient
	if err := database.DB.
		Preload("Patient").
		Preload("Patient.Facility").
		Preload("Patient.Submitters").
		Preload("Patient.Referrals").
		Preload("CancerDiagnosis").
		First(&created, patient.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load created patient",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

// GetPatients handles GET /patients
func GetCancerPatients(c *fiber.Ctx) error {
	var patients []models.CancerPatient
	database.DB.
		Preload("Facility").
		Preload("Facility.Identification").
		Preload("Facility.Contacts").
		Preload("Facility.Technical").
		Preload("Diagnosis").
		Preload("Referrals").
		Preload("Submitters").
		Find(&patients)
	return c.JSON(patients)
}

// GetPatientByID handles GET /patients/:id
func GetCancerPatientByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var patient models.CancerPatient
	if err := database.DB.
		Table("cancer_patients").
		Joins("LEFT JOIN patients ON patients.id = cancer_patients.patient_id").
		Joins("LEFT JOIN facilities ON facilities.id = patients.facility_id").
		Where("cancer_patients.id = ?", id).
		Preload("Patient").
		Preload("Patient.Facility.Identification").
		Preload("Patient.Facility.Contacts").
		Preload("CancerDiagnosis").
		Preload("Patient.Referrals").
		Preload("Patient.Submitters").
		First(&patient).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Patient not found",
		})
	}

	return c.JSON(patient)
}

// DeletePatient handles DELETE /patients/:id
func DeleteCancerPatient(c *fiber.Ctx) error {
	id := c.Params("id")
	var patient models.CancerPatient
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
func GetCancerPatientsByFacility(c *fiber.Ctx) error {
	facilityID := c.Params("id")

	var patients []models.CancerPatient
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
func GetCancerPatientByRegistrationID(c *fiber.Ctx) error {
	registrationID := c.Params("registrationId")

	var patients []models.CancerPatient
	likePattern := "%" + registrationID + "%"
	result := database.DB.
		Preload("Patient").
		Where("patient.registration_id LIKE ?", likePattern).
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
func GetCancerPatientByName(c *fiber.Ctx) error {
	name := c.Params("name")
	likePattern := "%" + name + "%"

	var patients []models.CancerPatient

	result := database.DB.
		Table("cancer_patients").
		Joins("JOIN patients ON patients.id = cancer_patients.patient_id").
		Where("patient_first_name LIKE ? OR patient_middle_name LIKE ? OR patient_last_name LIKE ?",
			likePattern, likePattern, likePattern).
		Preload("Patient").
		Preload("Patient.Facility").
		Preload("Patient.Referrals").
		Preload("Patient.Submitters").
		Preload("CancerDiagnosis").
		Find(&patients)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while searching patients",
		})
	}

	return c.JSON(patients)
}

func GetCancerPatientsByFacilityID(c *fiber.Ctx) error {
	facilityID := c.Params("id")
	var patients []models.CancerPatient

	err := database.DB.
		Table("cancer_patients").
		Joins("JOIN patients ON patients.id = cancer_patients.patient_id").
		Joins("JOIN facilities ON facilities.id = patients.facility_id").
		Joins("JOIN facility_identifications ON facility_identifications.facility_id = facilities.id").
		Where("facility_identifications.registry_id = ?", facilityID).
		Preload("CancerDiagnosis").
		Preload("Patient.Referrals").
		Preload("Patient.Submitters").
		Find(&patients).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Error in retrieving patients for facility",
		})
	}

	return c.JSON(patients)
}

// CreateDiagnosis handles POST /patients/:id/diagnosis
func CreateCancerDiagnosis(c *fiber.Ctx) error {
	patientID := c.Params("id")
	var diagnosis models.CancerDiagnosis

	if err := c.BodyParser(&diagnosis); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	patientIDUint, err := strconv.Atoi(patientID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID"})
	}
	diagnosis.CancerPatientID = uint(patientIDUint)
	if err := database.DB.Create(&diagnosis).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create diagnosis"})
	}

	return c.Status(fiber.StatusCreated).JSON(diagnosis)
}

// CreateReferral handles POST /patients/:id/referral
func CreateCancerReferral(c *fiber.Ctx) error {
	patientID := c.Params("id")
	var referral models.Referral

	if err := c.BodyParser(&referral); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	patientIDUint, err := strconv.Atoi(patientID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid patient ID"})
	}

	referral.PatientID = uint(patientIDUint)
	if err := database.DB.Create(&referral).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create referral"})
	}

	return c.Status(fiber.StatusCreated).JSON(referral)
}

// GetDiagnosisByPatientID handles GET /patients/:id/diagnosis
func GetCancerDiagnosisByPatientID(c *fiber.Ctx) error {
	patientID := c.Params("id")
	var diagnosis []models.CancerDiagnosis

	if err := database.DB.Where("patient_id = ?", patientID).Find(&diagnosis).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve diagnosis"})
	}

	return c.JSON(diagnosis)
}

// GetReferralByPatientID handles GET /patients/:id/referrals
func GetCancerReferralByPatientID(c *fiber.Ctx) error {
	patientID := c.Params("id")
	var referrals []models.Referral

	if err := database.DB.Where("patient_id = ?", patientID).Find(&referrals).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve referrals"})
	}

	return c.JSON(referrals)
}

// Helper function to validate patient request
func validateCancerPatientRequest(req *models.CancerPatientCreateRequest) error {
	if req.FacilityID == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Facility ID is required")
	}
	if req.PatientInfo.FirstName == "" {
		return fiber.NewError(fiber.StatusBadRequest, "First name is required")
	}
	if req.PatientInfo.LastName == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Last name is required")
	}
	if req.PatientInfo.Gender == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Gender is required")
	}
	return nil
}

func checkExistingCancerPatientByRegistrationIDAndFacilityId(registrationID string, facilityId uint) (bool, error) {
	var count int64
	err := database.DB.
		Model(&models.CancerPatient{}).
		Joins("JOIN patients ON patients.id = cancer_patients.patient_id").
		Where("patients.registration_id = ? AND patients.facility_id = ?", registrationID, facilityId).
		Count(&count).Error

	return count > 0, err
}
