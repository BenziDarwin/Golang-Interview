package models

// PatientCreateRequest represents the request structure for creating a patient
type PatientCreateRequest struct {
	FacilityID       uint               `json:"facility_id" validate:"required"`
	PatientInfo      PatientInfoRequest `json:"patient_info" validate:"required"`
	Submitter        Submitter          `json:"submitter" validate:"required"`
	RegistrationID   string             `json:"registration_id,omitempty"`
	RegistrationDate string             `json:"registration_date,omitempty"`
}

// PatientInfoRequest represents the patient information in the request
type PatientInfoRequest struct {
	FirstName  string  `json:"first_name" validate:"required"`
	MiddleName string  `json:"middle_name,omitempty"`
	LastName   string  `json:"last_name" validate:"required"`
	DOB        *string `json:"dob,omitempty"` // Format: YYYY-MM-DD
	Age        int     `json:"age,omitempty"` // Age can be calculated from DOB
	Gender     string  `json:"gender" validate:"required,oneof=male female other"`
	NationalId string  `json:"national_id" validate:"required"`
}

// SubmitterRequest represents the submitter information in the request
type SubmitterRequest struct {
	Name  string `json:"name" validate:"required"`
	Title string `json:"title" validate:"required"`
	Email string `json:"email" validate:"required,email"`
}
