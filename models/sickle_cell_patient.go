package models

import (
	"time"

	"gorm.io/gorm"
)

type SickleCellPatient struct {
	gorm.Model
	SickleCellDiagnosis []SickleCellDiagnosis `json:"diagnosis" gorm:"foreignKey:SickleCellPatientID"`
	PatientID           uint                  `json:"patient_id"`
	Patient             Patient               `json:"patient" gorm:"foreignKey:PatientID;references:ID"`
}

type SickleCellDiagnosis struct {
	gorm.Model
	DateOfDiagnosis        time.Time         `json:"date_of_diagnosis"`
	DiagnosticConfirmation string            `json:"diagnostic_confirmation"`
	Stage                  string            `json:"stage"`
	DiseaseType            string            `json:"disease_type"`
	SickleCellPatientID    uint              `json:"sickle_cell_patient_id"`
	SickleCellPatient      SickleCellPatient `json:"sickle_cell_patient" gorm:"foreignKey:SickleCellPatientID;references:ID"`
}
