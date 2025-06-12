$(document).ready(function () {
  // Initial mock data
  const mockData = {
    diagnosis: [
      {
        id: 1,
        name: "Clinical Diagnosis",
        code: "CLIN",
        description: "Diagnosis based on clinical examination",
        active: true,
      },
      {
        id: 2,
        name: "Pathological Diagnosis",
        code: "PATH",
        description: "Diagnosis confirmed by pathology",
        active: true,
      },
      {
        id: 3,
        name: "Radiological Diagnosis",
        code: "RAD",
        description: "Diagnosis based on imaging studies",
        active: true,
      },
    ],
    cancer: [
      {
        id: 1,
        name: "Breast Cancer",
        code: "BRST",
        description: "Malignant neoplasm of breast tissue",
        active: true,
      },
      {
        id: 2,
        name: "Lung Cancer",
        code: "LUNG",
        description: "Malignant neoplasm of lung tissue",
        active: true,
      },
      {
        id: 3,
        name: "Colorectal Cancer",
        code: "CLRC",
        description: "Malignant neoplasm of colon or rectum",
        active: true,
      },
    ],
    locations: [
      {
        id: 1,
        name: "Breast",
        code: "C50",
        description: "Breast tissue",
        active: true,
      },
      {
        id: 2,
        name: "Lung",
        code: "C34",
        description: "Lung and bronchus",
        active: true,
      },
      {
        id: 3,
        name: "Colon",
        code: "C18",
        description: "Large intestine",
        active: true,
      },
    ],
    treatments: [
      {
        id: 1,
        name: "Surgery",
        code: "SURG",
        description: "Surgical intervention",
        active: true,
      },
      {
        id: 2,
        name: "Chemotherapy",
        code: "CHEM",
        description: "Chemical therapy",
        active: true,
      },
      {
        id: 3,
        name: "Radiation",
        code: "RAD",
        description: "Radiation therapy",
        active: true,
      },
    ],
    facilities: [
      {
        id: 1,
        name: "Hospital",
        code: "HOSP",
        description: "Full-service medical facility",
        active: true,
      },
      {
        id: 2,
        name: "Clinic",
        code: "CLIN",
        description: "Outpatient medical facility",
        active: true,
      },
      {
        id: 3,
        name: "Laboratory",
        code: "LAB",
        description: "Medical testing facility",
        active: true,
      },
    ],
  };

  // Initialize localStorage with mock data if empty
  Object.keys(mockData).forEach((key) => {
    if (!localStorage.getItem(`registry_${key}`)) {
      localStorage.setItem(`registry_${key}`, JSON.stringify(mockData[key]));
    }
  });

  // Handle tab switching
  $(".tab").click(function () {
    $(".tab").removeClass("active");
    $(this).addClass("active");

    const tabId = $(this).data("tab");
    $(".tab-content").removeClass("active");
    $(`#${tabId}-tab`).addClass("active");

    loadItems(tabId);
  });

  // Load items for a category
  function loadItems(category) {
    const items = JSON.parse(
      localStorage.getItem(`registry_${category}`) || "[]",
    );
    const list = $(`#${category}-list`);
    list.empty();

    if (items.length === 0) {
      list.html(`
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h4>No Items Found</h4>
          <p>Add your first item to get started.</p>
        </div>
      `);
      return;
    }

    items.forEach((item) => {
      const card = $("<div>").addClass("data-card");
      card.html(`
        <div class="data-card-header">
          <div class="data-card-title">
            <h4>${item.name}</h4>
            <span class="data-card-code">${item.code}</span>
            <span class="status-badge ${item.active ? "active" : "inactive"}">
              ${item.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div class="data-card-actions">
            <button class="btn icon edit edit-item" data-id="${item.id}" data-type="${category}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn icon delete delete-item" data-id="${item.id}" data-type="${category}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        ${item.description ? `<div class="data-card-description">${item.description}</div>` : ""}
      `);
      list.append(card);
    });
  }

  // Show modal for adding new item
  $(".add-item").click(function () {
    const type = $(this).data("type");
    showModal("add", type);
  });

  // Show modal for editing item
  $(document).on("click", ".edit-item", function () {
    const type = $(this).data("type");
    const id = parseInt($(this).data("id"));
    showModal("edit", type, id);
  });

  // Handle item deletion
  $(document).on("click", ".delete-item", function () {
    const type = $(this).data("type");
    const id = parseInt($(this).data("id"));

    if (
      confirm(
        "Are you sure you want to delete this item? This action cannot be undone.",
      )
    ) {
      deleteItem(type, id);
    }
  });

  // Show modal for adding/editing item
  function showModal(mode, type, id = null) {
    const modal = $("#item-modal");
    const form = $("#item-form");
    const title = $("#modal-title");

    // Reset form
    form.trigger("reset");
    $("#item-active").prop("checked", true);

    if (mode === "edit" && id) {
      title.text("Edit Item");
      const items = JSON.parse(
        localStorage.getItem(`registry_${type}`) || "[]",
      );
      const item = items.find((i) => i.id === id);

      if (item) {
        $("#item-name").val(item.name);
        $("#item-code").val(item.code);
        $("#item-description").val(item.description || "");
        $("#item-active").prop("checked", item.active);
      }

      form.data("mode", "edit");
      form.data("id", id);
    } else {
      title.text("Add Item");
      form.data("mode", "add");
    }

    form.data("type", type);
    modal.addClass("active");
    $("body").css("overflow", "hidden");
  }

  // Close modal
  $(".modal-close").click(function () {
    closeModal();
  });

  // Close modal when clicking outside
  $("#item-modal").click(function (e) {
    if (e.target === this) {
      closeModal();
    }
  });

  function closeModal() {
    $("#item-modal").removeClass("active");
    $("body").css("overflow", "");
  }

  // Handle form submission
  $("#item-form").submit(function (e) {
    e.preventDefault();

    const form = $(this);
    const mode = form.data("mode");
    const type = form.data("type");
    const id = form.data("id");

    // Validate required fields
    const name = $("#item-name").val().trim();
    const code = $("#item-code").val().trim();

    if (!name || !code) {
      alert("Please fill in all required fields.");
      return;
    }

    const formData = {
      name: name,
      code: code,
      description: $("#item-description").val().trim(),
      active: $("#item-active").is(":checked"),
    };

    if (mode === "add") {
      addItem(type, formData);
    } else {
      updateItem(type, id, formData);
    }

    closeModal();
  });

  // Add new item
  function addItem(type, data) {
    const items = JSON.parse(localStorage.getItem(`registry_${type}`) || "[]");
    const newId =
      items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;

    // Check for duplicate codes
    if (items.some((item) => item.code === data.code)) {
      alert(
        "An item with this code already exists. Please use a different code.",
      );
      return;
    }

    items.push({
      id: newId,
      ...data,
    });

    localStorage.setItem(`registry_${type}`, JSON.stringify(items));
    loadItems(type);

    // Show success message
    showNotification("Item added successfully!", "success");
  }

  // Update existing item
  function updateItem(type, id, data) {
    const items = JSON.parse(localStorage.getItem(`registry_${type}`) || "[]");
    const index = items.findIndex((i) => i.id === id);

    if (index !== -1) {
      // Check for duplicate codes (excluding current item)
      if (items.some((item) => item.code === data.code && item.id !== id)) {
        alert(
          "An item with this code already exists. Please use a different code.",
        );
        return;
      }

      items[index] = {
        ...items[index],
        ...data,
      };

      localStorage.setItem(`registry_${type}`, JSON.stringify(items));
      loadItems(type);

      // Show success message
      showNotification("Item updated successfully!", "success");
    }
  }

  // Delete item
  function deleteItem(type, id) {
    const items = JSON.parse(localStorage.getItem(`registry_${type}`) || "[]");
    const filteredItems = items.filter((i) => i.id !== id);

    localStorage.setItem(`registry_${type}`, JSON.stringify(filteredItems));
    loadItems(type);

    // Show success message
    showNotification("Item deleted successfully!", "success");
  }

  // Show notification
  function showNotification(message, type = "info") {
    const notification = $(`
      <div class="notification ${type}" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "var(--success)" : "var(--info)"};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1001;
        animation: slideInRight 0.3s ease;
      ">
        ${message}
      </div>
    `);

    $("body").append(notification);

    setTimeout(() => {
      notification.fadeOut(300, function () {
        $(this).remove();
      });
    }, 3000);
  }

  // Mobile menu toggle
  $(".mobile-menu-toggle").click(function () {
    $("nav").toggleClass("active");
  });

  // Load initial data for the first tab
  loadItems("diagnosis");
});
