package models

import (
	"time"

	"gorm.io/gorm"
)

type Patient struct {
	gorm.Model
	FacilityID       string      `json:"facility_id"`
	PatientInfo      PatientInfo `json:"patient_info" gorm:"embedded;embeddedPrefix:patient_"`
	Address          Address     `json:"address" gorm:"embedded;embeddedPrefix:address_"`
	Diagnosis        Diagnosis   `json:"diagnosis" gorm:"embedded;embeddedPrefix:diagnosis_"`
	Treatment        Treatment   `json:"treatment" gorm:"embedded;embeddedPrefix:treatment_"`
	Submitter        Submitter   `json:"submitter" gorm:"embedded;embeddedPrefix:submitter_"`
	RegistrationID   string      `json:"registration_id" gorm:"unique"`
	RegistrationDate time.Time   `json:"registration_date"`
	Facility         Facility    `json:"facility" gorm:"foreignKey:FacilityID;references:ID"`
}

type PatientInfo struct {
	FirstName           string    `json:"first_name"`
	MiddleName          string    `json:"middle_name"`
	LastName            string    `json:"last_name"`
	DOB                 time.Time `json:"dob"`
	Gender              string    `json:"gender"`
	SSNLast4            string    `json:"ssn_last_4"`
	MedicalRecordNumber string    `json:"medical_record_number"`
}

type Address struct {
	Street string `json:"street"`
	City   string `json:"city"`
	State  string `json:"state"`
	Zip    string `json:"zip"`
}

type Diagnosis struct {
	PrimarySite            string    `json:"primary_site"`
	Histology              string    `json:"histology"`
	DateOfDiagnosis        time.Time `json:"date_of_diagnosis"`
	DiagnosticConfirmation string    `json:"diagnostic_confirmation"`
	Stage                  string    `json:"stage"`
	Laterality             string    `json:"laterality"`
}

type Treatment struct {
	Types              string    `json:"types" gorm:"type:text"` // Store as JSON string or comma-separated
	FirstTreatmentDate time.Time `json:"first_treatment_date"`
	TreatingPhysician  string    `json:"treating_physician"`
	Notes              string    `json:"notes" gorm:"type:text"`
	ReportingSource    string    `json:"reporting_source"`
}

type Submitter struct {
	Name  string `json:"name"`
	Title string `json:"title"`
	Email string `json:"email"`
}
