package models

// PatientCreateRequest represents the request structure for creating a patient
type CancerPatientCreateRequest struct {
	PatientCreateRequest
	CancerDiagnosis CancerDiagnosisRequest `json:"diagnosis" validate:"required"`
}

// DiagnosisRequest represents the diagnosis information in the request
type CancerDiagnosisRequest struct {
	PrimarySite            string `json:"primary_site" validate:"required"`
	Histology              string `json:"histology" validate:"required"`
	DateOfDiagnosis        string `json:"date_of_diagnosis" validate:"required"` // Format: YYYY-MM-DD
	DiagnosticConfirmation string `json:"diagnostic_confirmation" validate:"required"`
	Stage                  string `json:"stage" validate:"required"`
	Laterality             string `json:"laterality,omitempty"`
}
