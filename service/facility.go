package service

import (
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"patient-registry.com/database"
	"patient-registry.com/helpers"
	"patient-registry.com/middleware"
	"patient-registry.com/models"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func LoginFacility(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input",
		})
	}

	var contact models.Contact
	err := database.DB.
		Where("email = ?", req.Email).First(&contact).Error
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(contact.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	var facility models.Facility
	if err := database.DB.Preload("Identification").Where("id = ?", contact.FacilityID).First(&facility).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load associated facility",
		})
	}

	// ✅ Set cookie using middleware helper
	token, err := middleware.CreateSession(c, contact.Name, contact.Email, facility.Identification.RegistryID, "facility")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create session",
		})
	}

	return c.JSON(fiber.Map{
		"token":    token,
		"facility": facility,
		"contact":  contact,
	})
}

func CreateFacility(c *fiber.Ctx) error {
	req := new(models.FacilityCreateRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Validate and process identification fields
	processedFacilityID, err := validateAndProcessIdentification(struct {
		RegistryId string `json:"registry_id"`
		FacilityId uint   `json:"facility_id"`
		NPI        string `json:"npi,omitempty"`
	}{
		RegistryId: req.Identification.RegistryID,
		FacilityId: 0, // Not used in the function
		NPI:        req.Identification.NPI,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Check for existing facility with same NPI (if provided)
	if req.Identification.NPI != "" {
		if exists, err := checkExistingFacilityByNPI(req.Identification.NPI); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Database error while checking existing facility",
			})
		} else if exists {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Facility with this NPI already exists",
			})
		}
	}

	// Check for existing facility with same Registry ID
	if exists, err := checkExistingFacilityByRegistryID(req.Identification.FacilityID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while checking existing facility",
		})
	} else if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Facility with this Registry ID already exists",
		})
	}

	// Create facility with all related models
	facility := models.Facility{
		Name:              req.Name,
		ProviderSpecialty: req.ProviderSpecialty,
		Status:            req.Status,
		YearlyCases:       req.YearlyCases,
		GenomicTests:      req.GenomicTests,
	}

	// Set contacts using helper method
	facilityIncharge := models.Contact{
		Name:  req.Contact.FacilityIncharge.Name,
		Email: req.Contact.FacilityIncharge.Email,
		Phone: req.Contact.FacilityIncharge.Phone,
	}
	registryFocalPerson := models.Contact{
		Name:  req.Contact.RegistryFocalPerson.Name,
		Email: req.Contact.RegistryFocalPerson.Email,
		Phone: req.Contact.RegistryFocalPerson.Phone,
	}
	altRegistryFocalPerson := models.Contact{
		Name:  req.Contact.AltRegistryFocalPerson.Name,
		Email: req.Contact.AltRegistryFocalPerson.Email,
		Phone: req.Contact.AltRegistryFocalPerson.Phone,
	}

	// Generate password for registry lead
	password, err := helpers.GeneratePassword(facility.Name, processedFacilityID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to encrypt password",
		})
	}
	facilityIncharge.Password = string(hashedPassword)

	emailBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
  <p>Dear %s,</p>

  <p>Your facility has been successfully registered in the <strong>Uganda National Patient Registry</strong>.</p>

  <p>Please use the following credentials to access the registry portal:</p>

  <table style="border-collapse: collapse;">
    <tr>
      <td style="padding: 8px;"><strong>Registry ID:</strong></td>
      <td style="padding: 8px; background-color: #f4f4f4;">%s</td>
    </tr>
    <tr>
      <td style="padding: 8px;"><strong>Password:</strong></td>
      <td style="padding: 8px; background-color: #f4f4f4;">%s</td>
    </tr>
  </table>

  <p>You can now log in and begin managing your registry data securely.</p>

  <p style="color: #888;">If you did not request this registration or believe this message was sent in error, please contact our support team immediately.</p>

  <p>Best regards,<br>
  <strong>Uganda Patient Registry</strong></p>
