$(document).ready(async function () {
  // Get patient data from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get("id");

  if (!patientId) {
    alert("Patient ID not found in URL.");
    window.location.href = "patients.html";
    return;
  }

  let patient = null;
  let referrals = [];
  let currentEditingReferral = null;

  // Try to fetch patient data
  try {
    const response = await fetch(`/api/v1/referrals/patient/${patientId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const referralData = await response.json();

    if (!referralData || !Array.isArray(referralData) || referralData.length === 0) {
      alert("No patient data found.");
      window.location.href = "patients.html";
      return;
    }

    // Extract patient data from the first referral
    patient = referralData[0].patient;
    referrals = referralData;

  } catch (error) {
    console.error("Error fetching patient data:", error);
    alert("Failed to load patient data. Please check your connection and try again.");
    
    // For testing purposes, use mock data
    patient = {
      registration_id: "TEST123",
      registration_date: "2024-01-15T00:00:00Z",
      patient_info: {
        first_name: "John",
        middle_name: "M",
        last_name: "Doe",
        national_id: "CM123456789",
        dob: "1990-05-15T00:00:00Z",
        gender: "Male",
        phone: "+256700123456",
        district: "Kampala",
        age: 34
      },
      facility: {
        name: "Mulago National Referral Hospital"
      }
    };
    
    referrals = [
      {
        ID: 1,
        patient: patient,
        referred_by: "Dr. Smith",
        facility_name: "Mulago National Referral Hospital",
        diagnosis: "Suspected Breast Cancer",
        referred_to: "Uganda Cancer Institute",
        country: "Uganda",
        city: "Kampala",
        facility: "UCI Mulago",
        doctor: "Dr. Johnson",
        referral_date: "2024-02-01T00:00:00Z",
        status: "Pending"
      }
    ];
  }

  function formatDate(dateString) {
    if (!dateString) return "Not specified";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }

  function calculateAge(dob) {
    if (!dob) return 0;
    
    try {
      const today = new Date();
      const birthDate = new Date(dob);
      
      if (isNaN(birthDate.getTime())) return 0;
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } catch (error) {
      console.error("Error calculating age:", error);
      return 0;
    }
  }

  function renderPatientDetails() {
    if (!patient) {
      console.error("No patient data available");
      return;
    }

    const patientInfo = patient.patient_info || {};
    const fullName = `${patientInfo.first_name || ""} ${patientInfo.middle_name || ""} ${patientInfo.last_name || ""}`.trim();
    const age = patientInfo.dob ? calculateAge(patientInfo.dob) : (patientInfo.age || 0);

    // Set patient name
    $("#referral-name").text(fullName || "Unknown Patient");

    // Render basic info with improved grid layout
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
                  <span class="info-value">${patientInfo.age || 0} years</span>
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
      $("#referrals-accordion").html(`
        <div class="empty-state">
            <i class="fas fa-share-square"></i>
            <h4>No Referrals Recorded</h4>
            <p>No patient referrals have been recorded yet.</p>
        </div>
      `);
      return;
    }

    const tableHtml = `
      <div class="accordion-table-container">
          <table class="accordion-table">
              <thead>
                  <tr>
                      <th style="width: 25%;">Referred To</th>
                      <th style="width: 20%;">Location</th>
                      <th style="width: 20%;">Facility</th>
                      <th style="width: 15%;">Date</th>
                      <th style="width: 20%;">Status & Actions</th>
                  </tr>
              </thead>
              <tbody>
                  ${referrals
                    .map((referral) => {
                      const statusClass =
                        referral.status === "Completed"
                          ? "status-completed"
                          : referral.status === "Pending"
                            ? "status-pending"
                            : "status-inactive";

                      return `
                        <tr class="accordion-row">
                            <td class="accordion-header-row" data-target="referral-${referral.ID}" colspan="5">
                                <div style="display: flex; width: 100%;">
                                    <div style="width: 25%;">
                                        <div class="cell-content">${referral.referred_to || "Not specified"}</div>
                                    </div>
                                    <div style="width: 20%;">
                                        <div class="cell-content">${referral.country || "Not specified"}, ${referral.city || "Not specified"}</div>
                                    </div>
                                    <div style="width: 20%;">
                                        <div class="cell-content">${referral.facility || "Not specified"}</div>
                                    </div>
                                    <div style="width: 15%;">
                                        <div class="cell-content">${formatDate(referral.referral_date)}</div>
                                    </div>
                                    <div style="width: 20%;">
                                        <div class="cell-content">
                                            <span class="status-badge ${statusClass}">${referral.status || "Unknown"}</span>
                                            <div class="accordion-actions">
                                                <button class="btn small text edit-referral" data-referral-id="${referral.ID}" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn small danger delete-referral" data-referral-id="${referral.ID}" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                                <i class="fas fa-chevron-down accordion-icon"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr class="accordion-content-row" id="referral-${referral.ID}">
                            <td colspan="5" class="accordion-content-cell">
                                <div class="accordion-content-inner">
                                    <div class="accordion-details-grid">
                                        <div class="detail-group">
                                            <div class="detail-item">
                                                <div class="detail-label">Referred By</div>
                                                <div class="detail-value">${referral.referred_by || "Not specified"}</div>
                                            </div>
                                            <div class="detail-item">
                                                <div class="detail-label">Facility Name</div>
                                                <div class="detail-value">${referral.facility_name || "Not specified"}</div>
                                            </div>
                                            <div class="detail-item">
                                                <div class="detail-label">Diagnosis</div>
                                                <div class="detail-value">${referral.diagnosis || "Not specified"}</div>
                                            </div>
                                        </div>
                                        <div class="detail-group">
                                            <div class="detail-item">
                                                <div class="detail-label">Referred To</div>
                                                <div class="detail-value">${referral.referred_to || "Not specified"}</div>
                                            </div>
                                            <div class="detail-item">
                                                <div class="detail-label">Doctor</div>
                                                <div class="detail-value">${referral.doctor || "Not specified"}</div>
                                            </div>
                                            <div class="detail-item">
                                                <div class="detail-label">Referral Date</div>
                                                <div class="detail-value">${formatDate(referral.referral_date)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                      `;
                    })
                    .join("")}
              </tbody>
          </table>
      </div>
    `;

    $("#referrals-accordion").html(tableHtml);
    
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
      $("#referral-modal-title").text("Edit Referral");
      $("#referred-by").val(referral.referred_by || "");
      $("#facility-name").val(referral.facility_name || (patient.facility ? patient.facility.name : ""));
      $("#referral-diagnosis").val(referral.diagnosis || "");
      $("#referred-to").val(referral.referred_to || "");
      $("#country").val(referral.country || "");
      $("#city").val(referral.city || "");
      $("#referral-facility").val(referral.facility || "");
      $("#doctor").val(referral.doctor || "");
      
      // Format date for input field
      if (referral.referral_date) {
        const date = new Date(referral.referral_date);
        if (!isNaN(date.getTime())) {
          $("#referral-date").val(date.toISOString().split('T')[0]);
        }
      }
    } else {
      $("#referral-modal-title").text("Add New Referral");
      $("#referral-form")[0].reset();
      // Pre-populate facility name for new referrals
      $("#facility-name").val(patient.facility ? patient.facility.name : "");
      $("#country").val("Uganda"); // Default to Uganda
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

    const date = new Date(referralDateInput);
    const isoDate = date.toISOString();
    
    const formData = {
      referred_by: $("#referred-by").val(),
      facility_name: $("#facility-name").val(),
      diagnosis: $("#referral-diagnosis").val(),
      referred_to: $("#referred-to").val(),
      country: $("#country").val(),
      city: $("#city").val(),
      facility: $("#referral-facility").val(),
      doctor: $("#doctor").val(),
      referral_date: isoDate,
      status: "Pending",
    };

    // Validate required fields
    if (!formData.referred_by || !formData.diagnosis || !formData.referred_to || !formData.country) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch(`/api/v1/patients/${patientId}/referral`, {
        method: currentEditingReferral ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save referral");
      }

      const savedReferral = await response.json();
      
      if (currentEditingReferral) {
        // Update existing referral
        const index = referrals.findIndex(r => r.ID === currentEditingReferral.ID);
        if (index !== -1) {
          referrals[index] = { ...savedReferral, ID: currentEditingReferral.ID };
        }
      } else {
        // Add new referral
        referrals.push({ ...savedReferral, ID: Date.now() }); // Use timestamp as ID for demo
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

  // Accordion functionality
  $(document).on("click", ".accordion-header-row", function (e) {
    if ($(e.target).closest(".accordion-actions").length > 0) {
      return;
    }

    const target = $(this).data("target");
    const content = $(`#${target}`);
    const icon = $(this).find(".accordion-icon");

    // Close other accordions
    $(".accordion-header-row").not(this).removeClass("active");
    $(".accordion-content-row").not(content).removeClass("active");
    $(".accordion-icon").not(icon).removeClass("rotated");

    // Toggle current accordion
    $(this).toggleClass("active");
    content.toggleClass("active");
    icon.toggleClass("rotated");
  });

  // Referral events
  $(document).on("click", "#add-referral-btn", function () {
    openReferralModal();
  });

  $(document).on("click", ".edit-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    const referral = referrals.find((r) => r.ID === referralId);
    if (referral) {
      openReferralModal(referral);
    }
  });

  $(document).on("click", ".delete-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    if (confirm("Are you sure you want to delete this referral?")) {
      referrals = referrals.filter((r) => r.ID !== referralId);
      renderReferralsTable();
    }
  });

  // Modal events
  $(document).on("click", "#close-referral-modal, #cancel-referral-btn", function () {
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

  $(document).on("click", ".close", function () {
    closeReferralModal();
  });

  $(".mobile-menu-toggle").click(function () {
    $("nav").toggleClass("active");
  });

  // Initialize the page
  try {
    renderPatientDetails();
    renderReferralsTable();
  } catch (error) {
    console.error("Error initializing page:", error);
  }
});