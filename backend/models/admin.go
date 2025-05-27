package models

import "gorm.io/gorm"

type Admin struct {
	gorm.Model
	Username string `json:"username" gorm:"unique;not null"`
	Password []byte `json:"password" gorm:"not null"`
	Email    string `json:"email" gorm:"unique;not null"`
}
