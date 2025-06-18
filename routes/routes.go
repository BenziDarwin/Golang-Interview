package routes

import (
	"github.com/gofiber/fiber/v2"
	"patient-registry.com/middleware"
	"patient-registry.com/service"
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
	app.Static("/", "./frontend")

	api := app.Group("/api/v1")

	facility := api.Group("/facilities")
	facility.Use(middleware.RequireAuth())
	{
		facility.Post("/", service.CreateFacility)
		facility.Post("/login", service.LoginFacility)
		facility.Get("/", service.GetFacilities)

		facility.Get("/name/:name", service.GetFacilityByName)
		facility.Get("/name/exists/:name", service.GetExistsFacilityByName)
		facility.Get("/registry/:registryId", service.GetFacilityByRegistryID)
		facility.Get("/registry/exists/:registryId", service.GetExistsFacilityByRegistryID)
		facility.Put("/:id", service.UpdateFacility)
		facility.Put("/status/:id", service.SetFacilityStatus)
	}

	cancer_patient := api.Group("/cancer-patients")
	cancer_patient.Use(middleware.RequireAuth())
	{
		cancer_patient.Post("/", service.CreateCancerPatient)
		cancer_patient.Get("/", service.GetCancerPatients)
		cancer_patient.Get("/:id", service.GetCancerPatientByID)
		cancer_patient.Get("/registration/:registrationId", service.GetCancerPatientByRegistrationID)
		cancer_patient.Delete("/:id", service.DeleteCancerPatient)
		cancer_patient.Get("/facility/:id", service.GetCancerPatientsByFacilityID)

		cancer_patient.Post("/:id/diagnosis", service.CreateCancerDiagnosis)
		cancer_patient.Get("/:id/diagnosis", service.GetCancerDiagnosisByPatientID)

		cancer_patient.Post("/:id/referral", service.CreateCancerReferral)
		cancer_patient.Get("/:id/referrals", service.GetCancerReferralByPatientID)
	}

	sickle_cell_patient := api.Group("/sickle-cell-patients")
	sickle_cell_patient.Use(middleware.RequireAuth())
	{
		sickle_cell_patient.Post("/", service.CreateSickleCellPatient)
		sickle_cell_patient.Get("/", service.GetSickleCellPatients)
		sickle_cell_patient.Get("/:id", service.GetSickleCellPatientByID)
		sickle_cell_patient.Get("/registration/:registrationId", service.GetSickleCellPatientByRegistrationID)
		sickle_cell_patient.Delete("/:id", service.DeleteSickleCellPatient)
		sickle_cell_patient.Get("/facility/:id", service.GetSickleCellPatientsByFacilityID)

		sickle_cell_patient.Post("/:id/diagnosis", service.CreateSickleCellDiagnosis)
		sickle_cell_patient.Get("/:id/diagnosis", service.GetSickleCellDiagnosisByPatientID)

		sickle_cell_patient.Post("/:id/referral", service.CreateSickleCellReferral)
		sickle_cell_patient.Get("/:id/referrals", service.GetSickleCellReferralByPatientID)
	}

	referrals := api.Group("/referrals")
	referrals.Use(middleware.RequireAuth())
	{
		referrals.Post("/", service.CreateReferral)
		referrals.Get("/", service.GetReferrals)
		referrals.Get("/patient/:id", service.GetReferralByPatientID)
	}

	admin := api.Group("/admin")
	admin.Use(middleware.RequireAuth())
	{
		admin.Post("/login", service.LoginAdmin)
	}
}
