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
	Type       string `json:"type"` // "meaningful_use", "registry_lead", "network_lead"
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password,omitempty"` // Optional, used for registry lead
	Phone      string `json:"phone"`
}

// Technical represents technical information for a facility
type Technical struct {
	gorm.Model
	FacilityID      uint       `json:"facility_id"`
	SoftwareVendor  string     `json:"software_vendor"`
	SoftwareProduct string     `json:"software_product"`
	SoftwareVersion string     `json:"software_version"`
	IsCEHRT2014     bool       `json:"is_cehrt2014"`
	SupportsHL7CDA  bool       `json:"supports_hl7cda"`
	UpgradeDate     *time.Time `json:"upgrade_date"`
	TransportOption string     `json:"transport_option"`
}

// Facility represents the main facility structure
type Facility struct {
	gorm.Model
	Name              string `json:"name"`
	OrganizationName  string `json:"organization_name"`
	ProviderSpecialty string `json:"provider_specialty"`
	Status            string `json:"status"`

	// Organization details
	OrganizationType pq.StringArray `gorm:"type:text[]" json:"organization_type"`
	YearlyCases      string         `json:"yearly_cases"`
	GenomicTests     pq.StringArray `gorm:"type:text[]" json:"genomic_tests"`

	// Legacy fields (keeping for backward compatibility)
	Address      string `json:"address,omitempty"`
	RegistryType string `json:"registry_type,omitempty"`

	// Relationships
	Contacts       []Contact              `json:"contacts" gorm:"foreignKey:FacilityID;constraint:OnDelete:CASCADE"`
	Technical      Technical              `json:"technical" gorm:"foreignKey:FacilityID;constraint:OnDelete:CASCADE"`
	Identification FacilityIdentification `json:"identification" gorm:"foreignKey:FacilityID;constraint:OnDelete:CASCADE"`
	Patients       []Patient              `json:"patients" gorm:"foreignKey:FacilityID"`
}

type FacilityIdentification struct {
	gorm.Model
	NPI        string `json:"npi"`
	RegistryID string `json:"registry_id"`
	FacilityID uint   `json:"facility_id"`

	// Optional: Add back reference
	Facility *Facility `json:"-" gorm:"foreignKey:FacilityID"`
}

// Helper methods for easier contact access
func (f *Facility) GetMeaningfulUseContact() *Contact {
	for _, contact := range f.Contacts {
		if contact.Type == "meaningful_use" {
			return &contact
		}
	}
	return nil
}

func (f *Facility) GetRegistryLeadContact() *Contact {
	for _, contact := range f.Contacts {
		if contact.Type == "registry_lead" {
			return &contact
		}
	}
	return nil
}

func (f *Facility) GetNetworkLeadContact() *Contact {
	for _, contact := range f.Contacts {
		if contact.Type == "network_lead" {
			return &contact
		}
	}
	return nil
}

// SetContacts is a helper method to set all contacts at once
func (f *Facility) SetContacts(meaningfulUse, registryLead, networkLead Contact) {
	meaningfulUse.Type = "meaningful_use"
	registryLead.Type = "registry_lead"
	networkLead.Type = "network_lead"

	f.Contacts = []Contact{meaningfulUse, registryLead, networkLead}
}

type FacilityCreateRequest struct {
	Name              string   `json:"name"`
	OrganizationName  string   `json:"organization_name"`
	ProviderSpecialty string   `json:"provider_specialty"`
	Status            string   `json:"status"`
	OrganizationType  []string `json:"organization_type"`
	YearlyCases       string   `json:"yearly_cases"`
	GenomicTests      []string `json:"genomic_tests"`

	Contact struct {
		MeaningfulUse struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		} `json:"meaningful_use"`
		RegistryLead struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		} `json:"registry_lead"`
		NetworkLead struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		} `json:"network_lead"`
	} `json:"contact"`

	Technical struct {
		SoftwareVendor  string `json:"software_vendor"`
		SoftwareProduct string `json:"software_product"`
		SoftwareVersion string `json:"software_version"`
		IsCEHRT2014     bool   `json:"is_cehrt2014"`
		SupportsHL7CDA  bool   `json:"supports_hl7cda"`
		UpgradeDate     string `json:"upgrade_date"` // Will parse to time.Time
		TransportOption string `json:"transport_option"`
	} `json:"technical"`

	Identification struct {
		RegistryID string `json:"registry_id"`
		NPI        string `json:"npi,omitempty"` // Optional for backward compatibility
	} `json:"identification"`
}

// FacilityUpdateRequest represents the request structure for updating a facility

type FacilityUpdateRequest struct {
	Name              string                `json:"name,omitempty"`
	OrganizationName  string                `json:"organization_name,omitempty"`
	ProviderSpecialty string                `json:"provider_specialty,omitempty"`
	Status            string                `json:"status,omitempty"`
	OrganizationType  []string              `json:"organization_type,omitempty"`
	YearlyCases       string                `json:"yearly_cases,omitempty"`
	GenomicTests      []string              `json:"genomic_tests,omitempty"`
	Contact           *ContactUpdate        `json:"contacts,omitempty"`
	Technical         *TechnicalUpdate      `json:"technical,omitempty"`
	Identification    *IdentificationUpdate `json:"identification,omitempty"`
}

type ContactUpdate struct {
	MeaningfulUse *ContactInput `json:"meaningful_use,omitempty"`
	RegistryLead  *ContactInput `json:"registry_lead,omitempty"`
	NetworkLead   *ContactInput `json:"network_lead,omitempty"`
}

type TechnicalUpdate struct {
	SoftwareVendor  string `json:"software_vendor,omitempty"`
	SoftwareProduct string `json:"software_product,omitempty"`
	SoftwareVersion string `json:"software_version,omitempty"`
	TransportOption string `json:"transport_option,omitempty"`
	UpgradeDate     string `json:"upgrade_date,omitempty"` // Format: YYYY-MM-DD
	IsCEHRT2014     bool   `json:"is_cehrt2014"`
	SupportsHL7CDA  bool   `json:"supports_hl7cda"`
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
