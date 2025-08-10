package fhir

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"patient-registry.com/database"
	"patient-registry.com/models"
)

// FHIR DTOs
type FHIRPatient struct {
	ResourceType         string           `json:"resourceType"`
	ID                   string           `json:"id,omitempty"`
	Identifier           []FHIRIdentifier `json:"identifier,omitempty"`
	Active               bool             `json:"active"`
	Name                 []FHIRHumanName  `json:"name,omitempty"`
	Gender               string           `json:"gender,omitempty"`
	BirthDate            string           `json:"birthDate,omitempty"`
	ManagingOrganization *FHIRReference   `json:"managingOrganization,omitempty"`
}

type FHIRCondition struct {
	ResourceType       string                `json:"resourceType"`
	ID                 string                `json:"id,omitempty"`
	ClinicalStatus     *FHIRCodeableConcept  `json:"clinicalStatus,omitempty"`
	VerificationStatus *FHIRCodeableConcept  `json:"verificationStatus,omitempty"`
	Category           []FHIRCodeableConcept `json:"category,omitempty"`
	Code               *FHIRCodeableConcept  `json:"code,omitempty"`
	BodySite           []FHIRCodeableConcept `json:"bodySite,omitempty"`
	Subject            *FHIRReference        `json:"subject,omitempty"`
	OnsetDateTime      string                `json:"onsetDateTime,omitempty"`
	RecordedDate       string                `json:"recordedDate,omitempty"`
	Recorder           *FHIRReference        `json:"recorder,omitempty"`
	Stage              []FHIRConditionStage  `json:"stage,omitempty"`
}

type FHIROrganization struct {
	ResourceType string             `json:"resourceType"`
	ID           string             `json:"id,omitempty"`
	Identifier   []FHIRIdentifier   `json:"identifier,omitempty"`
	Active       bool               `json:"active"`
	Name         string             `json:"name,omitempty"`
	Telecom      []FHIRContactPoint `json:"telecom,omitempty"`
	Address      []FHIRAddress      `json:"address,omitempty"`
}

type FHIRPractitioner struct {
	ResourceType  string                          `json:"resourceType"`
	ID            string                          `json:"id,omitempty"`
	Identifier    []FHIRIdentifier                `json:"identifier,omitempty"`
	Active        bool                            `json:"active"`
	Name          []FHIRHumanName                 `json:"name,omitempty"`
	Telecom       []FHIRContactPoint              `json:"telecom,omitempty"`
	Qualification []FHIRPractitionerQualification `json:"qualification,omitempty"`
}

type FHIRServiceRequest struct {
	ResourceType    string                `json:"resourceType"`
	ID              string                `json:"id,omitempty"`
	Status          string                `json:"status"`
	Intent          string                `json:"intent"`
	Category        []FHIRCodeableConcept `json:"category,omitempty"`
	Code            *FHIRCodeableConcept  `json:"code,omitempty"`
	Subject         *FHIRReference        `json:"subject,omitempty"`
	Requester       *FHIRReference        `json:"requester,omitempty"`
	AuthoredOn      string                `json:"authoredOn,omitempty"`
	ReasonReference []FHIRReference       `json:"reasonReference,omitempty"`
}

// Supporting structures
type FHIRIdentifier struct {
	Use    string               `json:"use,omitempty"`
	Type   *FHIRCodeableConcept `json:"type,omitempty"`
	System string               `json:"system,omitempty"`
	Value  string               `json:"value,omitempty"`
}

type FHIRHumanName struct {
	Use    string   `json:"use,omitempty"`
	Family string   `json:"family,omitempty"`
	Given  []string `json:"given,omitempty"`
}

type FHIRReference struct {
	Reference string `json:"reference,omitempty"`
	Display   string `json:"display,omitempty"`
}

type FHIRCodeableConcept struct {
	Coding []FHIRCoding `json:"coding,omitempty"`
	Text   string       `json:"text,omitempty"`
}

type FHIRCoding struct {
	System  string `json:"system,omitempty"`
	Code    string `json:"code,omitempty"`
	Display string `json:"display,omitempty"`
}

