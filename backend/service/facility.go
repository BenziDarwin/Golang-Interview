package service

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang-interview.com/database"
	"golang-interview.com/helpers"
	"golang-interview.com/middleware"
	"golang-interview.com/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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
	processedRegistryID, err := validateAndProcessIdentification(req.Identification)
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
	if exists, err := checkExistingFacilityByRegistryID(req.Identification.RegistryID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error while checking existing facility",
		})
	} else if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Facility with this Registry ID already exists",
		})
	}

	// Parse upgrade date
	var upgradeDate *time.Time
	if req.Technical.UpgradeDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.Technical.UpgradeDate); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid upgrade date format. Use YYYY-MM-DD",
			})
		} else {
			upgradeDate = &parsed
		}
	}

	// Create facility with all related models
	facility := models.Facility{
		Name:              req.Name,
		OrganizationName:  req.OrganizationName,
		ProviderSpecialty: req.ProviderSpecialty,
		Status:            req.Status,
		OrganizationType:  req.OrganizationType,
		YearlyCases:       req.YearlyCases,
		GenomicTests:      req.GenomicTests,
	}

	// Set contacts using helper method
	meaningfulUse := models.Contact{
		Name:  req.Contact.MeaningfulUse.Name,
		Email: req.Contact.MeaningfulUse.Email,
		Phone: req.Contact.MeaningfulUse.Phone,
	}
	registryLead := models.Contact{
		Name:  req.Contact.RegistryLead.Name,
		Email: req.Contact.RegistryLead.Email,
		Phone: req.Contact.RegistryLead.Phone,
	}
	networkLead := models.Contact{
		Name:  req.Contact.NetworkLead.Name,
		Email: req.Contact.NetworkLead.Email,
		Phone: req.Contact.NetworkLead.Phone,
	}

	// Generate password for registry lead
	password, err := helpers.GeneratePassword(facility.Name, processedRegistryID)
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
	meaningfulUse.Password = string(hashedPassword)

	// Send email to registry lead with password
	emailBody := "Please use the following password to log in to the registry: " + password
	to := meaningfulUse.Email
	if err := helpers.SendEmail(to, "UGANDA CANCER REGISTRY", emailBody); err != nil {
		fmt.Println("Email error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to send email to registry lead",
		})
	}

	facility.SetContacts(meaningfulUse, registryLead, networkLead)

	// Set technical information
	facility.Technical = models.Technical{
		SoftwareVendor:  req.Technical.SoftwareVendor,
		SoftwareProduct: req.Technical.SoftwareProduct,
		SoftwareVersion: req.Technical.SoftwareVersion,
		IsCEHRT2014:     req.Technical.IsCEHRT2014,
		SupportsHL7CDA:  req.Technical.SupportsHL7CDA,
		UpgradeDate:     upgradeDate,
		TransportOption: req.Technical.TransportOption,
	}

	// Set identification
	facility.Identification = models.FacilityIdentification{
		RegistryID: processedRegistryID,
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
		Preload("Technical").
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
			"error": "Cannot parse JSON",
		})
	}

	// Fetch the existing facility
	var facility models.Facility
	if err := database.DB.
		Preload("Contacts").
		Preload("Technical").
		Preload("Identification").
		First(&facility, facilityID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility not found",
		})
	}

	// Validate and process identification fields if provided
	if req.Identification != nil {
		processedRegistryID, err := validateAndProcessIdentification(struct {
			RegistryID string `json:"registry_id"`
			NPI        string `json:"npi,omitempty"`
		}{
			RegistryID: req.Identification.RegistryID,
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

		// Check for duplicate Registry ID
		if req.Identification.RegistryID != "" && req.Identification.RegistryID != facility.Identification.RegistryID {
			exists, err := checkExistingFacilityByRegistryID(req.Identification.RegistryID)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Database error while checking existing facility",
				})
			}
			if exists {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Facility with this Registry ID already exists",
				})
			}
		}

		// Update identification fields
		facility.Identification.RegistryID = processedRegistryID
		facility.Identification.NPI = req.Identification.NPI
	}

	// Update general information if provided
	if req.Name != "" {
		facility.Name = req.Name
	}
	if req.OrganizationName != "" {
		facility.OrganizationName = req.OrganizationName
	}
	if req.ProviderSpecialty != "" {
		facility.ProviderSpecialty = req.ProviderSpecialty
	}
	if req.Status != "" {
		facility.Status = req.Status
	}
	if req.OrganizationType != nil {
		facility.OrganizationType = req.OrganizationType
	}
	if req.YearlyCases != "" {
		facility.YearlyCases = req.YearlyCases
	}
	if req.GenomicTests != nil {
		facility.GenomicTests = req.GenomicTests
	}

	// Update contact information if provided
	if req.Contact != nil {
		if req.Contact.MeaningfulUse != nil {
			if err := updateContact(&facility.Contacts[0], req.Contact.MeaningfulUse); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		if req.Contact.RegistryLead != nil {
			if err := updateContact(&facility.Contacts[1], req.Contact.RegistryLead); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		if req.Contact.NetworkLead != nil {
			if err := updateContact(&facility.Contacts[2], req.Contact.NetworkLead); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
	}

	// Update technical information if provided
	if req.Technical != nil {
		if facility.Technical.ID == 0 {
			// If technical doesn't exist yet, create it
			facility.Technical = models.Technical{}
		}

		if req.Technical.SoftwareVendor != "" {
			facility.Technical.SoftwareVendor = req.Technical.SoftwareVendor
		}
		if req.Technical.SoftwareProduct != "" {
			facility.Technical.SoftwareProduct = req.Technical.SoftwareProduct
		}
		if req.Technical.SoftwareVersion != "" {
			facility.Technical.SoftwareVersion = req.Technical.SoftwareVersion
		}
		if req.Technical.TransportOption != "" {
			facility.Technical.TransportOption = req.Technical.TransportOption
		}
		if req.Technical.UpgradeDate != "" {
			parsed, err := time.Parse("2006-01-02", req.Technical.UpgradeDate)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid upgrade date format. Use YYYY-MM-DD",
				})
			}
			facility.Technical.UpgradeDate = &parsed
		}
		facility.Technical.IsCEHRT2014 = req.Technical.IsCEHRT2014
		facility.Technical.SupportsHL7CDA = req.Technical.SupportsHL7CDA
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

		// Save technical info
		if facility.Technical.ID != 0 {
			if err := tx.Save(&facility.Technical).Error; err != nil {
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
		Preload("Technical").
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
	RegistryID string `json:"registry_id"`
	NPI        string `json:"npi,omitempty"`
}) (processedRegistryID string, err error) {
	// Process Registry ID - remove TMP- prefix if present
	registryID := id.RegistryID
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
		Preload("Technical").
		Preload("Patients").
		Find(&facilities)
	return c.JSON(facilities)
}

func SetFacilityStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var facility models.Facility
	if err := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Preload("Technical").
		Preload("Patients").First(&facility, id).Error; err != nil {
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

func GetFacilityByName(c *fiber.Ctx) error {
	name := c.Params("name")

	var facility []models.Facility
	likePattern := "%" + name + "%"
	result := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Preload("Technical").
		Preload("Patients").
		Where("facilities.name LIKE ?", likePattern).
		Find(&facility)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Facility with name not found",
		})
	}

	return c.JSON(facility)
}

func GetFacilityByRegistryID(c *fiber.Ctx) error {
	registryId := c.Params("registryId")

	var facility []models.Facility
	likePattern := "%" + registryId + "%"
	result := database.DB.
		Preload("Identification").
		Preload("Contacts").
		Preload("Technical").
		Preload("Patients").
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
