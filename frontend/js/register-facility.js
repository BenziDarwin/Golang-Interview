$(document).ready(function () {
  // Show/hide "Other" field based on transport option selection
  $("#transport-option").on("change", function () {
    if ($(this).val() === "other") {
      $("#other-transport-group").removeClass("hidden");
      $("#other-transport").attr("required", true);
    } else {
      $("#other-transport-group").addClass("hidden");
      $("#other-transport").attr("required", false);
    }
  });

  // Handle "No genomic testing" checkbox
  $("#genomic-none").on("change", function () {
    if ($(this).is(":checked")) {
      $('input[name="genomic-tests[]"]')
        .not(this)
        .prop("checked", false)
        .prop("disabled", true);
    } else {
      $('input[name="genomic-tests[]"]').prop("disabled", false);
    }
  });

  // Format phone numbers (XXX) XXX-XXXX
  $('input[type="tel"]').on("input", function () {
    let value = $(this).val().replace(/\D/g, "");

    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    if (value.length > 6) {
      value =
        "(" +
        value.substring(0, 3) +
        ") " +
        value.substring(3, 6) +
        "-" +
        value.substring(6);
    } else if (value.length > 3) {
      value = "(" + value.substring(0, 3) + ") " + value.substring(3);
    } else if (value.length > 0) {
      value = "(" + value;
    }

    $(this).val(value);
  });

  // Handle form review step
  $(".next-step").click(function () {
    const currentStep = $(this).closest(".form-step");

    // If moving to review step, populate summary
    if (currentStep.data("step") === 2) {
      populateReviewSummary();
    }
  });

  // Populate review summary
  function populateReviewSummary() {
    const summary = $("#review-summary");
    summary.empty();

    // Basic Information
    const basicSection = $(`
      <div class="review-section">
        <h5>Basic Information</h5>
        <div class="review-content"></div>
      </div>
    `);

    const basicContent = basicSection.find(".review-content");
    addReviewItem(basicContent, "Facility Name", $("#facility-name").val());
    addReviewItem(
      basicContent,
      "Organization Name",
      $("#organization-name").val(),
    );
    addReviewItem(
      basicContent,
      "Provider Specialty",
      $("#provider-specialty").val(),
    );

    // Get selected organization types
    const orgTypes = [];
    $('input[name="registry-type[]"]:checked').each(function () {
      orgTypes.push($(this).next("label").text());
    });
    addReviewItem(basicContent, "Organization Type", orgTypes.join(", "));
    addReviewItem(
      basicContent,
      "Yearly Cases",
      $("#yearly-cases option:selected").text(),
    );

    // Get selected genomic tests
    const genomicTests = [];
    $('input[name="genomic-tests[]"]:checked').each(function () {
      if ($(this).val() !== "none") {
        genomicTests.push($(this).val());
      }
    });

    if ($("#genomic-none").is(":checked")) {
      addReviewItem(
        basicContent,
        "Genomic Testing",
        "No genomic testing performed",
      );
    } else if (genomicTests.length > 0) {
      addReviewItem(basicContent, "Genomic Tests", genomicTests.join(", "));
    }

    summary.append(basicSection);

    // Contact Information
    const contactSection = $(`
      <div class="review-section">
        <h5>Contact Information</h5>
        <div class="review-content"></div>
      </div>
    `);

    const contactContent = contactSection.find(".review-content");

    const contactFields = [
      { id: "facility-incharge-name", label: "Incharge Name" },
      { id: "facility-incharge-email", label: "Incharge Email" },
      { id: "facility-incharge-phone", label: "Incharge Phone" },

      { id: "registry-focal-person-name", label: "Focal Person Name" },
      { id: "registry-focal-person-email", label: "Focal Person Email" },
      { id: "registry-focal-person-phone", label: "Focal Person Phone" },

      { id: "alt-registry-focal-person-name", label: "Alt Focal Name" },
      { id: "alt-registry-focal-person-email", label: "Alt Focal Email" },
      { id: "alt-registry-focal-person-phone", label: "Alt Focal Phone" },
    ];

    contactFields.forEach((field) => {
      addReviewItem(contactContent, field.label, $(`#${field.id}`).val());
    });

    summary.append(contactSection);
  }

  // Helper function to add a review item
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

  // Handle form submission
  $("#register-facility-form").submit(async function (e) {
    e.preventDefault();

    // Generate a random facility ID for demo purposes
    const facilityId = "TMP-" + Math.floor(100000 + Math.random() * 900000);

    // Collect form data
    const formData = {
      name: $("#facility-name").val(),
      provider_specialty: $("#provider-specialty").val(),
      contact: {
        facility_incharge: {
          name: $("#facility-incharge-name").val(),
          email: $("#facility-incharge-email").val(),
          phone: $("#facility-incharge-phone").val(),
        },
        registry_focal_person: {
          name: $("#registry-focal-person-name").val(),
          email: $("#registry-focal-person-email").val(),
          phone: $("#registry-focal-person-phone").val(),
        },
        alt_registry_focal_person: {
          name: $("#alt-registry-focal-person-name").val(),
          email: $("#alt-registry-focal-person-email").val(),
          phone: $("#alt-registry-focal-person-phone").val(),
        },
      },
      yearly_cases: $("#yearly-cases").val(),
      genomic_tests: $('input[name="genomic-tests[]"]:checked')
        .map(function () {
          return $(this).val() !== "none" ? $(this).val() : null;
        })
        .get()
        .filter(Boolean),
      identification: {
        registry_id: facilityId,
      },
      status: "pending",
    };

    // Log the JSON data
    try {
      const response = await fetch("/api/v1/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const result = await response.json();
      console.log("Facility registered successfully:", result);
    } catch (error) {
      console.error("Error registering facility:", error);
      alert(
        "There was an error registering the facility. Please try again later.",
      );
      return;
    }

    // Hide form and show success message
    $("#register-facility-form").addClass("hidden");
    $("#registration-success").removeClass("hidden");

    // Set the temporary facility ID
    $("#temp-facility-id").text(facilityId);

    // Scroll to top of success message
    $("html, body").animate(
      {
        scrollTop: $("#registration-success").offset().top - 100,
      },
      500,
    );
  });
});
