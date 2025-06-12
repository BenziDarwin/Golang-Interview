package models

import (
	"time"

	"gorm.io/gorm"
)

type Patient struct {
	gorm.Model
	FacilityID       uint        `json:"facility_id"`
	PatientInfo      PatientInfo `json:"patient_info" gorm:"embedded;embeddedPrefix:patient_"`
	Referrals        []Referral  `json:"referrals"` // GORM will figure it out from Referral.PatientID
	Submitters       []Submitter `json:"submitter"` // Same
	RegistrationID   string      `json:"registration_id" gorm:"unique"`
	RegistrationDate time.Time   `json:"registration_date"`
	Facility         Facility    `json:"facility" gorm:"foreignKey:FacilityID;references:ID"`
}

type PatientInfo struct {
	FirstName  string    `json:"first_name"`
	MiddleName string    `json:"middle_name"`
	LastName   string    `json:"last_name"`
	DOB        time.Time `json:"dob,omitempty"` // Date of Birth
	Age        int       `json:"age,omitempty"` // Age can be calculated from DOB
	Gender     string    `json:"gender"`
	NationalId string    `json:"national_id"`
}

type Referral struct {
	gorm.Model
	ReferredBy   string    `json:"referred_by"`   // "Referred By"
	FacilityName string    `json:"facility_name"` // Name of the referring facility
	Diagnosis    string    `json:"diagnosis"`     // Diagnosis description
	ReferredTo   string    `json:"referred_to"`   // Name of referred-to entity
	Country      string    `json:"country"`       // Country of the referred-to facility
	City         string    `json:"city"`          // City of the referred-to facility
	Facility     string    `json:"facility"`      // Receiving Facility
	Doctor       string    `json:"doctor"`        // Doctor handling the referral
	ReferralDate time.Time `json:"referral_date"` // Date of referral
	Status       string    `json:"status"`        // Status of the referral (e.g., "Pending", "Completed")
	PatientID    uint      `json:"patient_id"`    // Foreign key to Patient
	Patient      Patient   `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}

type Submitter struct {
	gorm.Model
	Name      string  `json:"name"`
	Title     string  `json:"title"`
	Email     string  `json:"email"`
	PatientID uint    `json:"patient_id"`
	Patient   Patient `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}
