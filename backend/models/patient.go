package models

import (
	"time"

	"gorm.io/gorm"
)

type Patient struct {
	gorm.Model
	FacilityID       string      `json:"facility_id"`
	PatientInfo      PatientInfo `json:"patient_info" gorm:"embedded;embeddedPrefix:patient_"`
	Diagnosis        []Diagnosis `json:"diagnosis" gorm:"foreignKey:PatientID"`
	Treatments       []Treatment `json:"treatments" gorm:"foreignKey:PatientID"`
	Submitters       []Submitter `json:"submitter" gorm:"foreignKey:PatientID"`
	RegistrationID   string      `json:"registration_id" gorm:"unique"`
	RegistrationDate time.Time   `json:"registration_date"`
	Facility         Facility    `json:"facility" gorm:"foreignKey:FacilityID;references:ID"`
}

type PatientInfo struct {
	FirstName  string    `json:"first_name"`
	MiddleName string    `json:"middle_name"`
	LastName   string    `json:"last_name"`
	DOB        time.Time `json:"dob"`
	Gender     string    `json:"gender"`
	NationalId string    `json:"national_id"`
}

type Diagnosis struct {
	gorm.Model
	PrimarySite            string    `json:"primary_site"`
	Histology              string    `json:"histology"`
	DateOfDiagnosis        time.Time `json:"date_of_diagnosis"`
	DiagnosticConfirmation string    `json:"diagnostic_confirmation"`
	Stage                  string    `json:"stage"`
	Laterality             string    `json:"laterality"`
	PatientID              uint      `json:"patient_id"`
	Patient                Patient   `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}

type Treatment struct {
	gorm.Model
	Types              string    `json:"types" gorm:"type:text"` // Store as JSON string or comma-separated
	FirstTreatmentDate time.Time `json:"first_treatment_date"`
	TreatingPhysician  string    `json:"treating_physician"`
	Notes              string    `json:"notes" gorm:"type:text"`
	ReportingSource    string    `json:"reporting_source"`
	PatientID          uint      `json:"patient_id"`
	Patient            Patient   `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}

type Submitter struct {
	gorm.Model
	Name      string  `json:"name"`
	Title     string  `json:"title"`
	Email     string  `json:"email"`
	PatientID uint    `json:"patient_id"`
	Patient   Patient `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}
