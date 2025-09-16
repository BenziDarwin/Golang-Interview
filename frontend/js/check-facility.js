async function getCsrfToken() {
  const res = await fetch("/api/csrf-token", { method: "GET" });
  return res.headers.get("X-CSRF-Token");
}

$(document).ready(function () {
  // Mock database of facilities for demo purposes

  // Switch between search options
  $(".search-option").click(function () {
    $(".search-option").removeClass("active");
    $(this).addClass("active");

    const searchType = $(this).data("search");

    // Hide all search inputs and show only the selected one
    $("#name-search, #id-search").addClass("hidden");
    $(`#${searchType}-search`).removeClass("hidden");
  });

  // Handle facility search form submission
  $("#check-facility-form").submit(async function (e) {
    e.preventDefault();

    // Get active search type
    const activeSearchType = $(".search-option.active").data("search");
    let searchValue = "";

    // Get search value based on active search type
    switch (activeSearchType) {
      case "name":
        searchValue = $("#facility-name").val().trim();
        break;
      case "id":
        searchValue = $("#facility-id").val().trim();
        break;
      case "npi":
        searchValue = $("#facility-npi").val().trim();
        break;
    }

    // Validate search input
    if (!searchValue) {
      alert("Please enter a search term");
      return;
    }

    // Perform search
    let results = null;
    let response;
    let data;
    const token = await getCsrfToken();
    switch (activeSearchType) {
      case "name":
        response = await fetch(
          "/api/v1/facilities/name/exists/" + encodeURIComponent(searchValue),
          { headers: { "X-CSRF-Token": token } },
        );
        data = await response.json();
        results = data;
        break;
      case "id":
        response = await fetch(
          "/api/v1/facilities/registry/exists/" + searchValue,
          { headers: { "X-CSRF-Token": token } },
        );
        data = await response.json();
        results = data;
        break;
      // case 'npi':
      //   response = await fetch("/api/v1/facilities/npi/" + searchValue);
      //   data = await response.json();
      //   results = data
      //   break;
    }

    // Display results
    displaySearchResults(results);
  });

  // Display search results
  function displaySearchResults(results) {
    const resultsContainer = $("#search-results");
    const resultsContent = $(".results-content");

    // Clear previous results
    resultsContent.empty();

    // Show results container
    resultsContainer.removeClass("hidden");

    console.log("Search Results:", results);

    if (results.error !== null && results.error !== undefined) {
      resultsContent.html(`
      <div class="no-results">
        <p><strong>Facility does not exist.</strong></p>
        <p>We could not find a facility matching your search criteria.</p>
        <p>If you need to register a new facility, please click below:</p>
        <a href="register-facility.html" class="btn secondary">Register New Facility</a>
      </div>
    `);
      return;
    }

    const facility = results;

    let statusText = "";
    let actionMessage = "";

    switch (facility.status) {
      case "active":
        statusText = "Active";
        actionMessage =
          "You may now log in to access your account information.";
        break;
      case "pending":
        statusText = "Pending Activation";
        actionMessage =
          "Please contact your administrator to activate your account.";
        break;
      case "inactive":
        statusText = "Inactive";
        actionMessage =
          "Your account is inactive. Please contact your administrator for assistance.";
        break;
      default:
        statusText = "Unknown";
        actionMessage = "Please verify your details or contact support.";
    }

    resultsContent.html(`
    <div class="result-summary">
      <h4>✅ Facility Found</h4>
      <p><strong>Your facility exists.</strong></p>
      <p><strong>Status:</strong> ${statusText}</p>
      <p>${actionMessage}</p>

      <!-- Optional actions -->
      ${
        facility.status === "active"
          ? `
        <a href="login.html" class="btn primary">Log In</a>
      `
          : `
        <a href="contact-admin.html" class="btn secondary">Contact Administrator</a>
      `
      }
    </div>
  `);
  }

  // Format date for display
  function formatDate(dateString) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  }

  // Close search results
  $("#close-results").click(function () {
    $("#search-results").addClass("hidden");
  });

  // Clear search form
  $("#check-facility-form").on("reset", function () {
    $("#search-results").addClass("hidden");
  });
});
