$(document).ready(async function () {
  console.log("Referral detail page loaded");
  
  // Get patient data from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get("id");

  console.log("Patient ID from URL:", patientId);

  if (!patientId) {
    alert("Patient ID not found in URL.");
    window.location.href = "external-referrals.html";
    return;
  }

  // Show loading state
  $("#referrals-table").html('<div class="loading"><i class="fas fa-spinner"></i> Loading referrals...</div>');

  let patient = null;
  let referrals = [];
  let currentEditingReferral = null;

  // Try to fetch patient data
  try {
    console.log(`Fetching from: /api/v1/referrals/patient/${patientId}`);
    const response = await fetch(`/api/v1/referrals/patient/${patientId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const referralData = await response.json();
    console.log("Referral data received:", referralData);

    if (!referralData || !Array.isArray(referralData) || referralData.length === 0) {
      throw new Error("No referral data found");
    }

    // Extract patient data from the first referral
    patient = referralData[0].patient;
    referrals = referralData;

    console.log("Processed data:", { patient, referrals });

  } catch (error) {
    console.error("Error fetching referral data:", error);
    alert("Failed to load patient data. Please check your connection and try again.");
  }

  function formatDate(dateString) {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  }

  function calculateAge(dob) {
    if (!dob) return "Unknown";
    try {
      const today = new Date();
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return "Unknown";
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      console.error("Age calculation error:", error);
      return "Unknown";
    }
  }

  function renderPatientDetails() {
    console.log("Rendering patient details:", patient);
    
    if (!patient) {
      console.error("No patient data available");
      return;
    }

    const patientInfo = patient.patient_info || {};
    const fullName = `${patientInfo.first_name || ""} ${patientInfo.middle_name || ""} ${patientInfo.last_name || ""}`.trim();
    const age = patientInfo.dob ? calculateAge(patientInfo.dob) : patientInfo.age || "Unknown";

    // Set patient name
    $("#referral-name").text(fullName || "Unknown Patient");

    // Render basic info
    const basicInfoHtml = `
      <div class="referral-basic-info">
          <div class="info-item">
              <span class="info-label">Registration ID</span>
              <span class="info-value">${patient.registration_id || "Not provided"}</span>
          </div>
          <div class="info-item">
              <span class="info-label">National ID</span>
              <span class="info-value">${patientInfo.national_id || "Not provided"}</span>
          </div>
          ${
            patientInfo.dob && patientInfo.dob.includes("0001-01-01")
              ? `<div class="info-item">
                  <span class="info-label">Age</span>
                  <span class="info-value">${patientInfo.age || age} years</span>
              </div>`
              : `<div class="info-item">
                  <span class="info-label">Date of Birth</span>
                  <span class="info-value">${formatDate(patientInfo.dob)}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">Age</span>
                  <span class="info-value">${age} years</span>
              </div>`
          }
          <div class="info-item">
              <span class="info-label">Gender</span>
              <span class="info-value">${patientInfo.gender || "Not specified"}</span>
          </div>
          <div class="info-item">
              <span class="info-label">Registration Date</span>
              <span class="info-value">${formatDate(patient.registration_date)}</span>
          </div>
          ${
            patientInfo.phone
              ? `<div class="info-item">
                  <span class="info-label">Phone</span>
                  <span class="info-value">${patientInfo.phone}</span>
              </div>`
              : ""
          }
          ${
            patientInfo.district
              ? `<div class="info-item">
                  <span class="info-label">District</span>
                  <span class="info-value">${patientInfo.district}</span>
              </div>`
              : ""
          }
      </div>
    `;

    $("#referral-basic-info").html(basicInfoHtml);
  }

  function renderReferralsTable() {
    console.log("Rendering referrals table with", referrals.length, "referrals");

    if (!referrals || referrals.length === 0) {
      $("#referrals-table").html(`
        <div class="empty-state">
            <i class="fas fa-share-square"></i>
            <h4>No Referrals Recorded</h4>
            <p>No patient referrals have been recorded yet.</p>
        </div>
      `);
      return;
    }

    const tableHtml = `
      <table class="data-table">
          <thead>
              <tr>
                  <th style="width: 15%;">Referred By</th>
                  <th style="width: 15%;">From Facility</th>
                  <th style="width: 20%;">Diagnosis</th>
                  <th style="width: 15%;">Referred To</th>
                  <th style="width: 12%;">Location</th>
                  <th style="width: 12%;">Date</th>
                  <th style="width: 11%;">Actions</th>
              </tr>
          </thead>
          <tbody>
              ${referrals
                .map((referral, index) => {
                  const statusClass =
                    referral.status === "Completed"
                      ? "status-completed"
                      : referral.status === "Pending"
                        ? "status-pending"
                        : referral.status === "Cancelled"
                          ? "status-cancelled"
                          : "status-inactive";

                  return `
                      <tr>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${referral.referred_by || "Not specified"}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${referral.facility_name || "Not specified"}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${referral.diagnosis || "Not specified"}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${referral.referred_to || "Not specified"}</div>
                                  <div class="cell-sub">${referral.doctor || ""}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${referral.city || ""}</div>
                                  <div class="cell-sub">${referral.country || ""}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${formatDate(referral.referral_date)}</div>
                                  <span class="status-badge ${statusClass}">${referral.status || "Pending"}</span>
                              </div>
                          </td>
                          <td>
                              <div class="actions-cell">
                                  <button class="btn small text edit-referral" data-referral-id="${referral.ID || referral.id}" title="Edit">
                                      <i class="fas fa-edit"></i>
                                  </button>
                                  <button class="btn small danger delete-referral" data-referral-id="${referral.ID || referral.id}" title="Delete">
                                      <i class="fas fa-trash"></i>
                                  </button>
                              </div>
                          </td>
                      </tr>
                  `;
                })
                .join("")}
          </tbody>
      </table>
    `;

    $("#referrals-table").html(tableHtml);

    // Make sure the referrals tab is active
    $(".tab").removeClass("active");
    $(".tab[data-tab='referrals']").addClass("active");
    $(".tab-content").removeClass("active");
    $("#referrals-tab").addClass("active");
  }

  function openReferralModal(referral = null) {
    currentEditingReferral = referral;

    console.log("Opening referral modal for referral:", referral);

    if (referral) {
      $(".modal-title").text("Edit Referral");
      $("#referred-by").val(referral.referred_by || "");
      $("#facility-name").val(
        referral.facility_name ||
          (patient.facility ? patient.facility.name : "")
      );
      $("#referral-diagnosis").val(referral.diagnosis || "");
      $("#referred-to").val(referral.referred_to || "");
      $("#country").val(referral.country || "Uganda");
      $("#city").val(referral.city || "");
      $("#referral-facility").val(referral.facility || "");
      $("#doctor").val(referral.doctor || "");
      $("#referral-status").val(referral.status || "Pending");

      // Format date for input field
      if (referral.referral_date) {
        const date = new Date(referral.referral_date);
        if (!isNaN(date.getTime())) {
          $("#referral-date").val(date.toISOString().split("T")[0]);
        }
      }
    } else {
      $(".modal-title").text("Add New Referral");
      $("#referral-form")[0].reset();
      // Pre-populate facility name for new referrals
      $("#facility-name").val(patient.facility ? patient.facility.name : "");
      $("#country").val("Uganda"); // Default to Uganda
      $("#referral-status").val("Pending");
    }

    $("#referral-modal").show();
  }

  function closeReferralModal() {
    $("#referral-modal").hide();
    currentEditingReferral = null;
  }

  async function saveReferral() {
    const referralDateInput = $("#referral-date").val();
    if (!referralDateInput) {
      alert("Please select a referral date.");
      return;
    }

    const formData = {
      referred_by: $("#referred-by").val(),
      facility_name: $("#facility-name").val(),
      diagnosis: $("#referral-diagnosis").val(),
      referred_to: $("#referred-to").val(),
      country: $("#country").val(),
      city: $("#city").val(),
      facility: $("#referral-facility").val(),
      doctor: $("#doctor").val(),
      referral_date: referralDateInput,
      status: $("#referral-status").val() || "Pending",
    };

    // Validate required fields
    if (
      !formData.referred_by ||
      !formData.diagnosis ||
      !formData.referred_to ||
      !formData.country
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (currentEditingReferral) {
        // Update existing referral
        const index = referrals.findIndex(
          (r) => (r.ID || r.id) === (currentEditingReferral.ID || currentEditingReferral.id)
        );
        if (index !== -1) {
          referrals[index] = { ...referrals[index], ...formData };
        }
      } else {
        // Add new referral
        const newReferral = {
          ID: Date.now(),
          id: Date.now(),
          patient: patient,
          ...formData,
        };
        referrals.push(newReferral);
      }

      renderReferralsTable();
      closeReferralModal();
    } catch (error) {
      console.error("Error saving referral:", error);
      alert("An error occurred while saving the referral. Please try again.");
    }
  }

  // Event handlers
  $(document).on("click", ".tab", function () {
    const targetTab = $(this).data("tab");

    $(".tab").removeClass("active");
    $(this).addClass("active");

    $(".tab-content").removeClass("active");
    $(`#${targetTab}-tab`).addClass("active");
  });

  // Referral events
  $(document).on("click", "#add-referral-btn", function () {
    openReferralModal();
  });

  $(document).on("click", ".edit-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    const referral = referrals.find((r) => (r.ID || r.id) === referralId);
    if (referral) {
      openReferralModal(referral);
    }
  });

  $(document).on("click", ".delete-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    if (confirm("Are you sure you want to delete this referral?")) {
      referrals = referrals.filter((r) => (r.ID || r.id) !== referralId);
      renderReferralsTable();
    }
  });

  // Modal events
  $(document).on("click", ".close, #cancel-referral-btn", function () {
    closeReferralModal();
  });

  $(document).on("click", "#save-referral-btn", function () {
    saveReferral();
  });

  $(document).on("click", ".modal", function (e) {
    if (e.target === this) {
      closeReferralModal();
    }
  });

  // Initialize the page
  try {
    renderPatientDetails();
    renderReferralsTable();
  } catch (error) {
    console.error("Error initializing page:", error);
  }
});