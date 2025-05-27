package helpers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"math/big"
	"strings"
	"time"
)

const (
	// Password configuration
	minPasswordLength = 12
	maxPasswordLength = 16

	// Character sets for password generation
	lowercase = "abcdefghijklmnopqrstuvwxyz"
	uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	digits    = "0123456789"
	symbols   = "!@#$%^&*()_+-=[]{}|;:,.<>?"
)

// generatePassword creates a cryptographically secure password
// It uses the facility name and registry ID as entropy sources but doesn't expose them directly
func GeneratePassword(name, registryID string) (string, error) {
	// Validate inputs
	if strings.TrimSpace(name) == "" {
		return "", fmt.Errorf("facility name cannot be empty")
	}
	if strings.TrimSpace(registryID) == "" {
		return "", fmt.Errorf("registry ID cannot be empty")
	}

	// Create entropy seed from inputs (used for additional randomness, not direct inclusion)
	entropy := createEntropySeed(name, registryID)

	// Generate random password length between min and max
	lengthRange := maxPasswordLength - minPasswordLength + 1
	randomLength, err := rand.Int(rand.Reader, big.NewInt(int64(lengthRange)))
	if err != nil {
		return "", fmt.Errorf("failed to generate random length: %w", err)
	}
	passwordLength := minPasswordLength + int(randomLength.Int64())

	// Ensure password has at least one character from each required set
	password := make([]byte, passwordLength)
	charSets := []string{lowercase, uppercase, digits, symbols}

	// First, add one character from each required set
	for i, charset := range charSets {
		if i >= passwordLength {
			break
		}
		char, err := getRandomChar(charset)
		if err != nil {
			return "", fmt.Errorf("failed to generate character from set: %w", err)
		}
		password[i] = char
	}

	// Fill remaining positions with random characters from all sets
	allChars := lowercase + uppercase + digits + symbols
	for i := len(charSets); i < passwordLength; i++ {
		char, err := getRandomChar(allChars)
		if err != nil {
			return "", fmt.Errorf("failed to generate random character: %w", err)
		}
		password[i] = char
	}

	// Shuffle the password to avoid predictable patterns
	if err := shuffleBytes(password); err != nil {
		return "", fmt.Errorf("failed to shuffle password: %w", err)
	}

	// Add entropy-based suffix for uniqueness (optional, can be removed if too long)
	entropyChar, err := getRandomChar(digits + lowercase)
	if err != nil {
		return "", fmt.Errorf("failed to generate entropy character: %w", err)
	}

	finalPassword := string(password) + string(entropyChar) + getEntropyDigits(entropy, 2)

	// Final validation
	if len(finalPassword) < minPasswordLength {
		return "", fmt.Errorf("generated password is too short")
	}

	return finalPassword, nil
}

// createEntropySeed creates a deterministic but obscured seed from inputs
func createEntropySeed(name, registryID string) string {
	// Combine inputs with current timestamp for additional entropy
	combined := strings.ToLower(name) + "|" + strings.ToLower(registryID) + "|" + fmt.Sprintf("%d", time.Now().UnixNano())

	// Hash the combined string
	hash := sha256.Sum256([]byte(combined))

	// Return base64 encoded hash (first 16 characters for brevity)
	encoded := base64.URLEncoding.EncodeToString(hash[:])
	if len(encoded) > 16 {
		return encoded[:16]
	}
	return encoded
}

// getEntropyDigits extracts numeric characters from entropy string
func getEntropyDigits(entropy string, count int) string {
	result := ""
	digitCount := 0

	for _, char := range entropy {
		if char >= '0' && char <= '9' {
			result += string(char)
			digitCount++
			if digitCount >= count {
				break
			}
		}
	}

	// If not enough digits found, pad with random digits
	for digitCount < count {
		digit, err := getRandomChar(digits)
		if err == nil {
			result += string(digit)
		}
		digitCount++
	}

	return result
}

// getRandomChar returns a random character from the given charset
func getRandomChar(charset string) (byte, error) {
	if len(charset) == 0 {
		return 0, fmt.Errorf("charset cannot be empty")
	}

	index, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
	if err != nil {
		return 0, err
	}

	return charset[index.Int64()], nil
}

// shuffleBytes randomly shuffles a byte slice using Fisher-Yates algorithm
func shuffleBytes(slice []byte) error {
	for i := len(slice) - 1; i > 0; i-- {
		j, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			return err
		}
		slice[i], slice[int(j.Int64())] = slice[int(j.Int64())], slice[i]
	}
	return nil
}

// Alternative simpler version if the above is too complex:
func generateSimpleSecurePassword(name, registryID string) (string, error) {
	// Validate inputs
	if strings.TrimSpace(name) == "" || strings.TrimSpace(registryID) == "" {
		return "", fmt.Errorf("name and registryID cannot be empty")
	}

	// Generate 12 random characters
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, 12)

	for i := range password {
		index, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", fmt.Errorf("failed to generate random character: %w", err)
		}
		password[i] = charset[index.Int64()]
	}

	return string(password), nil
}
