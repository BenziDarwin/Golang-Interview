// Helper function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

$(document).ready(async function () {
  const facilityId = getCookie("facility_id");
  let allPatients = [];
  let filteredPatients = [];
  let currentPage = 1;
  let pageSize = 10;
  let totalPages = 1;
  let sortColumn = "";
  let sortDirection = "asc";
  if (!facilityId) {
    alert("Facility ID not found. Please register a facility first.");
    window.location.href = "register-facility.html";
    return;
  }

  // Show loading state
  $("#loading-state").show();
  $(".table-container").hide();

  // Fetch patients from the API
  try {
    const response = await fetch(
      `/api/v1/cancer-patients/facility/${facilityId}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const samplePatients = await response.json();

    $("#loading-state").hide();

    if (!Array.isArray(samplePatients) || samplePatients.length === 0) {
      console.warn("No patients found or data is not in expected format.");
      $("#empty-state").show();
      return;
    }

    // Initialize data
    allPatients = samplePatients;
    filteredPatients = samplePatients;

    // Initial render
    renderPatientsTable(allPatients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    $("#loading-state").hide();
    alert("Failed to load patients. Please try again later.");
    return;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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

  function renderPatientsTable(patients) {
    const tableBody = $("#patients-table-body");
    const patientCount = $("#patient-count");

    // Calculate pagination
    totalPages = Math.ceil(patients.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPatients = patients.slice(startIndex, endIndex);

    patientCount.text(patients.length);

    if (patients.length === 0) {
      $(".table-container").hide();
      $("#empty-state").show();
      $("#pagination-controls").empty();
      $("#pagination-info").empty();
      return;
    }

    $("#empty-state").hide();
    $(".table-container").show();

    const tableRows = paginatedPatients
      .map((patient) => {
        const patientId = patient.ID || patient.id;
        patient = patient.patient || patient; // Handle both formats
        const fullName =
          `${patient.patient_info.first_name} ${patient.patient_info.middle_name || ""} ${patient.patient_info.last_name}`.trim();
        const age = calculateAge(patient.patient_info.dob);

        // Get the most recent diagnosis (first in array since they're ordered by creation date)
        const latestDiagnosis =
          patient.diagnosis && patient.diagnosis.length > 0
            ? patient.diagnosis[0]
            : null;
        const primarySite = latestDiagnosis
          ? latestDiagnosis.primary_site
          : "Not specified";
        const stage = latestDiagnosis ? latestDiagnosis.stage : "Not specified";

        // Determine status based on patient data (you may need to adjust this logic)
        const status = patient.status || "active"; // Default to active if no status field

        return `
                <tr>
                    <td><strong>${patient.registration_id}</strong></td>
                    <td>${fullName}</td>
                    <td>${patient.patient_info.dob && patient.patient_info.dob.includes("0001-01-01") ? `${patient.patient_info.age} years` : formatDate(patient.patient_info.dob)` (${age} years)`}</td>
                    <td>${patient.patient_info.gender}</td>
                    <td>${patient.patient_info.national_id || "Not provided"}</td>
                    <td>${patient.facility_name || "Current Facility"}</td>
                    <td>${primarySite}</td>
                    <td>${stage}</td>
                    <td><span class="status-badge status-${status}">${status}</span></td>
                    <td>${formatDate(patient.registration_date)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-patient" title="View Details" data-patient-id="${patientId}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" title="Delete Patient" data-patient-id="${patientId}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");

    tableBody.html(tableRows);
    renderPagination(patients.length);
  }

  function renderPagination(totalItems) {
    const paginationControls = $("#pagination-controls");
    const paginationInfo = $("#pagination-info");

    if (totalItems === 0) {
      paginationControls.empty();
      paginationInfo.empty();
      return;
    }

    // Update pagination info
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    paginationInfo.text(
      `Showing ${startItem}-${endItem} of ${totalItems} patients`,
    );

    // Generate pagination buttons
    let paginationHtml = "";

    // Previous button
    paginationHtml += `<button class="pagination-btn" id="prev-page" ${currentPage === 1 ? "disabled" : ""}>
            <i class="fas fa-chevron-left"></i>
        </button>`;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      paginationHtml += `<button class="pagination-btn page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button class="pagination-btn page-btn ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
      paginationHtml += `<button class="pagination-btn page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    paginationHtml += `<button class="pagination-btn" id="next-page" ${currentPage === totalPages ? "disabled" : ""}>
            <i class="fas fa-chevron-right"></i>
        </button>`;

    paginationControls.html(paginationHtml);
  }

  function filterPatients(searchTerm) {
    currentPage = 1; // Reset to first page when filtering
    if (!searchTerm.trim()) {
      filteredPatients = allPatients;
    } else {
      const term = searchTerm.toLowerCase();
      filteredPatients = allPatients.filter((patient) => {
        const fullName =
          `${patient.patient_info.first_name} ${patient.patient_info.middle_name || ""} ${patient.patient_info.last_name}`.toLowerCase();
        const registrationId = patient.registration_id.toLowerCase();
        const nationalId = (
          patient.patient_info.national_id || ""
        ).toLowerCase();

        // Search in diagnosis primary sites
        const primarySites = patient.diagnosis
          ? patient.diagnosis.map((d) => d.primary_site.toLowerCase()).join(" ")
          : "";

        return (
          fullName.includes(term) ||
          registrationId.includes(term) ||
          nationalId.includes(term) ||
          primarySites.includes(term)
        );
      });
    }
    renderPatientsTable(filteredPatients);
  }

  function sortPatients(column, direction) {
    filteredPatients.sort((a, b) => {
      let aVal, bVal;

      switch (column) {
        case "id":
          aVal = a.registration_id;
          bVal = b.registration_id;
          break;
        case "name":
          aVal =
            `${a.patient_info.first_name} ${a.patient_info.last_name}`.toLowerCase();
          bVal =
            `${b.patient_info.first_name} ${b.patient_info.last_name}`.toLowerCase();
          break;
        case "dob":
          aVal = new Date(a.patient_info.dob);
          bVal = new Date(b.patient_info.dob);
          break;
        case "gender":
          aVal = a.patient_info.gender;
          bVal = b.patient_info.gender;
          break;
        case "mrn":
          aVal = a.patient_info.national_id || "";
          bVal = b.patient_info.national_id || "";
          break;
        case "diagnosis":
          aVal =
            a.diagnosis && a.diagnosis.length > 0
              ? a.diagnosis[0].primary_site
              : "";
          bVal =
            b.diagnosis && b.diagnosis.length > 0
              ? b.diagnosis[0].primary_site
              : "";
          break;
        case "stage":
          aVal =
            a.diagnosis && a.diagnosis.length > 0 ? a.diagnosis[0].stage : "";
          bVal =
            b.diagnosis && b.diagnosis.length > 0 ? b.diagnosis[0].stage : "";
          break;
        case "registered":
          aVal = new Date(a.registration_date);
          bVal = new Date(b.registration_date);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });

    renderPatientsTable(filteredPatients);
  }

  // Event handlers
  $("#patient-search").on("input", function () {
    const searchTerm = $(this).val();
    filterPatients(searchTerm);
  });

  // View patient button click
  $(document).on("click", ".view-patient", function () {
    const patientId = $(this).data("patient-id");
    window.location.href = `cancer-patient-detail.html?id=${patientId}`;
  });

  // Delete patient button click
  $(document).on("click", ".action-btn.delete", function () {
    const patientId = $(this).data("patient-id");
    if (
      confirm(
        "Are you sure you want to delete this patient? This action cannot be undone.",
      )
    ) {
      // Implement delete functionality
      alert(`Delete patient functionality - Patient ID: ${patientId}`);
      // You would typically make an API call here to delete the patient
    }
  });

  // Sorting functionality
  $(document).on("click", ".sortable", function () {
    const column = $(this).data("sort");

    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }

    // Update sort indicators
    $(".sortable").removeClass("sort-asc sort-desc");
    $(this).addClass(sortDirection === "asc" ? "sort-asc" : "sort-desc");

    sortPatients(column, sortDirection);
  });

  // Pagination event handlers
  $(document).on("click", ".page-btn", function () {
    currentPage = parseInt($(this).data("page"));
    renderPatientsTable(filteredPatients);
  });

  $(document).on("click", "#prev-page", function () {
    if (currentPage > 1) {
      currentPage--;
      renderPatientsTable(filteredPatients);
    }
  });

  $(document).on("click", "#next-page", function () {
    if (currentPage < totalPages) {
      currentPage++;
      renderPatientsTable(filteredPatients);
    }
  });

  $("#page-size").on("change", function () {
    pageSize = parseInt($(this).val());
    currentPage = 1;
    renderPatientsTable(filteredPatients);
  });

  // Export functionality
  $("#export-btn").on("click", function () {
    const headers = [
      "Patient ID",
      "Name",
      "Date of Birth",
      "Gender",
      "National ID",
      "Facility",
      "Primary Diagnosis",
      "Stage",
      "Status",
      "Registered",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredPatients.map((patient) => {
        const fullName =
          `${patient.patient_info.first_name} ${patient.patient_info.middle_name || ""} ${patient.patient_info.last_name}`.trim();
        const latestDiagnosis =
          patient.diagnosis && patient.diagnosis.length > 0
            ? patient.diagnosis[0]
            : null;
        const primarySite = latestDiagnosis
          ? latestDiagnosis.primary_site
          : "Not specified";
        const stage = latestDiagnosis ? latestDiagnosis.stage : "Not specified";
        const status = patient.status || "active";

        return [
          patient.registration_id,
          `"${fullName}"`,
          patient.patient_info.dob &&
          patient.patient_info.dob.includes("0001-01-01")
            ? `${patient.patient_info.age} years`
            : formatDate(patient.patient_info.dob),
          patient.patient_info.gender,
          patient.patient_info.national_id || "Not provided",
          `"${patient.facility_name || "Current Facility"}"`,
          `"${primarySite}"`,
          stage,
          status,
          formatDate(patient.registration_date),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patients_export.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  });

  // Mobile menu toggle
  $(".mobile-menu-toggle").click(function () {
    $("nav").toggleClass("active");
  });
});
