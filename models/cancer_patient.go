package models

import (
	"time"

	"gorm.io/gorm"
)

type CancerPatient struct {
	gorm.Model
	CancerDiagnosis []CancerDiagnosis `json:"diagnosis" gorm:"foreignKey:CancerPatientID"`
	PatientID       uint              `json:"patient_id"`
	Patient         Patient           `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}

type CancerDiagnosis struct {
	gorm.Model
	PrimarySite            string        `json:"primary_site"`
	Histology              string        `json:"histology"`
	DateOfDiagnosis        time.Time     `json:"date_of_diagnosis"`
	DiagnosticConfirmation string        `json:"diagnostic_confirmation"`
	Stage                  string        `json:"stage"`
	Laterality             string        `json:"laterality"`
	CancerPatientID        uint          `json:"cancer_patient_id"`
	CancerPatient          CancerPatient `json:"cancer_patient" gorm:"foreignKey:CancerPatientID;references:ID"`
}
