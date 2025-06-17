package helpers

import (
	"fmt"
	"net/smtp"
	"os"
)

// SendEmail sends an HTML email using SMTP
func SendEmail(to, subject, body string) error {
	username := os.Getenv("SMTP_USERNAME") // usually your email address
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	if username == "" || smtpHost == "" || smtpPort == "" {
		return fmt.Errorf("email config is missing: SMTP_USERNAME=%q, SMTP_HOST=%q, SMTP_PORT=%q", username, smtpHost, smtpPort)
	}

	from := username // typically same as username

	// Include MIME headers to specify content type
	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
		"\r\n" +
		body + "\r\n")

	// Set up authentication
	var auth smtp.Auth
	if password != "" {
		auth = smtp.PlainAuth("", username, password, smtpHost)
	}

	addr := smtpHost + ":" + smtpPort

	// Send the email
	err := smtp.SendMail(addr, auth, from, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email via SMTP (%s): %w", addr, err)
	}

	return nil
}