type FHIRContactPoint struct {
	System string `json:"system,omitempty"`
	Value  string `json:"value,omitempty"`
	Use    string `json:"use,omitempty"`
}

type FHIRAddress struct {
	Use        string   `json:"use,omitempty"`
	Type       string   `json:"type,omitempty"`
	Line       []string `json:"line,omitempty"`
	City       string   `json:"city,omitempty"`
	District   string   `json:"district,omitempty"`
	State      string   `json:"state,omitempty"`
	PostalCode string   `json:"postalCode,omitempty"`
	Country    string   `json:"country,omitempty"`
}

type FHIRConditionStage struct {
	Summary *FHIRCodeableConcept `json:"summary,omitempty"`
	Type    *FHIRCodeableConcept `json:"type,omitempty"`
}

type FHIRPractitionerQualification struct {
	Code   *FHIRCodeableConcept `json:"code,omitempty"`
	Period *FHIRPeriod          `json:"period,omitempty"`
}

type FHIRPeriod struct {
	Start string `json:"start,omitempty"`
	End   string `json:"end,omitempty"`
}

type FHIRBundle struct {
	ResourceType string      `json:"resourceType"`
	ID           string      `json:"id,omitempty"`
	Type         string      `json:"type"`
	Total        int         `json:"total,omitempty"`
	Entry        []FHIREntry `json:"entry,omitempty"`
}

type FHIREntry struct {
	FullUrl  string      `json:"fullUrl,omitempty"`
	Resource interface{} `json:"resource,omitempty"`
}

// FHIR Endpoints

// GetFHIRPatients - GET /fhir/Patient
func GetFHIRPatients(c *fiber.Ctx) error {
	var patients []models.CancerPatient
	database.DB.
		Preload("Patient").
		Preload("Patient.Facility").
		Preload("Patient.Doctors").
		Preload("CancerDiagnosis").
		Find(&patients)

	var entries []FHIREntry
	for _, patient := range patients {
		fhirPatient := convertToFHIRPatient(patient)
		entries = append(entries, FHIREntry{
			FullUrl:  "Patient/" + strconv.Itoa(int(patient.ID)),
			Resource: fhirPatient,
		})
	}

	bundle := FHIRBundle{
		ResourceType: "Bundle",
		Type:         "searchset",
		Total:        len(entries),
		Entry:        entries,
	}

	return c.JSON(bundle)
}

// GetFHIRPatientByID - GET /fhir/Patient/:id
func GetFHIRPatientByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var patient models.CancerPatient

	if err := database.DB.
		Preload("Patient").
		Preload("Patient.Facility").
		Preload("Patient.Doctors").
		Preload("CancerDiagnosis").
		First(&patient, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"resourceType": "OperationOutcome",
			"issue": []fiber.Map{
				{
					"severity": "error",
					"code":     "not-found",
					"details": fiber.Map{
						"text": "Patient not found",
					},
				},
			},
		})
	}

	fhirPatient := convertToFHIRPatient(patient)
	return c.JSON(fhirPatient)
}

// GetFHIRConditions - GET /fhir/Condition
func GetFHIRConditions(c *fiber.Ctx) error {
	patientParam := c.Query("patient")

	var diagnoses []models.CancerDiagnosis
	query := database.DB.Preload("CancerPatient").Preload("CancerPatient.Patient")

	if patientParam != "" {
		query = query.Joins("JOIN cancer_patients ON cancer_patients.id = cancer_diagnoses.cancer_patient_id").
			Where("cancer_patients.id = ?", patientParam)
	}

	query.Find(&diagnoses)

	var entries []FHIREntry
	for _, diagnosis := range diagnoses {
		fhirCondition := convertToFHIRCondition(diagnosis)
		entries = append(entries, FHIREntry{
			FullUrl:  "Condition/" + strconv.Itoa(int(diagnosis.ID)),
			Resource: fhirCondition,
		})
	}

	bundle := FHIRBundle{
		ResourceType: "Bundle",
		Type:         "searchset",
		Total:        len(entries),
		Entry:        entries,
	}

	return c.JSON(bundle)
}

