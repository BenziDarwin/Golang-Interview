async function getCsrfToken() {
  const res = await fetch("/api/csrf-token", { method: "GET" });
  return res.headers.get("X-CSRF-Token");
}

class FacilityProfile {
  constructor() {
    this.isEditMode = false;
    this.originalData = {};
    this.currentData = {};
    this.facilityId = this.getFacilityIdFromCookie();
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadFacilityData();
  }

  getFacilityIdFromCookie() {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split("=");
      if (key === "facility_id") {
        return value;
      }
    }
    return null;
  }

  bindEvents() {
    $("#editBtn").on("click", () => this.toggleEditMode(true));
    $("#saveBtn").on("click", () => this.saveFacility());
    $("#cancelBtn").on("click", () => this.cancelEdit());
    this.bindMultiSelectEvents();
  }

  bindMultiSelectEvents() {
    $("#genomic_tests_select").on("change", (e) => {
      if ($(e.target).val() && this.isEditMode) {
        this.addTag("genomic_tests", $(e.target).val());
        $(e.target).val("");
      }
    });
  }

  toggleEditMode(edit) {
    this.isEditMode = edit;
    const container = $(".profile-container");
    if (edit) {
      container.removeClass("view-mode").addClass("edit-mode");
      $("#editBtn").hide();
      $("#saveBtn, #cancelBtn").show();
      this.toggleFormInputs(false);
      this.refreshTags("genomic_tests");
    } else {
      container.removeClass("edit-mode").addClass("view-mode");
      $("#editBtn").show();
      $("#saveBtn, #cancelBtn").hide();
      this.toggleFormInputs(true);
      this.refreshTags("genomic_tests");
    }
  }

  toggleFormInputs(disabled) {
    $(".form-input, #genomic_tests_select").prop("disabled", disabled);
  }

  showAlert(message, type = "success") {
    const icon = type === "success" ? "check-circle" : "exclamation-circle";
    const alertHtml = `
      <div class="alert alert-${type}">
        <i class="fas fa-${icon}"></i>
        ${message}
      </div>
    `;
    $("#alertContainer").html(alertHtml);
    setTimeout(() => {
      $("#alertContainer").empty();
    }, 5000);
  }

  async loadFacilityData() {
    try {
      const token = await getCsrfToken();

      const response = await fetch(
        `/api/v1/facilities/registry/${this.facilityId}`,
        { headers: { "X-CSRF-Token": token } },
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      this.originalData = data[0];
      this.currentData = { ...data[0] };
      this.populateForm(data[0]);
    } catch (err) {
      console.error(err);
      this.showAlert(
        "Failed to load facility data. Please try again.",
        "error",
      );
    }
  }

  populateForm(data) {
    $("#facilityName").text(data.name);
    $("#name").val(data.name || "");
    $("#provider_specialty").val(data.provider_specialty || "");
    $("#yearly_cases").val(data.yearly_cases || "");

    this.populateMultiSelect("genomic_tests", data.genomic_tests || []);

    if (data.contacts && Array.isArray(data.contacts)) {
      const contactMap = data.contacts.reduce((acc, contact) => {
        acc[contact.type] = contact;
        return acc;
      }, {});

      this.populateContact(
        "facility_incharge",
        contactMap.facility_incharge || {},
      );
      this.populateContact(
        "registry_focal_person",
        contactMap.registry_focal_person || {},
      );
      this.populateContact(
        "alt_registry_focal_person",
        contactMap.alt_registry_focal_person || {},
      );
    }

    if (data.identification) {
      $("#registry_id").val(data.identification.registry_id || "");
    }
  }

  populateContact(type, contactData) {
    if (!contactData) return;
    $(`#${type}_name`).val(contactData.name);
    $(`#${type}_email`).val(contactData.email);
    $(`#${type}_phone`).val(contactData.phone);
  }

  populateMultiSelect(field, values) {
    const $container = $(`#${field}_tags`);
    $container.empty();
    values.forEach((value) => this.createTag(field, value, $container));
  }

  addTag(field, value) {
    const $container = $(`#${field}_tags`);
    const existing = $container.children(`[data-value="${value}"]`);
    if (!existing.length) {
      this.createTag(field, value, $container);
    }
  }

  createTag(field, value, $container) {
    const $tag = $(`
      <div class="tag" data-value="${value}">
        ${this.formatTagLabel(value)}
        ${this.isEditMode ? `<button type="button" class="tag-remove" data-field="${field}" data-value="${value}">×</button>` : ""}
      </div>
    `);
    $container.append($tag);

    $tag.find(".tag-remove").on("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeTag(field, value);
    });
  }

  removeTag(field, value) {
    $(`#${field}_tags`).find(`[data-value="${value}"]`).remove();
  }

  formatTagLabel(value) {
    return value
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  collectFormData() {
    return {
      name: $("#name").val(),
      provider_specialty: $("#provider_specialty").val(),
      yearly_cases: $("#yearly_cases").val(),
      genomic_tests: this.getTagValues("genomic_tests"),
      contacts: {
        facility_incharge: this.getContactData("facility_incharge"),
        registry_focal_person: this.getContactData("registry_focal_person"),
        alt_registry_focal_person: this.getContactData(
          "alt_registry_focal_person",
        ),
      },
      identification: {
        registry_id: $("#registry_id").val(),
      },
    };
  }

  getTagValues(field) {
    return $(`#${field}_tags`)
      .children()
      .map((_, el) => $(el).data("value"))
      .get();
  }

  getContactData(type) {
    return {
      name: $(`#${type}_name`).val(),
      email: $(`#${type}_email`).val(),
      phone: $(`#${type}_phone`).val(),
    };
  }

  validateForm() {
    const errors = [];
    const data = this.collectFormData();
    if (!data.name.trim()) errors.push("Facility name is required");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[0-9\-\s()]+$/;

    for (const key in data.contacts) {
      const contact = data.contacts[key];
      if (contact.email && !emailRegex.test(contact.email)) {
        errors.push(
          `Invalid email format for ${this.formatTagLabel(key)} contact`,
        );
      }
      if (contact.phone && !phoneRegex.test(contact.phone)) {
        errors.push(
          `Invalid phone format for ${this.formatTagLabel(key)} contact`,
        );
      }
    }

    return errors;
  }

  async saveFacility() {
    const errors = this.validateForm();
    if (errors.length) {
      this.showAlert(
        `Please fix the following errors:\n${errors.join("\n")}`,
        "error",
      );
      return;
    }

    const formData = this.collectFormData();
    const saveBtn = $("#saveBtn");
    saveBtn
      .prop("disabled", true)
      .html('<div class="spinner"></div> Saving...');
    const token = await getCsrfToken();
    try {
      const response = await fetch(
        `/api/v1/facilities/${this.currentData.ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": token,
          },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) throw new Error("Failed to save");

      this.originalData = { ...formData };
      this.currentData = { ...formData };
      $("#facilityName").text(formData.name);
      this.toggleEditMode(false);
      this.showAlert("Facility profile updated successfully!");
    } catch (err) {
      console.error(err);
      this.showAlert(
        "Failed to save facility profile. Please try again.",
        "error",
      );
    } finally {
      saveBtn.prop("disabled", false).html('<i class="fas fa-save"></i> Save');
    }
  }

  cancelEdit() {
    this.populateForm(this.originalData);
    this.toggleEditMode(false);
  }

  refreshTags(field) {
    const currentValues = this.getTagValues(field);
    this.populateMultiSelect(field, currentValues);
  }
}