</body>
</html>
`, facilityIncharge.Name, processedFacilityID, password)

	to := facilityIncharge.Email

	if err := helpers.SendEmail(to, "UGANDA CANCER REGISTRY - Access Credentials", emailBody); err != nil {
		fmt.Println("Email error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to send email to registry lead",
		})
	}

	facility.SetContacts(facilityIncharge, registryFocalPerson, altRegistryFocalPerson)

	// Set identification
	facility.Identification = models.FacilityIdentification{
		RegistryID: processedFacilityID,
		NPI:        req.Identification.NPI,
	}

	// Create facility and all related records in a transaction
	if err := database.DB.Create(&facility).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create facility",
		})
	}

	// Load the created facility with all associations for response
	var createdFacility models.Facility
	if err := database.DB.
		Preload("Contacts").
		Preload("Identification").
		First(&createdFacility, facility.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load created facility",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(createdFacility)
}

func UpdateFacility(c *fiber.Ctx) error {
	// Get facility ID from URL parameter
	facilityID := c.Params("id")

	var req models.FacilityUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON" + err.Error(),
		})
	}

	// Fetch the existing facility
	var facility models.Facility
	if err := database.DB.
		Preload("Contacts").
		Preload("Identification").
		First(&facility, facilityID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility not found",
		})
	}

	// Validate and process identification fields if provided
	if req.Identification != nil {
		_, err := validateAndProcessIdentification(struct {
			RegistryId string `json:"registry_id"`
			FacilityId uint   `json:"facility_id"`
			NPI        string `json:"npi,omitempty"`
		}{
			RegistryId: req.Identification.RegistryID,
			FacilityId: 0, // Not used in the function
			NPI:        req.Identification.NPI,
		})
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// Check for duplicate NPI (if provided)
		if req.Identification.NPI != "" && req.Identification.NPI != facility.Identification.NPI {
			exists, err := checkExistingFacilityByNPI(req.Identification.NPI)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Database error while checking existing facility",
				})
			}
			if exists {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Facility with this NPI already exists",
				})
			}
		}
	}

	// Update general information if provided
	if req.Name != "" {
		facility.Name = req.Name
	}
	if req.ProviderSpecialty != "" {
		facility.ProviderSpecialty = req.ProviderSpecialty
	}
	if req.Status != "" {
		facility.Status = req.Status
	}
	if req.YearlyCases != "" {
		facility.YearlyCases = req.YearlyCases
	}
	if req.GenomicTests != nil {
		facility.GenomicTests = req.GenomicTests
	}

	// Update contact information if provided
	if req.Contact != nil {
		if req.Contact.FacilityIncharge != nil {
			if err := updateContact(&facility.Contacts[0], req.Contact.FacilityIncharge); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		if req.Contact.RegistryFocalPerson != nil {
			if err := updateContact(&facility.Contacts[1], req.Contact.RegistryFocalPerson); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		if req.Contact.AltRegistryFocalPerson != nil {
			if err := updateContact(&facility.Contacts[2], req.Contact.AltRegistryFocalPerson); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
	}

	// Run DB operations in a transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Save main facility
		if err := tx.Save(&facility).Error; err != nil {
			return err
		}

		// Save related contacts
		for i := range facility.Contacts {
			if err := tx.Save(&facility.Contacts[i]).Error; err != nil {
				return err
			}
		}

		// Save identification
		if facility.Identification.ID != 0 {
			if err := tx.Save(&facility.Identification).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update facility",
		})
	}

	// Reload the updated facility with relations
	var updatedFacility models.Facility
	if err := database.DB.
		Preload("Contacts").
		Preload("Identification").
		First(&updatedFacility, facilityID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load updated facility",
		})
	}

	return c.Status(fiber.StatusOK).JSON(updatedFacility)
}

func updateContact(contact *models.Contact, input *models.ContactInput) error {
	if input.Name != "" {
		contact.Name = input.Name
	}
	if input.Email != "" {
		emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
		if !emailRegex.MatchString(input.Email) {
			return fmt.Errorf("invalid email format for contact")
		}
		contact.Email = input.Email
	}
	if input.Phone != "" {
		contact.Phone = input.Phone
	}
	return nil
}

// Helper function to validate and process identification fields
func validateAndProcessIdentification(id struct {
	RegistryId string `json:"registry_id"`
	FacilityId uint   `json:"facility_id"`
	NPI        string `json:"npi,omitempty"`
}) (processedRegistryID string, err error) {
	// Process Registry ID - remove TMP- prefix if present
	registryID := id.RegistryId
	if strings.HasPrefix(strings.ToUpper(registryID), "TMP-") {
		registryID = strings.TrimPrefix(strings.ToUpper(registryID), "TMP-")
	}

	// Validate processed Registry ID
	if len(registryID) != 6 {
		return "", fiber.NewError(fiber.StatusBadRequest, "Registry ID must be exactly 6 digits (format: TMP-XXXXXX or XXXXXX)")
	}
	if _, err := strconv.ParseInt(registryID, 10, 64); err != nil {
		return "", fiber.NewError(fiber.StatusBadRequest, "Registry ID must contain only digits after TMP- prefix")
	}

	// Validate NPI if provided (optional for backward compatibility)
	if id.NPI != "" {
		if len(id.NPI) != 10 {
			return "", fiber.NewError(fiber.StatusBadRequest, "NPI must be exactly 10 digits")
		}
		if _, err := strconv.ParseInt(id.NPI, 10, 64); err != nil {
			return "", fiber.NewError(fiber.StatusBadRequest, "NPI must contain only digits")
		}
	}

	return registryID, nil
}

// GetFacilities handles GET /facilities
func GetFacilities(c *fiber.Ctx) error {
	var facilities []models.Facility
	database.DB.
		Preload("Identification").
		Preload("Contacts").
		Find(&facilities)
	return c.JSON(facilities)
}

func SetFacilityStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var facility models.Facility
	if err := database.DB.
		Preload("Identification").
		Preload("Contacts").
		First(&facility, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility not found",
		})
	}

	facility.Status = "active"
	if err := database.DB.Save(&facility).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update facility status",
		})
	}

	return c.JSON(facility)
}
func GetExistsFacilityByName(c *fiber.Ctx) error {
	name := c.Params("name")

	// URL decode the name parameter
	decodedName, err := url.QueryUnescape(name)
	if err != nil {
		decodedName = name // fallback to original if decode fails
	}

	var facility models.Facility
	result := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Where("name = ?", strings.TrimSpace(decodedName)).
		First(&facility)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility with name not found",
		})
	}

	return c.JSON(fiber.Map{
		"exists": facility.ID != 0,
		"status": facility.Status,
	})
}

func GetFacilityByName(c *fiber.Ctx) error {
	name := c.Params("name")

	var facility []models.Facility
	likePattern := "%" + name + "%"
	result := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Where("facilities.name LIKE ?", likePattern).
		Find(&facility)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility with name not found",
		})
	}

	return c.JSON(facility)
}

func GetExistsFacilityByRegistryID(c *fiber.Ctx) error {
	registryId := c.Params("registryId")

	var facility models.Facility
	result := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Joins("JOIN facility_identifications ON facilities.id = facility_identifications.facility_id").
		Where("facility_identifications.registry_id = ?", registryId).
		First(&facility)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility with registry ID not found",
		})
	}

	return c.JSON(fiber.Map{
		"exists": facility.ID != 0,
		"status": facility.Status,
	})
}

func GetFacilityByRegistryID(c *fiber.Ctx) error {
	registryId := c.Params("registryId")

	var facility []models.Facility
	likePattern := "%" + registryId + "%"
	result := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Joins("JOIN facility_identifications ON facilities.id = facility_identifications.facility_id").
		Where("facility_identifications.registry_id LIKE ?", likePattern).
		Find(&facility)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility with registry ID not found",
		})
	}

	return c.JSON(facility)
}

// Helper function to check if facility exists by NPI
func checkExistingFacilityByNPI(npi string) (bool, error) {
	var count int64
	err := database.DB.
		Joins("JOIN facility_identifications ON facility_identifications.facility_id = facilities.id").
		Where("facility_identifications.npi = ?", npi).
		Model(&models.Facility{}).
		Count(&count).Error

	return count > 0, err
}

// Helper function to check if facility exists by Registry ID
func checkExistingFacilityByRegistryID(registryID string) (bool, error) {
	var count int64
	err := database.DB.
		Joins("JOIN facility_identifications ON facility_identifications.facility_id = facilities.id").
		Where("facility_identifications.registry_id = ?", registryID).
		Model(&models.Facility{}).
		Count(&count).Error

	return count > 0, err
}

// Helper function to check if facility exists
func CheckFacilityExists(facilityID uint) (models.Facility, error) {
	var facility models.Facility
	likePattern := "%" + strconv.Itoa(int(facilityID)) + "%"
	err := database.DB.
		Preload("Identification").
		Model(&models.Facility{}).
		Joins("JOIN facility_identifications ON facilities.id = facility_identifications.facility_id").
		Where("facility_identifications.registry_id LIKE ?", likePattern).
		First(&facility).Error

	return facility, err
}