// GetFHIRConditionByID - GET /fhir/Condition/:id
func GetFHIRConditionByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var diagnosis models.CancerDiagnosis

	if err := database.DB.
		Preload("CancerPatient").
		Preload("CancerPatient.Patient").
		First(&diagnosis, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"resourceType": "OperationOutcome",
			"issue": []fiber.Map{
				{
					"severity": "error",
					"code":     "not-found",
					"details": fiber.Map{
						"text": "Condition not found",
					},
				},
			},
		})
	}

	fhirCondition := convertToFHIRCondition(diagnosis)
	return c.JSON(fhirCondition)
}

// GetFHIROrganizations - GET /fhir/Organization
func GetFHIROrganizations(c *fiber.Ctx) error {
	var facilities []models.Facility
	database.DB.
		Preload("Identification").
		Preload("Contacts").
		Find(&facilities)

	var entries []FHIREntry
	for _, facility := range facilities {
		fhirOrg := convertToFHIROrganization(facility)
		entries = append(entries, FHIREntry{
			FullUrl:  "Organization/" + strconv.Itoa(int(facility.ID)),
			Resource: fhirOrg,
		})
	}

	bundle := FHIRBundle{
		ResourceType: "Bundle",
		Type:         "searchset",
		Total:        len(entries),
		Entry:        entries,
	}

	return c.JSON(bundle)
}

// GetFHIROrganizationByID - GET /fhir/Organization/:id
func GetFHIROrganizationByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var facility models.Facility

	if err := database.DB.
		Preload("Identification").
		Preload("Contacts").
		First(&facility, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"resourceType": "OperationOutcome",
			"issue": []fiber.Map{
				{
					"severity": "error",
					"code":     "not-found",
					"details": fiber.Map{
						"text": "Organization not found",
					},
				},
			},
		})
	}

	fhirOrg := convertToFHIROrganization(facility)
	return c.JSON(fhirOrg)
}

// GetFHIRPractitioners - GET /fhir/Practitioner
func GetFHIRPractitioners(c *fiber.Ctx) error {
	var doctors []models.Doctors
	database.DB.Find(&doctors)

	var entries []FHIREntry
	for _, doctor := range doctors {
		fhirPractitioner := convertToFHIRPractitioner(doctor)
		entries = append(entries, FHIREntry{
			FullUrl:  "Practitioner/" + strconv.Itoa(int(doctor.ID)),
			Resource: fhirPractitioner,
		})
	}

	bundle := FHIRBundle{
		ResourceType: "Bundle",
		Type:         "searchset",
		Total:        len(entries),
		Entry:        entries,
	}

	return c.JSON(bundle)
}

// GetFHIRPractitionerByID - GET /fhir/Practitioner/:id
func GetFHIRPractitionerByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var doctor models.Doctors

	if err := database.DB.First(&doctor, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"resourceType": "OperationOutcome",
			"issue": []fiber.Map{
				{
					"severity": "error",
					"code":     "not-found",
					"details": fiber.Map{
						"text": "Practitioner not found",
					},
				},
			},
		})
	}

	fhirPractitioner := convertToFHIRPractitioner(doctor)
	return c.JSON(fhirPractitioner)
}

// GetFHIRServiceRequests - GET /fhir/ServiceRequest
func GetFHIRServiceRequests(c *fiber.Ctx) error {
	patientParam := c.Query("patient")

	var referrals []models.Referral
	query := database.DB.Preload("Patient")

	if patientParam != "" {
		query = query.Where("patient_id = ?", patientParam)
	}

	query.Find(&referrals)

	var entries []FHIREntry
	for _, referral := range referrals {
		fhirServiceRequest := convertToFHIRServiceRequest(referral)
		entries = append(entries, FHIREntry{
			FullUrl:  "ServiceRequest/" + strconv.Itoa(int(referral.ID)),
			Resource: fhirServiceRequest,
		})
	}

	bundle := FHIRBundle{
		ResourceType: "Bundle",
		Type:         "searchset",
		Total:        len(entries),
		Entry:        entries,
	}

	return c.JSON(bundle)
}

