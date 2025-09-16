async function getCsrfToken() {
  const res = await fetch("/api/csrf-token", { method: "GET" });
  return res.headers.get("X-CSRF-Token");
}

$(document).ready(async function () {
  console.log("Patient detail page loaded");

  // Get patient data from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get("id");

  if (!patientId) {
    alert("Patient ID not found in URL.");
    window.location.href = "/cancer/cancer-patients.html";
    return;
  }

  // Show loading state
  $("#diagnoses-table").html(
    '<div class="loading"><i class="fas fa-spinner"></i> Loading diagnoses...</div>',
  );
  $("#referrals-table").html(
    '<div class="loading"><i class="fas fa-spinner"></i> Loading referrals...</div>',
  );

  let patient = null;
  let diagnoses = [];
  let referrals = [];
  let currentEditingDiagnosis = null;
  let currentEditingReferral = null;

  // Try multiple API endpoints to fetch patient data
  async function fetchPatientData() {
    const endpoints = [`/api/v1/cancer-patients/${patientId}`];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint);

        if (response.ok) {
          const data = await response.json();
          console.log("Patient data received:", data);
          return data;
        } else {
          console.log(
            `Endpoint ${endpoint} returned status: ${response.status}`,
          );
        }
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
      }
    }

    throw new Error("Could not fetch patient data from any endpoint");
  }

  try {
    const patientData = await fetchPatientData();

    // Handle different data structures
    if (patientData.patient) {
      patient = patientData.patient;
      diagnoses = Array.isArray(patientData.diagnosis)
        ? patientData.diagnosis
        : Array.isArray(patientData.diagnoses)
          ? patientData.diagnoses
          : [];
      referrals = Array.isArray(patientData.referrals)
        ? patientData.referrals
        : Array.isArray(patient.referrals)
          ? patient.referrals
          : [];
    } else {
      // Direct patient object
      patient = patientData;
      diagnoses = Array.isArray(patientData.diagnoses)
        ? patientData.diagnoses
        : [];
      referrals = Array.isArray(patientData.referrals)
        ? patientData.referrals
        : [];
    }

    console.log("Processed data:", { patient, diagnoses, referrals });
  } catch (error) {
    console.error("Error fetching patient data:", error);
    alert("Patient not found or an error occurred while fetching data.");
    window.location.href = "sickle-cell-patients.html";
    return;
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

    if (!patient || !patient.patient_info) {
      console.error("Invalid patient data structure");
      return;
    }

    const patientInfo = patient.patient_info;
    const fullName =
      `${patientInfo.first_name || ""} ${patientInfo.middle_name || ""} ${patientInfo.last_name || ""}`.trim();
    const age = calculateAge(patientInfo.dob);

    // Set patient name
    $("#patient-name").text(fullName || "Unknown Patient");

    // Render basic info
    const basicInfoHtml = `
      <div class="patient-basic-info">
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
              ? `
          <div class="info-item">
              <span class="info-label">Phone</span>
              <span class="info-value">${patientInfo.phone}</span>
          </div>
          `
              : ""
          }
          ${
            patientInfo.district
              ? `
          <div class="info-item">
              <span class="info-label">District</span>
              <span class="info-value">${patientInfo.district}</span>
          </div>
          `
              : ""
          }
      </div>
    `;

    $("#patient-basic-info").html(basicInfoHtml);
  }

  function renderDiagnosesTable() {
    console.log(
      "Rendering diagnoses table with",
      diagnoses.length,
      "diagnoses",
    );

    if (!diagnoses || diagnoses.length === 0) {
      $("#diagnoses-table").html(`
        <div class="empty-state">
            <i class="fas fa-stethoscope"></i>
            <h4>No Diagnoses Recorded</h4>
            <p>No sickle cell diagnoses have been recorded for this patient yet.</p>
        </div>
      `);
      return;
    }

    const tableHtml = `
      <table class="data-table">
          <thead>
              <tr>
                  <th style="width: 20%;">Primary Site</th>
                  <th style="width: 20%;">Histology</th>
                  <th style="width: 12%;">Stage</th>
                  <th style="width: 15%;">Diagnosis Date</th>
                  <th style="width: 18%;">Confirmation</th>
                  <th style="width: 10%;">Laterality</th>
                  <th style="width: 15%;">Actions</th>
              </tr>
          </thead>
          <tbody>
              ${diagnoses
                .map((diagnosis, index) => {
                  const primaryBadge =
                    index === 0
                      ? '<div class="primary-badge">Primary</div>'
                      : "";

                  return `
                      <tr>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${diagnosis.primary_site || "Not specified"}</div>
                                  ${primaryBadge}
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${diagnosis.histology || "Not specified"}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <span class="stage-badge stage-${(diagnosis.stage || "").toLowerCase().replace(" ", "-")}">${diagnosis.stage || "Not specified"}</span>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${formatDate(diagnosis.date_of_diagnosis)}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${diagnosis.diagnostic_confirmation || "Not specified"}</div>
                              </div>
                          </td>
                          <td>
                              <div class="cell-content">
                                  <div class="cell-main">${diagnosis.laterality || "Not specified"}</div>
                              </div>
                          </td>
                          <td>
                              <div class="actions-cell">
                                  <button class="btn small text edit-diagnosis" data-diagnosis-id="${diagnosis.ID || diagnosis.id}" title="Edit">
                                      <i class="fas fa-edit"></i>
                                  </button>
                                  <button class="btn small danger delete-diagnosis" data-diagnosis-id="${diagnosis.ID || diagnosis.id}" title="Delete">
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

    $("#diagnoses-table").html(tableHtml);
  }

  function renderReferralsTable() {
    console.log(
      "Rendering referrals table with",
      referrals.length,
      "referrals",
    );

    if (referrals.length === 0) {
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
                                  <button class="btn small text edit-referral" data-referral-id="${referral.id || referral.ID}" title="Edit">
                                      <i class="fas fa-edit"></i>
                                  </button>
                                  <button class="btn small danger delete-referral" data-referral-id="${referral.id || referral.ID}" title="Delete">
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
  }

  // Modal functions
  function openDiagnosisModal(diagnosis = null) {
    currentEditingDiagnosis = diagnosis;

    if (diagnosis) {
      $(".modal-title").text("Edit Diagnosis");
      $("#primary-site").val(diagnosis.primary_site || "");
      $("#histology").val(diagnosis.histology || "");
      $("#diagnosis-date").val(
        diagnosis.date_of_diagnosis
          ? diagnosis.date_of_diagnosis.split("T")[0]
          : "",
      );
      $("#diagnostic-confirmation").val(
        diagnosis.diagnostic_confirmation || "",
      );
      $("#stage").val(diagnosis.stage || "");
      $("#laterality").val(diagnosis.laterality || "");
    } else {
      $(".modal-title").text("Add New Diagnosis");
      $("#diagnosis-form")[0].reset();
    }

    $("#diagnosis-modal").show();
  }

  function openReferralModal(referral = null) {
    currentEditingReferral = referral;

    if (referral) {
      $("#referral-modal .modal-title").text("Edit Referral");
      $("#referred-by").val(referral.referred_by || "");
      $("#facility-name").val(patient.facility ? patient.facility.name : "");
      $("#referral-diagnosis").val(referral.diagnosis || "");
      $("#referred-to").val(referral.referred_to || "");
      $("#country").val(referral.country || "Uganda");
      $("#city").val(referral.city || "");
      $("#referral-facility").val(referral.facility || "");
      $("#doctor").val(referral.doctor || "");
      $("#referral-date").val(
        referral.referral_date ? referral.referral_date.split("T")[0] : "",
      );
    } else {
      $("#referral-modal .modal-title").text("Add New Referral");
      $("#referral-form")[0].reset();
      $("#facility-name").val(patient.facility ? patient.facility.name : "");
      $("#country").val("Uganda");
    }

    $("#referral-modal").show();
  }

  function closeDiagnosisModal() {
    $("#diagnosis-modal").hide();
    currentEditingDiagnosis = null;
  }

  function closeReferralModal() {
    $("#referral-modal").hide();
    currentEditingReferral = null;
  }

  async function saveDiagnosis() {
    const rawDiagDate = $("#diagnosis-date").val();
    const diagDate = new Date(rawDiagDate).toISOString();
    const formData = {
      primary_site: $("#primary-site").val(),
      histology: $("#histology").val(),
      date_of_diagnosis: diagDate,
      diagnostic_confirmation: $("#diagnostic-confirmation").val(),
      stage: $("#stage").val(),
      laterality: $("#laterality").val(),
      cancer_patient_id: parseInt(patientId), // Include this
    };

    try {
      if (currentEditingDiagnosis) {
        // Update existing diagnosis
        const index = diagnoses.findIndex(
          (d) =>
            (d.ID || d.id) ===
            (currentEditingDiagnosis.ID || currentEditingDiagnosis.id),
        );
        if (index !== -1) {
          await fetch(
            `/api/v1/cancer-patients/${patientId}/diagnoses/${diagnoses[index].ID || diagnoses[index].id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(formData),
            },
          );

          console.log("Diagnosis updated successfully");
          diagnoses[index] = { ...diagnoses[index], ...formData };
        }
      } else {
        // Add new diagnosis
        const response = await fetch(
          `/api/v1/cancer-patients/${patientId}/diagnosis`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          },
        );

        if (!response.ok) throw new Error("Failed to create diagnosis");

        const savedDiagnosis = await response.json(); // Use backend-generated data
        diagnoses.push(savedDiagnosis);
        console.log("New diagnosis added successfully");
      }

      renderDiagnosesTable();
      closeDiagnosisModal();
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      alert("An error occurred while saving the diagnosis. Please try again.");
    }
  }

  async function saveReferral() {
    const rawReferralDate = $("#referral-date").val();
    const referralDate = new Date(rawReferralDate).toISOString();
    const formData = {
      referred_by: $("#referred-by").val(),
      facility_name: $("#facility-name").val(),
      diagnosis: $("#referral-diagnosis").val(),
      referred_to: $("#referred-to").val(),
      country: $("#country").val(),
      city: $("#city").val(),
      facility: $("#referral-facility").val(),
      doctor: $("#doctor").val(),
      referral_date: referralDate,
      status: "Pending",
    };
    const token = await getCsrfToken();
    try {
      if (currentEditingReferral) {
        // Update existing referral
        const index = referrals.findIndex(
          (r) =>
            (r.id || r.ID) ===
            (currentEditingReferral.id || currentEditingReferral.ID),
        );
        if (index !== -1) {
          referrals[index] = { ...referrals[index], ...formData };
        }
      } else {
        // Add new referral
        console.log("Saving new referral for patient ID:", patient.ID);
        const response = await fetch(
          `/api/v1/cancer-patients/${patient.ID}/referral`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": token,
            },
            body: JSON.stringify(formData),
          },
        );
        if (!response.ok) throw new Error("Failed to create referral");
        const newReferral = {
          id: Date.now(),
          ID: Date.now(),
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

  // Diagnosis events
  $(document).on("click", "#add-diagnosis-btn", function () {
    openDiagnosisModal();
  });

  $(document).on("click", ".edit-diagnosis", function (e) {
    e.stopPropagation();
    const diagnosisId = parseInt($(this).data("diagnosis-id"));
    const diagnosis = diagnoses.find((d) => (d.ID || d.id) === diagnosisId);
    if (diagnosis) {
      openDiagnosisModal(diagnosis);
    }
  });

  $(document).on("click", ".delete-diagnosis", function (e) {
    e.stopPropagation();
    const diagnosisId = parseInt($(this).data("diagnosis-id"));
    if (confirm("Are you sure you want to delete this diagnosis?")) {
      diagnoses = diagnoses.filter((d) => (d.ID || d.id) !== diagnosisId);
      renderDiagnosesTable();
    }
  });

  // Referral events
  $(document).on("click", "#add-referral-btn", function () {
    openReferralModal();
  });

  $(document).on("click", ".edit-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    const referral = referrals.find((r) => (r.id || r.ID) === referralId);
    if (referral) {
      openReferralModal(referral);
    }
  });

  $(document).on("click", ".delete-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    if (confirm("Are you sure you want to delete this referral?")) {
      referrals = referrals.filter((r) => (r.id || r.ID) !== referralId);
      renderReferralsTable();
    }
  });

  // Modal events
  $(document).on("click", ".close, #cancel-diagnosis-btn", function () {
    closeDiagnosisModal();
  });

  $(document).on("click", "#cancel-referral-btn", function () {
    closeReferralModal();
  });

  $(document).on("click", "#save-diagnosis-btn", function () {
    saveDiagnosis();
  });

  $(document).on("click", "#save-referral-btn", function () {
    saveReferral();
  });

  $(document).on("click", ".modal", function (e) {
    if (e.target === this) {
      closeDiagnosisModal();
      closeReferralModal();
    }
  });

  // Initialize the page
  renderPatientDetails();
  renderDiagnosesTable();
  renderReferralsTable();
});
