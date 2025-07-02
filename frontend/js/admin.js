$(document).ready(function () {
  // Tab titles and icons
  const tabConfig = {
    diagnosis: { title: 'Diagnosis Types Management', icon: 'fas fa-stethoscope' },
    cancer: { title: 'Cancer Types Management', icon: 'fas fa-disease' },
    locations: { title: 'Locations Management', icon: 'fas fa-map-marker-alt' },
    treatments: { title: 'Treatments Management', icon: 'fas fa-pills' },
    facilities: { title: 'Facility Types Management', icon: 'fas fa-hospital' }
  };

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

  // Initialize data storage
  Object.keys(mockData).forEach((key) => {
    const storageKey = `registry_${key}`;
    if (!window.registryData) window.registryData = {};
    if (!window.registryData[key]) {
      window.registryData[key] = mockData[key];
    }
  });

  // Sidebar toggle functionality
  $('#sidebarToggle').click(function() {
    $('.sidebar').toggleClass('collapsed');
  });

  // Handle navigation item clicks
  $('.nav-item').click(function () {
    $('.nav-item').removeClass('active');
    $(this).addClass('active');

    const tabId = $(this).data('tab');
    $('.tab-content').removeClass('active');
    $(`#${tabId}-tab`).addClass('active');

    // Update header title and add button
    const config = tabConfig[tabId];
    $('#content-title').html(`<i class="${config.icon}"></i> ${config.title}`);
    $('.add-item').data('type', tabId);

    loadItems(tabId);
  });

  // Load items for a category
  function loadItems(category) {
    const items = window.registryData[category] || [];
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
            <h4>${item.name}
              <span class="status-badge ${item.active ? "active" : "inactive"}">
                ${item.active ? "Active" : "Inactive"}
              </span>
            </h4>
            <span class="data-card-code">${item.code}</span>
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
  $('.add-item').click(function () {
    const type = $(this).data('type');
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

    if (confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
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
      const items = window.registryData[type] || [];
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

    // Get form data
    const formData = {
      name: $("#item-name").val().trim(),
      code: $("#item-code").val().trim().toUpperCase(),
      description: $("#item-description").val().trim(),
      active: $("#item-active").is(":checked")
    };

    // Validate required fields
    if (!formData.name || !formData.code) {
      showNotification("Please fill in all required fields.", "error");
      return;
    }

    // Get items array for the current type
    if (!window.registryData[type]) {
      window.registryData[type] = [];
    }
    const items = window.registryData[type];

    if (mode === "edit") {
      // Update existing item
      const itemIndex = items.findIndex(item => item.id === id);
      if (itemIndex !== -1) {
        // Check for duplicate code (excluding current item)
        const duplicateCode = items.some(item => 
          item.id !== id && item.code.toUpperCase() === formData.code
        );
        
        if (duplicateCode) {
          showNotification("Code already exists. Please use a different code.", "error");
          return;
        }

        items[itemIndex] = {
          ...items[itemIndex],
          ...formData
        };
        
        showNotification("Item updated successfully!", "success");
      } else {
        showNotification("Item not found.", "error");
        return;
      }
    } else {
      // Add new item
      // Check for duplicate code
      const duplicateCode = items.some(item => 
        item.code.toUpperCase() === formData.code
      );
      
      if (duplicateCode) {
        showNotification("Code already exists. Please use a different code.", "error");
        return;
      }

      // Generate new ID
      const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
      
      const newItem = {
        id: newId,
        ...formData
      };

      items.push(newItem);
      showNotification("Item added successfully!", "success");
    }

    // Save to storage (in a real app, this would be an API call)
    saveToStorage(type, items);

    // Reload items and close modal
    loadItems(type);
    closeModal();
  });

  // Delete item function
  function deleteItem(type, id) {
    if (!window.registryData[type]) {
      return;
    }

    const items = window.registryData[type];
    const itemIndex = items.findIndex(item => item.id === id);
    
    if (itemIndex !== -1) {
      items.splice(itemIndex, 1);
      saveToStorage(type, items);
      loadItems(type);
      showNotification("Item deleted successfully!", "success");
    } else {
      showNotification("Item not found.", "error");
    }
  }

  // Save data to storage (simulated)
  function saveToStorage(type, data) {
    window.registryData[type] = data;
    // In a real application, you would make an API call here
    console.log(`Saved ${type} data:`, data);
  }

  // Show notification function
  function showNotification(message, type = "info") {
    // Remove existing notifications
    $(".notification").remove();

    const notification = $(`
      <div class="notification notification-${type}">
        <div class="notification-content">
          <i class="fas ${getNotificationIcon(type)}"></i>
          <span>${message}</span>
          <button class="notification-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `);

    $("body").append(notification);

    // Show notification
    setTimeout(() => {
      notification.addClass("show");
    }, 100);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideNotification(notification);
    }, 5000);

    // Handle close button
    notification.find(".notification-close").click(function() {
      hideNotification(notification);
    });
  }

  // Hide notification function
  function hideNotification(notification) {
    notification.removeClass("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  // Get notification icon based on type
  function getNotificationIcon(type) {
    switch (type) {
      case "success": return "fa-check-circle";
      case "error": return "fa-exclamation-circle";
      case "warning": return "fa-exclamation-triangle";
      default: return "fa-info-circle";
    }
  }

  // Search functionality
  function setupSearch() {
    const searchInput = $('<div class="search-container"><input type="text" id="search-input" placeholder="Search items..."><i class="fas fa-search"></i></div>');
    $('.content-header').append(searchInput);

    $('#search-input').on('input', function() {
      const searchTerm = $(this).val().toLowerCase();
      const activeTab = $('.nav-item.active').data('tab');
      
      if (!searchTerm) {
        loadItems(activeTab);
        return;
      }

      const items = window.registryData[activeTab] || [];
      const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.code.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm))
      );

      displayFilteredItems(activeTab, filteredItems);
    });
  }

  // Display filtered items
  function displayFilteredItems(category, items) {
    const list = $(`#${category}-list`);
    list.empty();

    if (items.length === 0) {
      list.html(`
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h4>No Results Found</h4>
          <p>Try adjusting your search terms.</p>
        </div>
      `);
      return;
    }

    items.forEach((item) => {
      const card = $("<div>").addClass("data-card");
      card.html(`
        <div class="data-card-header">
          <div class="data-card-title">
            <h4>${item.name}
              <span class="status-badge ${item.active ? "active" : "inactive"}">
                ${item.active ? "Active" : "Inactive"}
              </span>
            </h4>
            <span class="data-card-code">${item.code}</span>
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

  // Initialize
  function init() {
    // Load initial tab (diagnosis)
    loadItems('diagnosis');
    
    // Setup search functionality
    setupSearch();

    // Add keyboard shortcuts
    $(document).keydown(function(e) {
      // Escape key to close modal
      if (e.keyCode === 27 && $("#item-modal").hasClass("active")) {
        closeModal();
      }
      
      // Ctrl+N to add new item
      if (e.ctrlKey && e.keyCode === 78) {
        e.preventDefault();
        const activeType = $('.nav-item.active').data('tab');
        if (activeType) {
          showModal("add", activeType);
        }
      }
    });

    // Add tooltips
    $('[title]').each(function() {
      $(this).tooltip();
    });
  }

  // Add custom styles for notifications
  const notificationStyles = `
    <style>
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border-left: 4px solid #007bff;
        min-width: 300px;
        max-width: 400px;
      }

      .notification.show {
        transform: translateX(0);
      }

      .notification-success {
        border-left-color: #28a745;
      }

      .notification-error {
        border-left-color: #dc3545;
      }

      .notification-warning {
        border-left-color: #ffc107;
      }

      .notification-content {
        display: flex;
        align-items: center;
        padding: 15px;
        gap: 10px;
      }

      .notification-content i:first-child {
        font-size: 18px;
        color: #007bff;
      }

      .notification-success .notification-content i:first-child {
        color: #28a745;
      }

      .notification-error .notification-content i:first-child {
        color: #dc3545;
      }

      .notification-warning .notification-content i:first-child {
        color: #ffc107;
      }

      .notification-content span {
        flex: 1;
        font-size: 14px;
        color: #333;
      }

      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        padding: 5px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }

      .notification-close:hover {
        background-color: #f8f9fa;
      }

      .search-container {
        position: relative;
        display: inline-block;
        margin-left: 20px;
      }

      .search-container input {
        padding: 8px 35px 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        width: 250px;
        transition: border-color 0.2s ease;
      }

      .search-container input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }

      .search-container i {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #666;
        pointer-events: none;
      }

      @media (max-width: 768px) {
        .notification {
          top: 10px;
          right: 10px;
          left: 10px;
          min-width: auto;
          max-width: none;
        }

        .search-container {
          display: block;
          margin: 10px 0 0 0;
        }

        .search-container input {
          width: 100%;
        }
      }
    </style>
  `;

  $('head').append(notificationStyles);

  // Initialize the application
  init();
});