$(document).ready(function() {
  // Mock database of facilities for demo purposes
  const mockFacilities = [
    {
      id: '123456',
      name: 'Memorial Hospital',
      type: 'Hospital',
      address: '100 Main Street, Manchester, NH 03101',
      phone: '(603) 555-1000',
      npi: '1234567890',
      status: 'active',
      registrationDate: '2024-01-15'
    },
    {
      id: '234567',
      name: 'Concord Regional Cancer Center',
      type: 'Cancer Center',
      address: '250 Pleasant Street, Concord, NH 03301',
      phone: '(603) 555-2000',
      npi: '2345678901',
      status: 'active',
      registrationDate: '2023-11-10'
    },
    {
      id: '345678',
      name: 'Exeter Medical Oncology',
      type: 'Clinic',
      address: '5 Alumni Drive, Exeter, NH 03833',
      phone: '(603) 555-3000',
      npi: '3456789012',
      status: 'pending',
      registrationDate: '2024-05-01'
    },
    {
      id: '456789',
      name: 'Dartmouth Cancer Research Lab',
      type: 'Laboratory',
      address: '1 Medical Center Drive, Lebanon, NH 03756',
      phone: '(603) 555-4000',
      npi: '4567890123',
      status: 'active',
      registrationDate: '2023-08-22'
    },
    {
      id: '567890',
      name: 'Nashua Radiation Therapy',
      type: 'Clinic',
      address: '10 Prospect Street, Nashua, NH 03060',
      phone: '(603) 555-5000',
      npi: '5678901234',
      status: 'inactive',
      registrationDate: '2022-03-15'
    }
  ];

  // Switch between search options
  $('.search-option').click(function() {
    $('.search-option').removeClass('active');
    $(this).addClass('active');
    
    const searchType = $(this).data('search');
    
    // Hide all search inputs and show only the selected one
    $('#name-search, #id-search, #npi-search').addClass('hidden');
    $(`#${searchType}-search`).removeClass('hidden');
  });

  // Handle facility search form submission
  $('#check-facility-form').submit(async function(e) {
    e.preventDefault();
    
    // Get active search type
    const activeSearchType = $('.search-option.active').data('search');
    let searchValue = '';
    
    // Get search value based on active search type
    switch (activeSearchType) {
      case 'name':
        searchValue = $('#facility-name').val().trim();
        break;
      case 'id':
        searchValue = $('#facility-id').val().trim();
        break;
      case 'npi':
        searchValue = $('#facility-npi').val().trim();
        break;
    }
    
    // Validate search input
    if (!searchValue) {
      alert('Please enter a search term');
      return;
    }
    
    // Perform search
    let results = [];
    let response;
    let data;
  
    switch (activeSearchType) {
      case 'name':
        response = await fetch("http://localhost:6060/api/v1/facilities/name/" + searchValue);
        data = await response.json();
        results = data
        break;
      case 'id':
        response = await fetch("http://localhost:6060/api/v1/facilities/registry/" + searchValue);
        data = await response.json();
        results = data
        break;
      case 'npi':
        response = await fetch("http://localhost:6060/api/v1/facilities/npi/" + searchValue);
        data = await response.json();
        results = data
        break;
    }
    
    // Display results
    displaySearchResults(results);
  });

  // Display search results
  function displaySearchResults(results) {
    const resultsContainer = $('#search-results');
    const resultsContent = $('.results-content');
    
    // Clear previous results
    resultsContent.empty();
    
    // Show results container
    resultsContainer.removeClass('hidden');
    
    // If no results found
    if (results.length === 0) {
      resultsContent.html(`
        <div class="no-results">
          <p>No facilities found matching your search criteria.</p>
          <p>If your facility is not registered, please <a href="register-facility.html">register your facility</a>.</p>
        </div>
      `);
      return;
    }
    
    // Build results HTML
    results.forEach(facility => {
      let statusClass = '';
      let statusText = '';
      
      switch (facility.status) {
        case 'active':
          statusClass = 'status-active';
          statusText = 'Active';
          break;
        case 'pending':
          statusClass = 'status-pending';
          statusText = 'Pending';
          break;
        case 'inactive':
          statusClass = 'status-inactive';
          statusText = 'Inactive';
          break;
      }

      const contact = facility.contacts.filter(c => c.type === 'meaningful_use')[0];
      
      const facilityCard = `
        <div class="facility-card">
          <div class="facility-card-header">
            <div>
              <h4 class="facility-card-title">${facility.name}</h4>
              <div class="facility-card-subtitle">${facility.provider_specialty} • ID: ${facility.identification.registry_id}</div>
            </div>
            <span class="facility-status ${statusClass}">${statusText}</span>
          </div>
          <div class="facility-card-content">
            <div class="facility-card-item">
              <span class="facility-card-label">Organization Name</span>
              <span class="facility-card-value">${facility.organization_name}</span>
            </div>
            <div class="facility-card-item">
              <span class="facility-card-label">Phone</span>
              <span class="facility-card-value">${contact.phone}</span>
            </div>
            <div class="facility-card-item">
              <span class="facility-card-label">Registration Date</span>
              <span class="facility-card-value">${formatDate(facility.CreatedAt)}</span>
            </div>
          </div>
          <div class="facility-card-actions">
            <a href="register-patient.html?facility=${facility.identification.registry_id}" class="btn primary">Register Patient</a>
          </div>
        </div>
      `;
      
      resultsContent.append(facilityCard);
    });
  }

  // Format date for display
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  // Close search results
  $('#close-results').click(function() {
    $('#search-results').addClass('hidden');
  });

  // Clear search form
  $('#check-facility-form').on('reset', function() {
    $('#search-results').addClass('hidden');
  });
});