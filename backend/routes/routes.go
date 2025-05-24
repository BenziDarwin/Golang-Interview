package routes

import (
	"github.com/gofiber/fiber/v2"
	"golang-interview.com/service"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	facility := api.Group("/facilities")

	{
		facility.Post("/", service.CreateFacility)
		facility.Get("/", service.GetFacilities)
		facility.Get("/name/:name", service.GetFacilityByName)
		facility.Get("/registry/:registryId", service.GetFacilityByRegistryID)
		facility.Put("/status/:id", service.SetFacilityStatus)
	}

	patient := api.Group("/patients")
	{
		patient.Post("/", service.CreatePatient)
		patient.Get("/", service.GetPatients)
		patient.Get("/:id", service.GetPatientByID)
		patient.Get("/registration/:registrationId", service.GetPatientByRegistrationID)
		patient.Put("/:id", service.UpdatePatient)
		patient.Delete("/:id", service.DeletePatient)
	}

	// Add similar routes for each model as needed
}
