// Helper function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

$(document).ready(async function() {
  // Load facility information on page load
  await loadFacilityInformation();

  // Show/hide "Other" fields based on selections
  $('#primary-site').on('change', function() {
    if ($(this).val() === 'other') {
      $('#other-site-group').removeClass('hidden');
      $('#other-site').attr('required', true);
    } else {
      $('#other-site-group').addClass('hidden');
      $('#other-site').attr('required', false);
    }
  });

  $('#treatment-other').on('change', function() {
    if ($(this).is(':checked')) {
      $('#other-treatment-group').removeClass('hidden');
      $('#other-treatment').attr('required', true);
    } else {
      $('#other-treatment-group').addClass('hidden');
      $('#other-treatment').attr('required', false);
    }
  });

  // Handle "No Treatment" checkbox
  $('#treatment-none').on('change', function() {
    if ($(this).is(':checked')) {
      // Disable all other treatment checkboxes
      $('input[name="treatment[]"]').not(this).prop('checked', false).prop('disabled', true);
    } else {
      // Re-enable all treatment checkboxes
      $('input[name="treatment[]"]').prop('disabled', false);
    }
  });

  // Format National ID input
  $('#national-id').on('input', function() {
    let value = $(this).val().replace(/\D/g, '');
    
    // Limit to reasonable length for National ID
    if (value.length > 14) {
      value = value.substring(0, 14);
    }
    
    $(this).val(value);
  });

  // Handle form review step
  $('.next-step').click(function() {
    const currentStep = $(this).closest('.form-step');
    
    // If moving to review step, populate summary
    if (currentStep.data('step') === 3) {
      populatePatientReviewSummary();
    }
  });

  // Handle retry facility button
  $('#retry-facility').click(async function() {
    await loadFacilityInformation();
  });

  // Load facility information from API or session
  async function loadFacilityInformation() {
    try {
      // Hide error state and show loading
      $('#facility-error').addClass('hidden');
      $('#facility-loading').removeClass('hidden');
      $('#register-patient-form').addClass('hidden');
      
      // Check if facility ID is passed in URL
      const urlParams = new URLSearchParams(window.location.search);
      let facilityId = urlParams.get('facility');
      
      // If no facility ID in URL, get from session storage or user session
      if (!facilityId) {
        facilityId = getCookie('facility_id') || '123456'; // Default for demo
      }
      
      // Fetch facility information from API
      const response = await fetch(`http://localhost:6060/api/v1/facilities/registry/${facilityId}`);
      
      if (!response.ok) {
      $('#facility-error').removeClass('hidden');
      $('#facility-loading').addClass('hidden');
        throw new Error(`HTTP error! status: ${response.status}`);
        
      }
      
      const data = await response.json();
      const facility = data.find(f => f.identification.registry_id === facilityId);
      
      if (!facility) {
              $('#facility-error').removeClass('hidden');
      $('#facility-loading').addClass('hidden');
        throw new Error('Facility not found in registry');
      }
      
      // Populate facility information
      $('#selected-facility-name').text(facility.name);
      $('#selected-facility-id').text(`ID: ${facility.identification.registry_id}`);
      
      // Hide loading and show form
      $('#facility-loading').addClass('hidden');
      $('#register-patient-form').removeClass('hidden');
      
    } catch (error) {
      console.error('Error loading facility information:', error);
      
      // Hide loading and show error state
      $('#facility-loading').addClass('hidden');
      $('#register-patient-form').addClass('hidden');
      $('#facility-error').removeClass('hidden');
      
      // Set appropriate error message
      let errorMessage = 'We couldn\'t find your facility information. Please contact support or try again.';
      
      if (error.message.includes('HTTP error')) {
        errorMessage = 'Unable to connect to the registry server. Please check your internet connection and try again.';
      } else if (error.message.includes('Facility not found')) {
        errorMessage = 'Your facility was not found in the registry. Please contact support to verify your facility registration.';
      }
      
      $('#facility-error-message').text(errorMessage);
    }
  }

  // Populate patient review summary
  function populatePatientReviewSummary() {
    const summary = $('#patient-review-summary');
    summary.empty();
    
    // Facility Information
    const facilitySection = $(`
      <div class="review-section">
        <h5>Facility Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const facilityContent = facilitySection.find('.review-content');
    addReviewItem(facilityContent, 'Facility', $('#selected-facility-name').text());
    addReviewItem(facilityContent, 'Facility ID', $('#selected-facility-id').text().replace('ID: ', ''));
    
    summary.append(facilitySection);
    
    // Patient Information
    const patientSection = $(`
      <div class="review-section">
        <h5>Patient Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const patientContent = patientSection.find('.review-content');
    
    const patientName = $('#patient-first-name').val() + ' ' + 
                        ($('#patient-middle-name').val() ? $('#patient-middle-name').val() + ' ' : '') + 
                        $('#patient-last-name').val();
    
    addReviewItem(patientContent, 'Patient Name', patientName);
    addReviewItem(patientContent, 'Date of Birth', formatDate($('#patient-dob').val()));
    addReviewItem(patientContent, 'Gender', $('#patient-gender option:selected').text());
    addReviewItem(patientContent, 'National ID', $('#national-id').val());
    addReviewItem(patientContent, 'Medical Record #', $('#medical-record-number').val());
    
    // Build address
    const patientAddress = $('#patient-street-address').val() + ', ' + 
                          $('#patient-city').val() + ', ' + 
                          $('#patient-district option:selected').text() + ', ' + 
                          $('#patient-region option:selected').text();
    
    addReviewItem(patientContent, 'Address', patientAddress);
    
    summary.append(patientSection);
    
    // Diagnosis Information
    const diagnosisSection = $(`
      <div class="review-section">
        <h5>Diagnosis Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const diagnosisContent = diagnosisSection.find('.review-content');
    
    let primarySite = $('#primary-site option:selected').text();
    if ($('#primary-site').val() === 'other') {
      primarySite = $('#other-site').val();
    }
    
    addReviewItem(diagnosisContent, 'Primary Site', primarySite);
    addReviewItem(diagnosisContent, 'Histology', $('#histology option:selected').text());
    addReviewItem(diagnosisContent, 'Date of Diagnosis', formatDate($('#date-of-diagnosis').val()));
    addReviewItem(diagnosisContent, 'Confirmation', $('#diagnostic-confirmation option:selected').text());
    addReviewItem(diagnosisContent, 'Stage', $('#stage option:selected').text());
    
    if ($('#laterality').val()) {
      addReviewItem(diagnosisContent, 'Laterality', $('#laterality option:selected').text());
    }
    
    summary.append(diagnosisSection);
    
    // Treatment Information
    const treatmentSection = $(`
      <div class="review-section">
        <h5>Treatment Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const treatmentContent = treatmentSection.find('.review-content');
    
    // Get selected treatments
    const selectedTreatments = [];
    $('input[name="treatment[]"]:checked').each(function() {
      let treatment = $(this).next('label').text();
      selectedTreatments.push(treatment);
    });
    
    // If "Other" is selected, add the specified value
    if ($('#treatment-other').is(':checked')) {
      const otherIndex = selectedTreatments.findIndex(t => t === 'Other');
      if (otherIndex !== -1) {
        selectedTreatments[otherIndex] = 'Other: ' + $('#other-treatment').val();
      }
    }
    
    addReviewItem(treatmentContent, 'Treatments', selectedTreatments.length > 0 ? selectedTreatments.join(', ') : 'None specified');
    
    if ($('#date-of-first-treatment').val()) {
      addReviewItem(treatmentContent, 'First Treatment Date', formatDate($('#date-of-first-treatment').val()));
    }
    
    if ($('#treating-physician').val()) {
      addReviewItem(treatmentContent, 'Treating Physician', $('#treating-physician').val());
    }
    
    if ($('#treatment-notes').val()) {
      addReviewItem(treatmentContent, 'Treatment Notes', $('#treatment-notes').val());
    }
    
    addReviewItem(treatmentContent, 'Reporting Source', $('#reporting-source option:selected').text());
    
    summary.append(treatmentSection);
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

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return '';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  // Handle patient registration form submission
  $('#register-patient-form').submit(async function(e) {
    e.preventDefault();
    
    // Validate required checkbox
    if (!$('#data-agreement').is(':checked')) {
      alert('You must certify that the information is accurate to proceed');
      return;
    }
    
    // Generate a random patient registration ID for demo purposes
    const patientRegId = 'PR-' + Math.floor(10000 + Math.random() * 90000);
     // Collect form data
    const formData = {
      facility_id: $('#selected-facility-id').text().replace('ID: ', ''),
      patient_info: {
        first_name: $('#patient-first-name').val(),
        middle_name: $('#patient-middle-name').val(),
        last_name: $('#patient-last-name').val(),
        dob: $('#patient-dob').val(),
        gender: $('#patient-gender').val(),
        national_id: $('#national-id').val()
      },
      diagnosis: {
        primary_site: $('#primary-site').val() === 'other' ? $('#other-site').val() : $('#primary-site').val(),
        histology: $('#histology').val(),
        date_of_diagnosis: $('#date-of-diagnosis').val(),
        diagnostic_confirmation: $('#diagnostic-confirmation').val(),
        stage: $('#stage').val(),
        laterality: $('#laterality').val()
      },
      treatment: {
        types: $('input[name="treatment[]"]:checked').map(function() {
          return $(this).val();
        }).get(),
        first_treatment_date: $('#date-of-first-treatment').val(),
        treating_physician: $('#treating-physician').val(),
        notes: $('#treatment-notes').val(),
        reporting_source: $('#reporting-source').val()
      },
      submitter: {
        name: $('#submitter-name').val(),
        title: $('#submitter-title').val(),
        email: $('#submitter-email').val()
      },
      registration_id: patientRegId,
      registration_date: new Date().toISOString()
    };

    // Log the JSON data

       // Log the JSON data
    try {
      const response = await fetch("http://localhost:6060/api/v1/patients", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      console.log('Patient registered successfully:', result); 
    }
    catch (error) {
      console.error('Error registering patient:', error);
      alert('There was an error registering the patient. Please try again later.');
      return;
    }
    
    
    // Hide form and show success message
    $('#register-patient-form').addClass('hidden');
    $('#patient-registration-success').removeClass('hidden');
    
    // Set the patient registration ID
    $('#patient-reg-id').text(patientRegId);
    
    // Scroll to top of success message
    $('html, body').animate({
      scrollTop: $('#patient-registration-success').offset().top - 100
    }, 500);
  });

  // Handle "Register Another Patient" button
  $('#register-another').click(function() {
    // Reset the form
    $('#register-patient-form').trigger('reset');
    
    // Show the first step
    $('.form-step').removeClass('active');
    $('.form-step[data-step="1"]').addClass('active');
    
    // Update progress indicator
    $('.progress-step').removeClass('active');
    $('.progress-step[data-step="1"]').addClass('active');
    
    // Hide success message and show form
    $('#patient-registration-success').addClass('hidden');
    $('#register-patient-form').removeClass('hidden');
    
    // Scroll to top of form
    $('html, body').animate({
      scrollTop: $('#register-patient-form').offset().top - 100
    }, 500);
  });
});