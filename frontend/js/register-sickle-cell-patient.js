async function getCsrfToken() {
  const res = await fetch("/api/csrf-token", { method: "GET" });
  return res.headers.get("X-CSRF-Token");
}

// Helper function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

$(document).ready(async function () {
  let currentPatientId = null;

  // Load facility information on page load
  await loadFacilityInformation();

  // Show/hide "Other" fields based on selections
  $("#primary-site").on("change", function () {
    toggleOtherField($(this), "#other-site-group", "#other-site");
  });

  $("#treatment-other").on("change", function () {
    toggleOtherField($(this), "#other-treatment-group", "#other-treatment");
  });

  function toggleOtherField(selectElement, groupSelector, inputSelector) {
    if (
      selectElement.is(":checkbox")
        ? selectElement.is(":checked")
        : selectElement.val() === "other"
    ) {
      $(groupSelector).removeClass("hidden");
      $(inputSelector).attr("required", true);
    } else {
      $(groupSelector).addClass("hidden");
      $(inputSelector).attr("required", false);
    }
  }

  // Handle "No Treatment" checkbox
  $("#treatment-none").on("change", function () {
    if ($(this).is(":checked")) {
      $('input[name="treatment[]"]')
        .not(this)
        .prop("checked", false)
        .prop("disabled", true);
    } else {
      $('input[name="treatment[]"]').prop("disabled", false);
    }
  });

  // Format National ID input
  $("#national-id").on("input", function () {
    let value = $(this).val().replace(/\D/g, "");
    if (value.length > 14) value = value.substring(0, 14);
    $(this).val(value);
  });

  $("#patient-dob").on("input", function () {
    if ($(this).val()) {
      $("#patient-age").prop("disabled", true).val("");
    } else {
      $("#patient-age").prop("disabled", false);
    }
  });

  $("#patient-age").on("input", function () {
    if ($(this).val()) {
      $("#patient-dob").prop("disabled", true).val("");
    } else {
      $("#patient-dob").prop("disabled", false);
    }
  });

  function validateDemographics() {
    const dob = $("#patient-dob").val();
    const age = $("#patient-age").val();

    // If both are empty, invalid
    if (!dob && !age) {
      alert("Please provide either Date of Birth or Age.");
      return false;
    }

    // If DOB provided, age is optional
    if (dob && age) {
      // Optional: warn user that only one should be provided
      if (
        confirm(
          "Both Date of Birth and Age are provided. Would you like to continue?",
        )
      ) {
        return true;
      } else {
        return false;
      }
    }

    return true; // Valid
  }

  // Handle form review step
  $(".next-step").click(async function () {
    const currentStep = $(this).closest(".form-step");
    const stepNumber = currentStep.data("step");

    console.log(`Moving to step ${stepNumber + 1}`);

    if (stepNumber === 1) {
      if (!validateDemographics()) {
        return; // Prevent moving forward
      }
    }

    if (stepNumber === 1) {
      populatePatientReviewSummary();
    }
  });

  // Populate patient review summary
  function populatePatientReviewSummary() {
    const summary = $("#patient-review-summary");
    summary.empty();

    // Facility Information
    const facilitySection = $(`
      <div class="review-section">
        <h5>Facility Information</h5>
        <div class="review-content"></div>
      </div>
    `);

    const facilityContent = facilitySection.find(".review-content");
    addReviewItem(
      facilityContent,
      "Facility",
      $("#selected-facility-name").text(),
    );
    addReviewItem(
      facilityContent,
      "Facility ID",
      $("#selected-facility-id").text().replace("ID: ", ""),
    );

    summary.append(facilitySection);

    // Patient Information
    const patientSection = $(`
      <div class="review-section">
        <h5>Patient Information</h5>
        <div class="review-content"></div>
      </div>
    `);

    const patientContent = patientSection.find(".review-content");

    const patientName =
      $("#patient-first-name").val() +
      " " +
      ($("#patient-middle-name").val()
        ? $("#patient-middle-name").val() + " "
        : "") +
      $("#patient-last-name").val();

    addReviewItem(patientContent, "Patient Name", patientName);
    if ($("#patient-age").val()) {
      addReviewItem(patientContent, "Age", $("#patient-age").val() + " years");
    } else {
      addReviewItem(
        patientContent,
        "Date of Birth",
        formatDate($("#patient-dob").val()),
      );
    }
    addReviewItem(
      patientContent,
      "Gender",
      $('input[name="patient-gender"]:checked').val(),
    );
    addReviewItem(patientContent, "National ID", $("#national-id").val());
    addReviewItem(
      patientContent,
      "Medical Record #",
      $("#medical-record-number").val(),
    );

    summary.append(patientSection);

    // Diagnosis Information
    const diagnosisSection = $(`
      <div class="review-section">
        <h5>Diagnosis Information</h5>
        <div class="review-content"></div>
      </div>
    `);

    const diagnosisContent = diagnosisSection.find(".review-content");

    let primarySite = $("#primary-site option:selected").text();
    if ($("#primary-site").val() === "other") {
      primarySite = $("#other-site").val();
    }

    addReviewItem(diagnosisContent, "Primary Site", primarySite);
    addReviewItem(
      diagnosisContent,
      "Histology",
      $("#histology option:selected").text(),
    );
    addReviewItem(
      diagnosisContent,
      "Date of Diagnosis",
      formatDate($("#date-of-diagnosis").val()),
    );
    addReviewItem(
      diagnosisContent,
      "Confirmation",
      $("#diagnostic-confirmation option:selected").text(),
    );
    addReviewItem(
      diagnosisContent,
      "Stage",
      $("#stage option:selected").text(),
    );

    if ($("#laterality").val()) {
      addReviewItem(
        diagnosisContent,
        "Laterality",
        $("#laterality option:selected").text(),
      );
    }

    summary.append(diagnosisSection);
  }

  function addReviewItem(container, label, value) {
    if (value) {
      container.append(`
        <div class="review-item">
          <div class="review-label">${label}:</div>
          <div class="review-value">${value}</div>
        </div>
      `);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  }

  // Handle retry facility button
  $("#retry-facility").click(async function () {
    await loadFacilityInformation();
  });

  // Load facility information from API or session
  async function loadFacilityInformation() {
    try {
      // Hide error state and show loading
      $("#facility-error").addClass("hidden");
      $("#facility-loading").removeClass("hidden");
      $("#register-patient-form").addClass("hidden");

      // Check if facility ID is passed in URL
      const urlParams = new URLSearchParams(window.location.search);
      let facilityId = urlParams.get("facility");

      // If no facility ID in URL, get from session storage or user session
      if (!facilityId) {
        facilityId = getCookie("facility_id") || "123456"; // Default for demo
      }

      // Fetch facility information from API
      const token = await getCsrfToken();
      const response = await fetch(
        `/api/v1/facilities/registry/${facilityId}`,
        { headers: { "X-CSRF-Token": token } },
      );

      if (!response.ok) {
        $("#facility-error").removeClass("hidden");
        $("#facility-loading").addClass("hidden");
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const facility = data.find(
        (f) => f.identification.registry_id === facilityId,
      );

      if (!facility) {
        $("#facility-error").removeClass("hidden");
        $("#facility-loading").addClass("hidden");
        throw new Error("Facility not found in registry");
      }

      // Populate facility information
      $("#selected-facility-name").text(facility.name);
      $("#selected-facility-id")
        .text(`${facility.identification.registry_id}`)
        .addClass("hidden");

      if (facility.status !== "active") {
        $("#facility-status").html(
          '<i class="fas fa-times-circle"></i> Not Verified',
        );
      } else {
        $("#facility-status").html(
          '<i class="fas fa-check-circle"></i> Verified',
        );
      }

      // Hide loading and show form
      $("#facility-loading").addClass("hidden");
      $("#register-patient-form").removeClass("hidden");
    } catch (error) {
      console.error("Error loading facility information:", error);

      // Hide loading and show error state
      $("#facility-loading").addClass("hidden");
      $("#register-patient-form").addClass("hidden");
      $("#facility-error").removeClass("hidden");

      // Set appropriate error message
      let errorMessage =
        "We couldn't find your facility information. Please contact support or try again.";

      if (error.message.includes("HTTP error")) {
        errorMessage =
          "Unable to connect to the registry server. Please check your internet connection and try again.";
      } else if (error.message.includes("Facility not found")) {
        errorMessage =
          "Your facility was not found in the registry. Please contact support to verify your facility registration.";
      }

      $("#facility-error-message").text(errorMessage);
    }
  }

  $("#register-patient-form").submit(async function (e) {
    e.preventDefault();

    // Generate a random patient registration ID for demo purposes
    const patientRegId = "PR-" + Math.floor(10000 + Math.random() * 90000);
    // Collect form data
    const formData = {
      facility_id: parseInt(
        $("#selected-facility-id").text().replace("ID: ", ""),
      ),
      patient_info: {
        first_name: $("#patient-first-name").val(),
        middle_name: $("#patient-middle-name").val(),
        last_name: $("#patient-last-name").val(),
        dob: $("#patient-dob").val() == "" ? null : $("#patient-dob").val(),
        age:
          $("#patient-age").val() == ""
            ? null
            : parseInt($("#patient-age").val()),
        gender: $('input[name="patient-gender"]:checked').val(),
        national_id: $("#national-id").val(),
      },
      diagnosis: {
        date_of_diagnosis: $("#date-of-diagnosis").val(),
        diagnostic_confirmation: $("#diagnostic-confirmation").val(),
        disease_type: $("#disease-type").val(),
      },
      submitter: {
        name: $("#submitter-name").val(),
        title: $("#submitter-title").val(),
        email: $("#submitter-email").val(),
      },
      registration_id: patientRegId,
      registration_date: new Date().toISOString(),
    };

    // Log the JSON data

    // Log the JSON data
    try {
      const token = await getCsrfToken();
      const response = await fetch("/api/v1/sickle-cell-patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const result = await response.json();
      console.log("Patient registered successfully:", result);
    } catch (error) {
      console.error("Error registering patient:", error);
      alert(
        "There was an error registering the patient. Please try again later.",
      );
      return;
    }

    // Hide form and show success message
    $("#register-patient-form").addClass("hidden");
    $("#patient-registration-success").removeClass("hidden");

    // Set the patient registration ID
    $("#patient-reg-id").text(patientRegId);

    // Scroll to top of success message
    $("html, body").animate(
      {
        scrollTop: $("#patient-registration-success").offset().top - 100,
      },
      500,
    );
  });

  // Handle "Register Another Patient"
  $("#register-another").click(function () {
    // Reset the form and UI
    $("#register-patient-form").trigger("reset");
    $("#patient-registration-success").addClass("hidden");
    $("#register-patient-form").removeClass("hidden");
    $(".form-step").removeClass("active");
    $('.form-step[data-step="1"]').addClass("active");
    $(".progress-step").removeClass("active");
    $('.progress-step[data-step="1"]').addClass("active");
    $("html, body").animate(
      {
        scrollTop: $("#register-patient-form").offset().top - 100,
      },
      500,
    );
  });
});
