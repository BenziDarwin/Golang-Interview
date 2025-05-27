package models

// PatientCreateRequest represents the request structure for creating a patient
type PatientCreateRequest struct {
	FacilityID       string             `json:"facility_id" validate:"required"`
	PatientInfo      PatientInfoRequest `json:"patient_info" validate:"required"`
	Diagnosis        DiagnosisRequest   `json:"diagnosis" validate:"required"`
	Treatment        TreatmentRequest   `json:"treatment" validate:"required"`
	Submitter        Submitter          `json:"submitter" validate:"required"`
	RegistrationID   string             `json:"registration_id,omitempty"`
	RegistrationDate string             `json:"registration_date,omitempty"`
}

// PatientInfoRequest represents the patient information in the request
type PatientInfoRequest struct {
	FirstName  string `json:"first_name" validate:"required"`
	MiddleName string `json:"middle_name,omitempty"`
	LastName   string `json:"last_name" validate:"required"`
	DOB        string `json:"dob" validate:"required"` // Format: YYYY-MM-DD
	Gender     string `json:"gender" validate:"required,oneof=male female other"`
	NationalId string `json:"national_id" validate:"required"`
}

// DiagnosisRequest represents the diagnosis information in the request
type DiagnosisRequest struct {
	PrimarySite            string `json:"primary_site" validate:"required"`
	Histology              string `json:"histology" validate:"required"`
	DateOfDiagnosis        string `json:"date_of_diagnosis" validate:"required"` // Format: YYYY-MM-DD
	DiagnosticConfirmation string `json:"diagnostic_confirmation" validate:"required"`
	Stage                  string `json:"stage" validate:"required"`
	Laterality             string `json:"laterality,omitempty"`
}

// TreatmentRequest represents the treatment information in the request
type TreatmentRequest struct {
	Types              []string `json:"types" validate:"required,min=1"`
	FirstTreatmentDate string   `json:"first_treatment_date" validate:"required"` // Format: YYYY-MM-DD
	TreatingPhysician  string   `json:"treating_physician" validate:"required"`
	Notes              string   `json:"notes,omitempty"`
	ReportingSource    string   `json:"reporting_source" validate:"required"`
}

// SubmitterRequest represents the submitter information in the request
type SubmitterRequest struct {
	Name  string `json:"name" validate:"required"`
	Title string `json:"title" validate:"required"`
	Email string `json:"email" validate:"required,email"`
}
