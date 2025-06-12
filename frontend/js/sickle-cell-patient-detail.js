$(document).ready(async function () {
  // Get patient data from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get("id");

  if (!patientId) {
    alert("Patient ID not found in URL.");
    window.location.href = "patients.html";
    return;
  }

  const response = await fetch(`/api/v1/sickle-cell-patients/${patientId}`);
  if (!response.ok) {
    alert("Patient not found or an error occurred while fetching data.");
    window.location.href = "patients.html";
    return;
  }

  const patientData = await response.json();

  if (!patientData) {
    window.location.href = "patients.html";
    return;
  }

  // Use the patient data directly
  let patient = patientData.patient;
  let diagnoses = Array.isArray(patientData.diagnosis) ? patientData.diagnosis : [];
  let referrals = Array.isArray(patient.referrals) ? patient.treatments : [];
  let currentEditingDiagnosis = null;

  function formatDate(dateString) {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  function renderPatientDetails() {
    const fullName =
      `${patient.patient_info.first_name} ${patient.patient_info.middle_name || ""} ${patient.patient_info.last_name}`.trim();
    const age = calculateAge(patient.patient_info.dob);

    // Set patient name
    $("#patient-name").text(fullName);

    // Get submitter info (first submitter if multiple)
    const submitter =
      patient.submitter && patient.submitter.length > 0
        ? patient.submitter[0]
        : null;

    // Render basic info with improved grid layout
    const basicInfoHtml = `
    <div class="patient-basic-info">
        <div class="info-item">
            <span class="info-label">Registration ID</span>
            <span class="info-value">${patient.registration_id}</span>
        </div>
        <div class="info-item">
            <span class="info-label">National ID</span>
            <span class="info-value">${patient.patient_info.national_id || "Not provided"}</span>
        </div>
        ${
          patient.patient_info.dob &&
          patient.patient_info.dob.includes("0001-01-01")
            ? `<div class="info-item">
            <span class="info-label">Age</span>
            <span class="info-value">${patient.patient_info.age} years</span>
        </div>`
            : `      <div class="info-item">
            <span class="info-label">Date of Birth</span>
            <span class="info-value">${formatDate(patient.patient_info.dob)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Age</span>
            <span class="info-value">${age} years</span>
        </div>`
        }
  
        <div class="info-item">
            <span class="info-label">Gender</span>
            <span class="info-value">${patient.patient_info.gender}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Registration Date</span>
            <span class="info-value">${formatDate(patient.registration_date)}</span>
        </div>
        ${
          patient.patient_info.phone
            ? `
        <div class="info-item">
            <span class="info-label">Phone</span>
            <span class="info-value">${patient.patient_info.phone}</span>
        </div>
        `
            : ""
        }
        ${
          patient.patient_info.district
            ? `
        <div class="info-item">
            <span class="info-label">District</span>
            <span class="info-value">${patient.patient_info.district}</span>
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
      $("#diagnoses-accordion").html(`
                <div class="empty-state">
                    <i class="fas fa-stethoscope"></i>
                    <h4>No Diagnoses Recorded</h4>
                    <p>No cancer diagnoses have been recorded for this patient yet.</p>
                </div>
            `);
      return;
    }

    const tableHtml = `
            <div class="accordion-table-container">
                <table class="accordion-table">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Primary Site</th>
                            <th style="width: 25%;">Disease Type</th>
                            <th style="width: 15%;">Diagnostic Confirmation</th>
                            <th style="width: 20%;">Diagnosis Date</th>
                            <th style="width: 15%;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${diagnoses
                          .map((diagnosis, index) => {
                            const primaryBadge =
                              index === 0
                                ? '<span class="primary-badge">Primary</span>'
                                : "";

                            return `
                                <tr class="accordion-row">
                                    <tr class="accordion-header-row" data-target="diagnosis-${diagnosis.ID}">
                                        <td style="width: 25%;">
                                            <div class="cell-content">
                                                ${diagnosis.primary_site || "Not specified"} 
                                                ${primaryBadge}
                                            </div>
                                        </td>
                                        <td style="width: 25%;">
                                            <div class="cell-content">${diagnosis.disease_type || "Not specified"}</div>
                                        </td>
                                        <td style="width: 15%;">
                                            <div class="cell-content">
                                                  <div class="cell-content">${diagnosis.diagnostic_confirmation || "Not specified"}</div>
                                            </div>
                                        </td>
                                        <td style="width: 20%;">
                                            <div class="cell-content">${formatDate(diagnosis.date_of_diagnosis)}</div>
                                        </td>
                                        <td style="width: 15%;">
                                            <div class="accordion-actions">
                                                <button class="btn small text edit-diagnosis" data-diagnosis-id="${diagnosis.ID}" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn small danger delete-diagnosis" data-diagnosis-id="${diagnosis.ID}" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                                <i class="fas fa-chevron-down accordion-icon"></i>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="accordion-content-row" id="diagnosis-${diagnosis.ID}">
                                        <td colspan="5" class="accordion-content-cell">
                                            <div class="accordion-content-inner">
                                                <div class="accordion-details-grid">
                                                    <div class="detail-group">
                                                        <div class="detail-item">
                                                            <div class="detail-label">Primary Site</div>
                                                            <div class="detail-value">${diagnosis.primary_site || "Not specified"}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Histology</div>
                                                            <div class="detail-value">${diagnosis.histology || "Not specified"}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Stage</div>
                                                            <div class="detail-value">
                                                                <span class="stage-badge stage-${diagnosis.stage?.toLowerCase()}">${diagnosis.stage || "Not specified"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="detail-group">
                                                        <div class="detail-item">
                                                            <div class="detail-label">Date of Diagnosis</div>
                                                            <div class="detail-value">${formatDate(diagnosis.date_of_diagnosis)}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Diagnostic Confirmation</div>
                                                            <div class="detail-value">${diagnosis.diagnostic_confirmation || "Not specified"}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Laterality</div>
                                                            <div class="detail-value">${diagnosis.laterality || "Not specified"}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    $("#diagnoses-accordion").html(tableHtml);
  }

  function renderTreatmentsTable() {
    console.log(
      "Rendering treatments table with",
      treatments.length,
      "treatments",
    );

    if (!treatments || treatments.length === 0) {
      $("#treatments-accordion").html(`
                <div class="empty-state">
                    <i class="fas fa-pills"></i>
                    <h4>No Treatments Recorded</h4>
                    <p>No cancer treatments have been recorded for this patient yet.</p>
                </div>
            `);
      return;
    }

    const tableHtml = `
            <div class="accordion-table-container">
                <table class="accordion-table">
                    <thead>
                        <tr>
                            <th style="width: 30%;">Treatment Types</th>
                            <th style="width: 25%;">Treating Physician</th>
                            <th style="width: 20%;">First Treatment Date</th>
                            <th style="width: 15%;">Source</th>
                            <th style="width: 10%;">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${treatments
                          .map((treatment, index) => {
                            const treatmentTypes = treatment.types
                              ? treatment.types.split(",").map((t) => t.trim())
                              : [];

                            return `
                                <tr class="accordion-row">
                                    <tr class="accordion-header-row" data-target="treatment-${treatment.ID}">
                                        <td style="width: 30%;">
                                            <div class="cell-content">
                                                <div class="treatment-types-preview">
                                                    ${treatmentTypes
                                                      .slice(0, 2)
                                                      .map(
                                                        (type) =>
                                                          `<span class="treatment-type-badge">${type}</span>`,
                                                      )
                                                      .join("")}
                                                    ${treatmentTypes.length > 2 ? `<span class="more-badge">+${treatmentTypes.length - 2}</span>` : ""}
                                                </div>
                                            </div>
                                        </td>
                                        <td style="width: 25%;">
                                            <div class="cell-content">${treatment.treating_physician || "Not specified"}</div>
                                        </td>
                                        <td style="width: 20%;">
                                            <div class="cell-content">${formatDate(treatment.first_treatment_date)}</div>
                                        </td>
                                        <td style="width: 15%;">
                                            <div class="cell-content">${treatment.reporting_source || "Not specified"}</div>
                                        </td>
                                        <td style="width: 10%;">
                                            <div class="accordion-actions">
                                                <i class="fas fa-chevron-down accordion-icon"></i>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="accordion-content-row" id="treatment-${treatment.ID}">
                                        <td colspan="5" class="accordion-content-cell">
                                            <div class="accordion-content-inner">
                                                <div class="treatment-details-section">
                                                    <div class="treatment-types-full">
                                                        <h5>Treatment Types</h5>
                                                        <div class="treatment-types-list">
                                                            ${treatmentTypes.map((type) => `<span class="treatment-type-badge">${type}</span>`).join("")}
                                                        </div>
                                                    </div>
                                                    <div class="accordion-details-grid">
                                                        <div class="detail-group">
                                                            <div class="detail-item">
                                                                <div class="detail-label">First Treatment Date</div>
                                                                <div class="detail-value">${formatDate(treatment.first_treatment_date)}</div>
                                                            </div>
                                                            <div class="detail-item">
                                                                <div class="detail-label">Treating Physician</div>
                                                                <div class="detail-value">${treatment.treating_physician || "Not specified"}</div>
                                                            </div>
                                                        </div>
                                                        <div class="detail-group">
                                                            <div class="detail-item">
                                                                <div class="detail-label">Reporting Source</div>
                                                                <div class="detail-value">${treatment.reporting_source || "Not specified"}</div>
                                                            </div>
                                                            <div class="detail-item">
                                                                <div class="detail-label">Notes</div>
                                                                <div class="detail-value">${treatment.notes || "No notes"}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    $("#treatments-accordion").html(tableHtml);
  }

  function renderReferralsTable() {
    if (referrals.length === 0) {
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
                          .map((referral, index) => {
                            const statusClass =
                              referral.status === "Completed"
                                ? "status-completed"
                                : referral.status === "Pending"
                                  ? "status-pending"
                                  : "status-inactive";

                            return `
                                <tr class="accordion-row">
                                    <tr class="accordion-header-row" data-target="referral-${referral.id}">
                                        <td style="width: 25%;">
                                            <div class="cell-content">${referral.referred_to}</div>
                                        </td>
                                        <td style="width: 20%;">
                                            <div class="cell-content">${referral.country}, ${referral.city}</div>
                                        </td>
                                        <td style="width: 20%;">
                                            <div class="cell-content">${referral.facility}</div>
                                        </td>
                                        <td style="width: 15%;">
                                            <div class="cell-content">${formatDate(referral.referral_date)}</div>
                                        </td>
                                        <td style="width: 20%;">
                                            <div class="cell-content">
                                                <span class="status-badge ${statusClass}">${referral.status}</span>
                                                <div class="accordion-actions">
                                                    <button class="btn small text edit-referral" data-referral-id="${referral.id}" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn small danger delete-referral" data-referral-id="${referral.id}" title="Delete">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                    <i class="fas fa-chevron-down accordion-icon"></i>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="accordion-content-row" id="referral-${referral.id}">
                                        <td colspan="5" class="accordion-content-cell">
                                            <div class="accordion-content-inner">
                                                <div class="accordion-details-grid">
                                                    <div class="detail-group">
                                                        <div class="detail-item">
                                                            <div class="detail-label">Referred By</div>
                                                            <div class="detail-value">${referral.referred_by}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Facility Name</div>
                                                            <div class="detail-value">${referral.facility_name}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Diagnosis</div>
                                                            <div class="detail-value">${referral.diagnosis}</div>
                                                        </div>
                                                    </div>
                                                    <div class="detail-group">
                                                        <div class="detail-item">
                                                            <div class="detail-label">Referred To</div>
                                                            <div class="detail-value">${referral.referred_to}</div>
                                                        </div>
                                                        <div class="detail-item">
                                                            <div class="detail-label">Doctor</div>
                                                            <div class="detail-value">${referral.doctor}</div>
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
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    $("#referrals-accordion").html(tableHtml);
  }

  // Modal functions (keeping existing functionality)
  function openDiagnosisModal(diagnosis = null) {
    currentEditingDiagnosis = diagnosis;

    if (diagnosis) {
      $("#diagnosis-modal-title").text("Edit Diagnosis");
      $("#primary-site").val(diagnosis.primary_site);
      $("#histology").val(diagnosis.histology);
      $("#diagnosis-date").val(diagnosis.date_of_diagnosis.split("T")[0]);
      $("#diagnostic-confirmation").val(diagnosis.diagnostic_confirmation);
      $("#stage").val(diagnosis.stage);
      $("#laterality").val(diagnosis.laterality);
    } else {
      $("#diagnosis-modal-title").text("Add New Diagnosis");
      $("#diagnosis-form")[0].reset();
    }

    $("#diagnosis-modal").show();
  }

  // Fixed openReferralModal function
  function openReferralModal(referral = null) {
    currentEditingReferral = referral;

    console.log("Opening referral modal for patient:", patient);

    if (referral) {
      $("#referral-modal-title").text("Edit Referral");
      $("#referred-by").val(referral.referred_by);
      // Fixed: Use the patient variable that's in scope, not the parameter
      $("#facility-name").val(patient.facility ? patient.facility.name : "");
      $("#referral-diagnosis").val(referral.diagnosis);
      $("#referred-to").val(referral.referred_to);
      $("#country").val(referral.country);
      $("#city").val(referral.city);
      $("#referral-facility").val(referral.facility);
      $("#doctor").val(referral.doctor);
      $("#referral-date").val(referral.referral_date);
    } else {
      $("#referral-modal-title").text("Add New Referral");
      $("#referral-form")[0].reset();
      // Pre-populate facility name for new referrals
      $("#facility-name").val(patient.facility ? patient.facility.name : "");
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
    const date = new Date($("#diagnosis-date").val());
    const isoDate = date.toISOString();
    const formData = {
      primary_site: $("#primary-site").val(),
      histology: $("#histology").val(),
      date_of_diagnosis: isoDate,
      diagnostic_confirmation: $("#diagnostic-confirmation").val(),
      stage: $("#stage").val(),
      laterality: $("#laterality").val(),
    };

    try {
      const response = await fetch(`/api/v1/patients/${patientId}/diagnosis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save diagnosis");
      }

      const newDiagnosis = await response.json();
      diagnoses.push(newDiagnosis);
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      alert("An error occurred while saving the diagnosis. Please try again.");
      return;
    }

    if (currentEditingDiagnosis) {
      const index = diagnoses.findIndex(
        (d) => d.ID === currentEditingDiagnosis.ID,
      );
      if (index !== -1) {
        diagnoses[index] = { ...diagnoses[index], ...formData };
      }
    } else {
      const newDiagnosis = {
        ID: Date.now(),
        ...formData,
      };
      diagnoses.push(newDiagnosis);
    }

    renderDiagnosesTable();
    closeDiagnosisModal();
  }

  async function saveReferral() {
    const date = new Date($("#referral-date").val());
    const isoDate = date.toISOString(); // Get just the date part
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

    try {
      const response = await fetch(`/api/v1/patients/${patientId}/referral`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save referral");
      }

      const newReferral = await response.json();
      referrals.push(newReferral);
    } catch (error) {
      console.error("Error saving referral:", error);
      alert("An error occurred while saving the referral. Please try again.");
      return;
    }

    renderReferralsTable();
    closeReferralModal();
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

  // Diagnosis events
  $(document).on("click", "#add-diagnosis-btn", function () {
    openDiagnosisModal();
  });

  $(document).on("click", ".edit-diagnosis", function (e) {
    e.stopPropagation();
    const diagnosisId = parseInt($(this).data("diagnosis-id"));
    const diagnosis = diagnoses.find((d) => d.ID === diagnosisId);
    if (diagnosis) {
      openDiagnosisModal(diagnosis);
    }
  });

  $(document).on("click", ".delete-diagnosis", function (e) {
    e.stopPropagation();
    const diagnosisId = parseInt($(this).data("diagnosis-id"));
    if (confirm("Are you sure you want to delete this diagnosis?")) {
      diagnoses = diagnoses.filter((d) => d.ID !== diagnosisId);
      renderDiagnosesTable();
    }
  });

  // Referral events - Fixed to remove patient parameter
  $(document).on("click", "#add-referral-btn", function () {
    openReferralModal();
  });

  $(document).on("click", ".edit-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    const referral = referrals.find((r) => r.id === referralId);
    if (referral) {
      openReferralModal(referral); // Removed patient parameter
    }
  });

  $(document).on("click", ".delete-referral", function (e) {
    e.stopPropagation();
    const referralId = parseInt($(this).data("referral-id"));
    if (confirm("Are you sure you want to delete this referral?")) {
      referrals = referrals.filter((r) => r.id !== referralId);
      renderReferralsTable();
    }
  });

  // Modal events
  $(document).on(
    "click",
    "#close-diagnosis-modal, #cancel-diagnosis-btn",
    function () {
      closeDiagnosisModal();
    },
  );

  $(document).on(
    "click",
    "#close-referral-modal, #cancel-referral-btn",
    function () {
      closeReferralModal();
    },
  );

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

  $(".mobile-menu-toggle").click(function () {
    $("nav").toggleClass("active");
  });

  // Initialize the page
  renderPatientDetails();
  renderDiagnosesTable();
  renderTreatmentsTable();
  renderReferralsTable();
});
