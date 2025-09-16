package service

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

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

	// Check for existing facility with contact emails
	contactEmails := []string{
		req.Contact.FacilityIncharge.Email,
		req.Contact.RegistryFocalPerson.Email,
		req.Contact.AltRegistryFocalPerson.Email,
	}

	for _, email := range contactEmails {
		if email != "" { // Only check non-empty emails
			if exists, err := checkExistingFacilityByContactEmail(email); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Database error while checking existing contact email",
				})
			} else if exists {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": fmt.Sprintf("A facility with contact email '%s' already exists", email),
				})
			}
		}
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

	token := helpers.GenerateSecureToken(32)
	passwordToken := models.PasswordToken{
		Token:     token,
		Email:     facilityIncharge.Email,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := database.DB.Create(&passwordToken).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to store token"})
	}
	defaultDomain := "http://localhost:6060"
	domain := getEnv("SERVER_DOMAIN", &defaultDomain)

	link := fmt.Sprintf("%s/reset-password.html?token=%s", domain, url.QueryEscape(token))

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
      <td style="padding: 8px;"><strong>Set Password:</strong></td>
      <td style="padding: 8px; background-color: #f4f4f4;">
        <a href="%s">%s</a>
      </td>
    </tr>
  </table>

  <p>This link will expire in 24 hours. Once you set your password, you can log in and begin managing your registry data securely.</p>

  <p style="color: #888;">If you did not request this registration or believe this message was sent in error, please contact our support team immediately.</p>

  <p>Best regards,<br>
  <strong>Uganda Patient Registry</strong></p>
</body>
</html>
`, facilityIncharge.Name, processedFacilityID, link, link)

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

// Helper function to check if a facility exists with a given contact email
func checkExistingFacilityByContactEmail(email string) (bool, error) {
	var count int64
	err := database.DB.Model(&models.Contact{}).Where("email = ?", email).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
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

func SetPassword(c *fiber.Ctx) error {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	var t models.PasswordToken
	if err := database.DB.Where("token = ?", req.Token).First(&t).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired token"})
	}
	if time.Now().After(t.ExpiresAt) {
		return c.Status(400).JSON(fiber.Map{"error": "Token expired"})
	}

	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	database.DB.Model(&models.Contact{}).
		Where("email = ?", t.Email).
		Update("password", string(hashed))

	database.DB.Delete(&t)

	return c.JSON(fiber.Map{"message": "Password set successfully"})
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

func ForgotPassword(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email is required"})
	}

	// 1) Find the contact — prefer an explicit facility incharge type, but fall back to any contact with that email.
	var contact models.Contact
	err := database.DB.Where("email = ? AND type = ?", req.Email, "facility_incharge").First(&contact).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// fallback: any contact with that email (if you prefer strict check, remove this fallback)
			err = database.DB.Where("email = ?", req.Email).First(&contact).Error
		}
	}
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If you want to avoid revealing whether the email exists, return a generic message here.
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "No facility in-charge found with that email"})
		}
		// DB error
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Server error"})
	}

	// 2) Generate secure token and persist
	token := helpers.GenerateSecureToken(32)
	pt := models.PasswordToken{
		Token:     token,
		Email:     contact.Email,
		ExpiresAt: time.Now().Add(24 * time.Hour), // adjust expiry as needed
	}
	if err := database.DB.Create(&pt).Error; err != nil {
		log.Println("Failed to create password token:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save reset token"})
	}

	// 3) Build reset link and email (URL-escape token)
	defaultDomain := "http://localhost:6060"
	domain := getEnv("SERVER_DOMAIN", &defaultDomain)
	resetLink := fmt.Sprintf("%s/reset-password.html?token=%s", domain, url.QueryEscape(token))

	emailBody := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6;">
		 <p>Dear %s,</p>
		 <p>We received a request to reset your password. Click the link below to set a new password:</p>
		 <p><a href="%s">%s</a></p>
		 <p>This link will expire in 24 hours.</p>
		 <p>If you did not request this, please ignore this email.</p>
		 </body>
		 </html>
	`, contact.Name, resetLink, resetLink)

	// 4) Send the email asynchronously (so the HTTP request returns quickly)
	go func(to string) {
		if err := helpers.SendEmail(to, "Password Reset Request", emailBody); err != nil {
			log.Println("ForgotPassword: email send failed:", err)
			// optionally: notify / retry logic
		}
	}(contact.Email)

	return c.JSON(fiber.Map{"message": "Reset link sent (if the email is registered)."})
}
