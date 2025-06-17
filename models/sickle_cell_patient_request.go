package models

// PatientCreateRequest represents the request structure for creating a patient
type SickleCellPatientCreateRequest struct {
	PatientCreateRequest
	SickleCellDiagnosis SickleCellDiagnosisRequest `json:"diagnosis" validate:"required"`
}

// DiagnosisRequest represents the diagnosis information in the request
type SickleCellDiagnosisRequest struct {
	DateOfDiagnosis        string `json:"date_of_diagnosis" validate:"required"` // Format: YYYY-MM-DD
	DiagnosticConfirmation string `json:"diagnostic_confirmation" validate:"required"`
	Stage                  string `json:"stage" validate:"required"`
	DiseaseType            string `json:"disease_type" validate:"required"` // e.g., "Sickle Cell Anemia", "Sickle Cell Trait"
	Laterality             string `json:"laterality,omitempty"`
}
