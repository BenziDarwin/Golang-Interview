// Helper function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

$(document).ready(async function () {
  const facilityId = getCookie("facility_id");
  let allReferrals = [];
  let filteredReferrals = [];
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

  // Define utility functions first
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

  // Show loading state
  $("#loading-state").show();
  $(".table-container").hide();

  // Fetch referrals from the API
  try {
    const response = await fetch(`/api/v1/referrals`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const sampleReferrals = await response.json();

    $("#loading-state").hide();

    if (!Array.isArray(sampleReferrals) || sampleReferrals.length === 0) {
      console.warn("No referrals found or data is not in expected format.");
      $("#empty-state").show();
      return;
    }

    // Initialize data
    allReferrals = sampleReferrals;
    filteredReferrals = sampleReferrals;

    // Initial render
    renderReferralsTable(allReferrals);
  } catch (error) {
    console.error("Error fetching referrals:", error);
    $("#loading-state").hide();
    alert("Failed to load referrals. Please try again later.");
    return;
  }

  function renderReferralsTable(referrals) {
    const tableBody = $("#referrals-table-body");
    const referralCount = $("#referral-count");

    // Calculate pagination
    totalPages = Math.ceil(referrals.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedReferrals = referrals.slice(startIndex, endIndex);

    referralCount.text(referrals.length);

    if (referrals.length === 0) {
      $(".table-container").hide();
      $("#empty-state").show();
      $("#pagination-controls").empty();
      $("#pagination-info").empty();
      return;
    }

    $("#empty-state").hide();
    $(".table-container").show();

    const tableRows = paginatedReferrals
      .map((referral) => {
        const patientInfo = referral.patient.patient_info;
        
        if (!patientInfo) {
          console.warn("Patient info not found for referral:", referral);
          return "";
        }

        const fullName = `${patientInfo.first_name} ${patientInfo.middle_name || ""} ${patientInfo.last_name}`.trim();
        const age = calculateAge(patientInfo.dob);
        
        // Use referral ID - based on the structure, it's referral.ID
        const patientId = referral.patient.ID;

        // Status from referral
        const status = referral.status || "active";

        // Handle date display - check if age is provided or calculate from DOB
        const dobDisplay = patientInfo.age 
          ? `${patientInfo.age} years (${formatDate(patientInfo.dob)})` 
          : `${formatDate(patientInfo.dob)} (${age} years)`;

        return `
                <tr>
                    <td>${fullName}</td>
                    <td>${dobDisplay}</td>
                    <td>${patientInfo.gender || "Not specified"}</td>
                    <td>${patientInfo.national_id || "Not provided"}</td>
                    <td>${referral.facility || referral.facility_name || "Current Facility"}</td>
                    <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                    <td>${formatDate(referral.patient.registration_date)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-referral" title="View Details" data-patient-id="${patientId}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" title="Delete Referral" data-patient-id="${patientId}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");

    tableBody.html(tableRows);
    renderPagination(referrals.length);
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
      `Showing ${startItem}-${endItem} of ${totalItems} referrals`,
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

  function filterReferrals(searchTerm) {
    currentPage = 1; // Reset to first page when filtering
    if (!searchTerm.trim()) {
      filteredReferrals = allReferrals;
    } else {
      const term = searchTerm.toLowerCase();
      filteredReferrals = allReferrals.filter((referral) => {
        const patientInfo = referral.patient.patient_info;
        
        if (!patientInfo) return false;

        const fullName = `${patientInfo.first_name} ${patientInfo.middle_name || ""} ${patientInfo.last_name}`.toLowerCase();
        const registrationId = (referral.patient.registration_id || "").toLowerCase();
        const nationalId = (patientInfo.national_id || "").toLowerCase();

        // Search in diagnosis - it's a string in this structure
        const diagnosis = (referral.diagnosis || "").toLowerCase();

        return (
          fullName.includes(term) ||
          registrationId.includes(term) ||
          nationalId.includes(term) ||
          diagnosis.includes(term)
        );
      });
    }
    renderReferralsTable(filteredReferrals);
  }

  function sortReferrals(column, direction) {
    filteredReferrals.sort((a, b) => {
      let aVal, bVal;
      
      const aPatientInfo = a.patient.patient_info;
      const bPatientInfo = b.patient.patient_info;

      switch (column) {
        case "id":
          aVal = a.patient.registration_id || "";
          bVal = b.patient.registration_id || "";
          break;
        case "name":
          aVal = aPatientInfo ? `${aPatientInfo.first_name} ${aPatientInfo.last_name}`.toLowerCase() : "";
          bVal = bPatientInfo ? `${bPatientInfo.first_name} ${bPatientInfo.last_name}`.toLowerCase() : "";
          break;
        case "dob":
          aVal = aPatientInfo ? new Date(aPatientInfo.dob) : new Date(0);
          bVal = bPatientInfo ? new Date(bPatientInfo.dob) : new Date(0);
          break;
        case "gender":
          aVal = aPatientInfo?.gender || "";
          bVal = bPatientInfo?.gender || "";
          break;
        case "mrn":
          aVal = aPatientInfo?.national_id || "";
          bVal = bPatientInfo?.national_id || "";
          break;
        case "diagnosis":
          aVal = a.diagnosis || "";
          bVal = b.diagnosis || "";
          break;
        case "stage":
          // Since diagnosis is a string, we can't extract stage easily
          // You might want to parse it or add a separate stage field
          aVal = "";
          bVal = "";
          break;
        case "registered":
          aVal = new Date(a.patient.registration_date);
          bVal = new Date(b.patient.registration_date);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });

    renderReferralsTable(filteredReferrals);
  }

  // Event handlers
  $("#referral-search").on("input", function () {
    const searchTerm = $(this).val();
    filterReferrals(searchTerm);
  });

  // View referral button click
  $(document).on("click", ".view-referral", function () {
    const patientId = $(this).data("patient-id");
    window.location.href = `/external_referrals/referrals-detail.html?id=${patientId}`;
  });

  // Delete referral button click
  $(document).on("click", ".action-btn.delete", function () {
    const patientId = $(this).data("patient-id");
    if (
      confirm(
        "Are you sure you want to delete this referral? This action cannot be undone.",
      )
    ) {
      // Implement delete functionality
      alert(`Delete referral functionality - Referral ID: ${patientId}`);
      // You would typically make an API call here to delete the referral
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

    sortReferrals(column, sortDirection);
  });

  // Pagination event handlers
  $(document).on("click", ".page-btn", function () {
    currentPage = parseInt($(this).data("page"));
    renderReferralsTable(filteredReferrals);
  });

  $(document).on("click", "#prev-page", function () {
    if (currentPage > 1) {
      currentPage--;
      renderReferralsTable(filteredReferrals);
    }
  });

  $(document).on("click", "#next-page", function () {
    if (currentPage < totalPages) {
      currentPage++;
      renderReferralsTable(filteredReferrals);
    }
  });

  $("#page-size").on("change", function () {
    pageSize = parseInt($(this).val());
    currentPage = 1;
    renderReferralsTable(filteredReferrals);
  });

  // Export functionality
  $("#export-btn").on("click", function () {
    const headers = [
      "Referral ID",
      "Name",
      "Date of Birth",
      "Age",
      "Gender",
      "National ID",
      "Facility",
      "Diagnosis",
      "Status",
      "Referral Date",
      "Registered",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredReferrals.map((referral) => {
        const patientInfo = referral.patient.patient_info;
        
        if (!patientInfo) return "";

        const fullName = `${patientInfo.first_name} ${patientInfo.middle_name || ""} ${patientInfo.last_name}`.trim();
        const status = referral.status || "active";

        return [
          referral.ID || "",
          `"${fullName}"`,
          formatDate(patientInfo.dob),
          patientInfo.age || calculateAge(patientInfo.dob),
          patientInfo.gender || "Not specified",
          patientInfo.national_id || "Not provided",
          `"${referral.facility_name || referral.facility || "Current Facility"}"`,
          `"${referral.diagnosis || "Not specified"}"`,
          status,
          formatDate(referral.referral_date),
          formatDate(referral.patient.registration_date),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "referrals_export.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  });

  // Mobile menu toggle
  $(".mobile-menu-toggle").click(function () {
    $("nav").toggleClass("active");
  });
});