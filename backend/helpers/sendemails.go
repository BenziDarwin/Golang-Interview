package helpers

import (
	"fmt"
	"net/smtp"
	"os"
)

// SendEmail sends an email using SMTP
func SendEmail(to, subject, body string) error {
	username := os.Getenv("SMTP_USERNAME") // usually your email address
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	if username == "" || smtpHost == "" || smtpPort == "" {
		return fmt.Errorf("email config is missing: SMTP_USERNAME=%q, SMTP_HOST=%q, SMTP_PORT=%q", username, smtpHost, smtpPort)
	}

	from := username // commonly, from = username

	// Build the email message
	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")

	// Create the SMTP auth (only if password is provided)
	var auth smtp.Auth
	if password != "" {
		auth = smtp.PlainAuth("", username, password, smtpHost)
	}

	addr := smtpHost + ":" + smtpPort

	err := smtp.SendMail(addr, auth, from, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email via SMTP (%s): %w", addr, err)
	}

	return nil
}
