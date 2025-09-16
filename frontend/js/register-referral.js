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

// Helper function to format date to ISO string with timezone
function formatDateToISO(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toISOString();
}

// Check if jQuery is loaded
if (typeof jQuery === "undefined") {
  console.error("jQuery is not loaded!");
  alert(
    "Error: jQuery library is not loaded. Please check your HTML head section.",
  );
}

$(document).ready(async function () {
  console.log("DOM ready, starting form initialization...");

  // Load facility information on page load
  try {
    await loadFacilityInformation();
  } catch (error) {
    console.error("Failed to load facility information:", error);
  }

  // Format National ID input
  $("#national-id").on("input", function () {
    let value = $(this).val().replace(/\D/g, "");
    if (value.length > 14) value = value.substring(0, 14);
    $(this).val(value);
  });

  // Handle age/DOB mutual exclusivity
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

  // Set default referral date to today
  $("#referral-date").val(new Date().toISOString().split("T")[0]);

  function validatePatientInfo() {
    const dob = $("#patient-dob").val();
    const age = $("#patient-age").val();

    // If both are empty, invalid
    if (!dob && !age) {
      alert("Please provide either Date of Birth or Age.");
      return false;
    }

    // If both provided, confirm with user
    if (dob && age) {
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

  // Handle form step navigation
  $(".next-step").click(function () {
    const currentStep = $(this).closest(".form-step");
    const stepNumber = currentStep.data("step");

    if (stepNumber === 1) {
      if (!validatePatientInfo()) {
        return; // Prevent moving forward
      }
      populateReferralReviewSummary();
    }

    // Move to next step
    currentStep.removeClass("active");
    $(`.form-step[data-step="${stepNumber + 1}"]`).addClass("active");

    // Update progress
    $(`.progress-step[data-step="${stepNumber}"]`).removeClass("active");
    $(`.progress-step[data-step="${stepNumber + 1}"]`).addClass("active");
  });

  $(".prev-step").click(function () {
    const currentStep = $(this).closest(".form-step");
    const stepNumber = currentStep.data("step");

    // Move to previous step
    currentStep.removeClass("active");
    $(`.form-step[data-step="${stepNumber - 1}"]`).addClass("active");

    // Update progress
    $(`.progress-step[data-step="${stepNumber}"]`).removeClass("active");
    $(`.progress-step[data-step="${stepNumber - 1}"]`).addClass("active");
  });

  // Populate referral review summary
  function populateReferralReviewSummary() {
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
      "Your Facility",
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

    summary.append(patientSection);

    // Referral Information
    const referralSection = $(`
      <div class="review-section">
        <h5>Referral Information</h5>
        <div class="review-content"></div>
      </div>
    `);

    const referralContent = referralSection.find(".review-content");

    addReviewItem(referralContent, "Referred By", $("#referred-by").val());
    addReviewItem(
      referralContent,
      "Referring Facility",
      $("#facility-name").val(),
    );
    addReviewItem(referralContent, "Diagnosis", $("#diagnosis").val());
    addReviewItem(referralContent, "Referred To", $("#referred-to").val());
    addReviewItem(
      referralContent,
      "Receiving Facility",
      $("#receiving-facility").val(),
    );
    addReviewItem(referralContent, "Country", $("#country").val());
    addReviewItem(referralContent, "City", $("#city").val());
    if ($("#receiving-doctor").val()) {
      addReviewItem(
        referralContent,
        "Receiving Doctor",
        $("#receiving-doctor").val(),
      );
    }
    addReviewItem(
      referralContent,
      "Referral Date",
      formatDate($("#referral-date").val()),
    );
    addReviewItem(
      referralContent,
      "Status",
      $('input[name="referral-status"]:checked').val(),
    );

    summary.append(referralSection);
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
      $("#referral-patient-form").addClass("hidden");

      // Check if facility ID is passed in URL
      const urlParams = new URLSearchParams(window.location.search);
      let facilityId = urlParams.get("facility");

      // If no facility ID in URL, get from session storage or user session
      if (!facilityId) {
        facilityId = getCookie("facility_id") || "123456"; // Default for demo
      }

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
      $("#referral-patient-form").removeClass("hidden");
    } catch (error) {
      console.error("Error loading facility information:", error);

      // Hide loading and show error state
      $("#facility-loading").addClass("hidden");
      $("#referral-patient-form").addClass("hidden");
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

  // Handle referral form submission
  $("#referral-patient-form").submit(async function (e) {
    e.preventDefault();

    // Generate random referral ID for demo purposes
    const referralId = "REF-" + Math.floor(10000 + Math.random() * 90000);
    const patientRegId = "REG" + Math.floor(100000 + Math.random() * 900000);

    // Get facility ID (remove any "ID: " prefix if present)
    const facilityIdText = $("#selected-facility-id").text();
    const facilityId = parseInt(facilityIdText.replace("ID: ", "")) || 123456;

    // Collect form data according to the backend API structure
    const formData = {
      referred_by: $("#referred-by").val(),
      facility_name: $("#facility-name").val(),
      diagnosis: $("#diagnosis").val(),
      referred_to: $("#referred-to").val(),
      country: $("#country").val(),
      city: $("#city").val(),
      facility: $("#receiving-facility").val(),
      doctor: $("#receiving-doctor").val() || null,
      referral_date: formatDateToISO($("#referral-date").val()),
      status: "Pending",
      patient: {
        facility_id: facilityId,
        registration_id: patientRegId,
        registration_date: new Date().toISOString(),
        patient_info: {
          first_name: $("#patient-first-name").val(),
          middle_name: $("#patient-middle-name").val() || null,
          last_name: $("#patient-last-name").val(),
          dob: $("#patient-dob").val()
            ? formatDateToISO($("#patient-dob").val())
            : null,
          age: $("#patient-age").val()
            ? parseInt($("#patient-age").val())
            : null,
          gender: $('input[name="patient-gender"]:checked').val(),
          national_id: $("#national-id").val(),
        },
        submitter: [
          {
            name: $("#submitter-name").val(),
            title: $("#submitter-title").val(),
            email: $("#submitter-email").val(),
          },
        ],
      },
    };

    console.log("Submitting referral data:", formData);

    const token = await getCsrfToken();
    try {
      const response = await fetch("/api/v1/referrals", {
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
      console.log("Referral submitted successfully:", result);

      // Hide form and show success message
      $("#referral-patient-form").addClass("hidden");
      $("#referral-success").removeClass("hidden");

      // Set the referral ID
      $("#referral-id").text(referralId);

      // Scroll to top of success message
      $("html, body").animate(
        {
          scrollTop: $("#referral-success").offset().top - 100,
        },
        500,
      );
    } catch (error) {
      console.error("Error submitting referral:", error);
      alert(
        "There was an error submitting the referral. Please try again later.",
      );
      return;
    }
  });

  // Handle "Create Another Referral"
  $("#create-another-referral").click(function () {
    // Reset the form and UI
    $("#referral-patient-form").trigger("reset");
    $("#referral-success").addClass("hidden");
    $("#referral-patient-form").removeClass("hidden");
    $(".form-step").removeClass("active");
    $('.form-step[data-step="1"]').addClass("active");
    $(".progress-step").removeClass("active");
    $('.progress-step[data-step="1"]').addClass("active");

    // Reset default referral date
    $("#referral-date").val(new Date().toISOString().split("T")[0]);

    // Re-enable age/dob fields
    $("#patient-age").prop("disabled", false);
    $("#patient-dob").prop("disabled", false);

    $("html, body").animate(
      {
        scrollTop: $("#referral-patient-form").offset().top - 100,
      },
      500,
    );
  });
});
