package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Contact represents different types of contacts for a facility
type Contact struct {
	gorm.Model
	FacilityID uint   `json:"facility_id"`
	Type       string `json:"type"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password,omitempty"` // Optional, used for registry lead
	Phone      string `json:"phone"`
}

// Facility represents the main facility structure
type Facility struct {
	gorm.Model
	Name              string         `json:"name"`
	ProviderSpecialty string         `json:"provider_specialty"`
	Status            string         `json:"status"`
	YearlyCases       string         `json:"yearly_cases"`
	GenomicTests      pq.StringArray `gorm:"type:text[]" json:"genomic_tests"`

	// Relationships
	Contacts       []Contact              `json:"contacts" gorm:"foreignKey:FacilityID;constraint:OnDelete:CASCADE"`
	Identification FacilityIdentification `json:"identification" gorm:"foreignKey:FacilityID;constraint:OnDelete:CASCADE"`
}

type FacilityIdentification struct {
	gorm.Model
	NPI        string `json:"npi"`
	RegistryID string `json:"registry_id"` // Optional for backward compatibility
	FacilityID uint   `json:"facility_id"`

	// Optional: Add back reference
	Facility *Facility `json:"-" gorm:"foreignKey:FacilityID"`
}

// Helper methods for easier contact access
func (f *Facility) GetFacilityInchargeContact() *Contact {
	for _, contact := range f.Contacts {
		if contact.Type == "facility_incharge" {
			return &contact
		}
	}
	return nil
}

func (f *Facility) GetRegistryFocalPersonContact() *Contact {
	for _, contact := range f.Contacts {
		if contact.Type == "registry_focal_person" {
			return &contact
		}
	}
	return nil
}

func (f *Facility) GetAlternativeRegistryFocalPersonContact() *Contact {
	for _, contact := range f.Contacts {
		if contact.Type == "alt_registry_focal_person" {
			return &contact
		}
	}
	return nil
}

// SetContacts is a helper method to set all contacts at once
func (f *Facility) SetContacts(facilityIncharge, registryFocalPerson, altRegistryFocalPerson Contact) {
	facilityIncharge.Type = "facility_incharge"
	registryFocalPerson.Type = "registry_focal_person"
	altRegistryFocalPerson.Type = "alt_registry_focal_person"

	f.Contacts = []Contact{facilityIncharge, registryFocalPerson, altRegistryFocalPerson}
}

type FacilityCreateRequest struct {
	Name              string   `json:"name"`
	ProviderSpecialty string   `json:"provider_specialty"`
	Status            string   `json:"status"`
	YearlyCases       string   `json:"yearly_cases"`
	GenomicTests      []string `json:"genomic_tests"`

	Contact struct {
		FacilityIncharge struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		} `json:"facility_incharge"`
		RegistryFocalPerson struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		} `json:"registry_focal_person"`
		AltRegistryFocalPerson struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		} `json:"alt_registry_focal_person"`
	} `json:"contact"`

	Identification struct {
		FacilityID string `json:"facility_id"`
		RegistryID string `json:"registry_id"`   // Optional for backward compatibility
		NPI        string `json:"npi,omitempty"` // Optional for backward compatibility
	} `json:"identification"`
}

// FacilityUpdateRequest represents the request structure for updating a facility

type FacilityUpdateRequest struct {
	Name              string                `json:"name,omitempty"`
	ProviderSpecialty string                `json:"provider_specialty,omitempty"`
	Status            string                `json:"status,omitempty"`
	YearlyCases       string                `json:"yearly_cases,omitempty"`
	GenomicTests      []string              `json:"genomic_tests,omitempty"`
	Contact           *ContactUpdate        `json:"contacts,omitempty"`
	Identification    *IdentificationUpdate `json:"identification,omitempty"`
}

type ContactUpdate struct {
	FacilityIncharge       *ContactInput `json:"facility_incharge,omitempty"`
	RegistryFocalPerson    *ContactInput `json:"registry_focal_person,omitempty"`
	AltRegistryFocalPerson *ContactInput `json:"alt_registry_focal_person,omitempty"`
}

type IdentificationUpdate struct {
	RegistryID string `json:"registry_id,omitempty"`
	NPI        string `json:"npi,omitempty"`
}

type ContactInput struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
	Phone string `json:"phone,omitempty"`
}

type PasswordToken struct {
	gorm.Model
	Token     string `gorm:"uniqueIndex"`
	Email     string
	ExpiresAt time.Time
	CreatedAt time.Time
}
