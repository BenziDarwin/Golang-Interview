package routes

import (
	"github.com/gofiber/fiber/v2"
	"golang-interview.com/middleware"
	"golang-interview.com/service"
)

func SetupRoutes(app *fiber.App) {
	// Global middleware
	app.Use(middleware.RequestLogger())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORS())

	// Session helper middleware for all routes
	app.Use(middleware.SessionHelper())

	// Frontend routes with authentication middleware
	app.Use(middleware.AuthMiddleware())
	app.Static("/", "../frontend")

	api := app.Group("/api/v1")

	facility := api.Group("/facilities")

	{
		facility.Post("/", service.CreateFacility)
		facility.Post("/login", service.LoginFacility)
		facility.Get("/", service.GetFacilities)
		facility.Get("/name/:name", service.GetFacilityByName)
		facility.Get("/registry/:registryId", service.GetFacilityByRegistryID)
		facility.Put("/:id", service.UpdateFacility)
		facility.Put("/status/:id", service.SetFacilityStatus)
	}

	patient := api.Group("/patients")
	{
		patient.Post("/", service.CreatePatient)
		patient.Get("/", service.GetPatients)
		patient.Get("/:id", service.GetPatientByID)
		patient.Get("/registration/:registrationId", service.GetPatientByRegistrationID)
		patient.Delete("/:id", service.DeletePatient)
		patient.Get("/facility/:id", service.GetPatientsByFacilityID)

		patient.Post("/:id/diagnosis", service.CreateDiagnosis)
		patient.Get("/:id/diagnosis", service.GetDiagnosisByPatientID)

		patient.Post("/:id/referral", service.CreateReferral)
		patient.Get("/:id/referrals", service.GetReferralByPatientID)
	}

	admin := api.Group("/admin")
	{
		admin.Post("/login", service.LoginAdmin)
	}

	// Add similar routes for each model as needed
}