// GetFHIRServiceRequestByID - GET /fhir/ServiceRequest/:id
func GetFHIRServiceRequestByID(c *fiber.Ctx) error {
	id := c.Params("id")
	var referral models.Referral

	if err := database.DB.
		Preload("Patient").
		First(&referral, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"resourceType": "OperationOutcome",
			"issue": []fiber.Map{
				{
					"severity": "error",
					"code":     "not-found",
					"details": fiber.Map{
						"text": "ServiceRequest not found",
					},
				},
			},
		})
	}

	fhirServiceRequest := convertToFHIRServiceRequest(referral)
	return c.JSON(fhirServiceRequest)
}

// Conversion functions
func convertToFHIRPatient(cancerPatient models.CancerPatient) FHIRPatient {
	patient := FHIRPatient{
		ResourceType: "Patient",
		ID:           strconv.Itoa(int(cancerPatient.ID)),
		Active:       true,
	}

	// Add identifiers
	if cancerPatient.Patient.RegistrationID != "" {
		patient.Identifier = append(patient.Identifier, FHIRIdentifier{
			Use: "usual",
			Type: &FHIRCodeableConcept{
				Text: "Registration ID",
			},
			Value: cancerPatient.Patient.RegistrationID,
		})
	}

	if cancerPatient.Patient.PatientInfo.NationalId != "" {
		patient.Identifier = append(patient.Identifier, FHIRIdentifier{
			Use: "official",
			Type: &FHIRCodeableConcept{
				Text: "National ID",
			},
			Value: cancerPatient.Patient.PatientInfo.NationalId,
		})
	}

	// Add name
	var givenNames []string
	if cancerPatient.Patient.PatientInfo.FirstName != "" {
		givenNames = append(givenNames, cancerPatient.Patient.PatientInfo.FirstName)
	}
	if cancerPatient.Patient.PatientInfo.MiddleName != "" {
		givenNames = append(givenNames, cancerPatient.Patient.PatientInfo.MiddleName)
	}

	if len(givenNames) > 0 || cancerPatient.Patient.PatientInfo.LastName != "" {
		patient.Name = []FHIRHumanName{
			{
				Use:    "official",
				Family: cancerPatient.Patient.PatientInfo.LastName,
				Given:  givenNames,
			},
		}
	}

	// Add gender
	patient.Gender = mapGenderToFHIR(cancerPatient.Patient.PatientInfo.Gender)

	// Add birth date
	if !cancerPatient.Patient.PatientInfo.DOB.IsZero() {
		patient.BirthDate = cancerPatient.Patient.PatientInfo.DOB.Format("2006-01-02")
	}

	// Add managing organization reference
	if cancerPatient.Patient.Facility.ID != 0 {
		patient.ManagingOrganization = &FHIRReference{
			Reference: "Organization/" + strconv.Itoa(int(cancerPatient.Patient.Facility.ID)),
			Display:   cancerPatient.Patient.Facility.Name,
		}
	}

	return patient
}

func convertToFHIRCondition(diagnosis models.CancerDiagnosis) FHIRCondition {
	condition := FHIRCondition{
		ResourceType: "Condition",
		ID:           strconv.Itoa(int(diagnosis.ID)),
		ClinicalStatus: &FHIRCodeableConcept{
			Coding: []FHIRCoding{
				{
					System:  "http://terminology.hl7.org/CodeSystem/condition-clinical",
					Code:    "active",
					Display: "Active",
				},
			},
		},
		VerificationStatus: &FHIRCodeableConcept{
			Coding: []FHIRCoding{
				{
					System:  "http://terminology.hl7.org/CodeSystem/condition-ver-status",
					Code:    "confirmed",
					Display: "Confirmed",
				},
			},
		},
		Category: []FHIRCodeableConcept{
			{
				Coding: []FHIRCoding{
					{
						System:  "http://terminology.hl7.org/CodeSystem/condition-category",
						Code:    "encounter-diagnosis",
						Display: "Encounter Diagnosis",
					},
				},
			},
		},
	}

	// Add cancer-specific code
	if diagnosis.Histology != "" {
		condition.Code = &FHIRCodeableConcept{
			Text: diagnosis.Histology,
		}
	}

	// Add primary site as body site
	if diagnosis.PrimarySite != "" {
		condition.BodySite = []FHIRCodeableConcept{
			{
				Text: diagnosis.PrimarySite,
			},
		}
	}

	// Add patient reference
	if diagnosis.CancerPatient.ID != 0 {
		condition.Subject = &FHIRReference{
			Reference: "Patient/" + strconv.Itoa(int(diagnosis.CancerPatient.ID)),
		}
	}

	// Add onset date
	if !diagnosis.DateOfDiagnosis.IsZero() {
		condition.OnsetDateTime = diagnosis.DateOfDiagnosis.Format(time.RFC3339)
		condition.RecordedDate = diagnosis.DateOfDiagnosis.Format(time.RFC3339)
	}

	// Add stage information
	if diagnosis.Stage != "" {
		condition.Stage = []FHIRConditionStage{
			{
				Summary: &FHIRCodeableConcept{
					Text: diagnosis.Stage,
				},
			},
		}
	}

	return condition
}

func convertToFHIROrganization(facility models.Facility) FHIROrganization {
	org := FHIROrganization{
		ResourceType: "Organization",
		ID:           strconv.Itoa(int(facility.ID)),
		Active:       true,
		Name:         facility.Name,
	}

	// Add identifier from facility identification
	if facility.Identification.RegistryID != "" {
		org.Identifier = []FHIRIdentifier{
			{
				Use:   "official",
				Value: facility.Identification.RegistryID,
			},
		}
	}

	// Add contact information
	for _, contact := range facility.Contacts {
		if contact.Email != "" {
			org.Telecom = append(org.Telecom, FHIRContactPoint{
				System: "email",
				Value:  contact.Email,
				Use:    "work",
			})
		}
		if contact.Phone != "" {
			org.Telecom = append(org.Telecom, FHIRContactPoint{
				System: "phone",
				Value:  contact.Phone,
				Use:    "work",
			})
		}
	}

	return org
}

func convertToFHIRPractitioner(doctor models.Doctors) FHIRPractitioner {
	practitioner := FHIRPractitioner{
		ResourceType: "Practitioner",
		ID:           strconv.Itoa(int(doctor.ID)),
		Active:       true,
	}

	// Add name
	if doctor.Name != "" {
		practitioner.Name = []FHIRHumanName{
			{
				Use:    "official",
				Family: doctor.Name,
			},
		}
	}

	// Add contact
	if doctor.Email != "" {
		practitioner.Telecom = []FHIRContactPoint{
			{
				System: "email",
				Value:  doctor.Email,
				Use:    "work",
			},
		}
	}

	// Add qualification
	if doctor.Title != "" {
		practitioner.Qualification = []FHIRPractitionerQualification{
			{
				Code: &FHIRCodeableConcept{
					Text: doctor.Title,
				},
			},
		}
	}

	return practitioner
}

func convertToFHIRServiceRequest(referral models.Referral) FHIRServiceRequest {
	serviceRequest := FHIRServiceRequest{
		ResourceType: "ServiceRequest",
		ID:           strconv.Itoa(int(referral.ID)),
		Status:       "active",
		Intent:       "order",
	}

	// Add category
	serviceRequest.Category = []FHIRCodeableConcept{
		{
			Coding: []FHIRCoding{
				{
					System:  "http://snomed.info/sct",
					Code:    "3457005",
					Display: "Patient referral",
				},
			},
		},
	}

	// Add patient reference
	if referral.PatientID != 0 {
		serviceRequest.Subject = &FHIRReference{
			Reference: "Patient/" + strconv.Itoa(int(referral.PatientID)),
		}
	}

	// Add creation date
	if !referral.CreatedAt.IsZero() {
		serviceRequest.AuthoredOn = referral.CreatedAt.Format(time.RFC3339)
	}

	return serviceRequest
}

func mapGenderToFHIR(gender string) string {
	switch strings.ToLower(gender) {
	case "male", "m":
		return "male"
	case "female", "f":
		return "female"
	case "other", "o":
		return "other"
	default:
		return "unknown"
	}
}
