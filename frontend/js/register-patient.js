$(document).ready(async function() {

  // Check if facility ID is passed in URL
  const urlParams = new URLSearchParams(window.location.search);
  const facilityId = urlParams.get('facility');
  
  if (facilityId) {
    // Auto-fill facility ID and verify
    $('#facility-id').val(facilityId);
    const response =  await fetch("http://localhost:6060/api/v1/facilities/registry/" + facilityId);
    const data = await response.json();
    const facility = data.find(f => f.identification.registry_id === facilityId);
    
    if (facility) {
      $('#facility-name-verification').val(facility.name);
      // Trigger verification after a short delay
      setTimeout(function() {
        $('#verify-facility-form').submit();
      }, 500);
    }
  }

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

  // Format SSN input to only show last 4 digits
  $('#ssn').on('input', function() {
    let value = $(this).val().replace(/\D/g, '');
    
    // Limit to 4 digits
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    
    $(this).val(value);
  });

  // Handle facility verification form submission
  $('#verify-facility-form').submit(async function(e) {
    e.preventDefault();
    
    const facilityId = $('#facility-id').val();
    const facilityName = $('#facility-name-verification').val();
    
    // Validate inputs
    if (!facilityId || !facilityName) {
      alert('Please enter both facility ID and name');
      return;
    }
    
    // Check if facility exists in our mock database
    const response =  await fetch("http://localhost:6060/api/v1/facilities/registry/" + facilityId);
    const data = await response.json();
    const facility = data.find(f => f.identification.registry_id === facilityId);
    
    if (facility) {
      // Facility found, show patient registration form
      $('#facility-verification').addClass('hidden');
      $('#facility-not-found').addClass('hidden');
      $('#register-patient-form').removeClass('hidden');
      
      // Populate selected facility info
      $('#selected-facility-name').text(facility.name);
      $('#selected-facility-id').text(`ID: ${facility.identification.registry_id}`);
      
      // Scroll to top of form
      $('html, body').animate({
        scrollTop: $('#register-patient-form').offset().top - 100
      }, 500);
    } else {
      // Facility not found, show error message
      $('#facility-not-found').removeClass('hidden');
    }
  });

  // Handle form review step
  $('.next-step').click(function() {
    const currentStep = $(this).closest('.form-step');
    
    // If moving to review step, populate summary
    if (currentStep.data('step') === 3) {
      populatePatientReviewSummary();
    }
  });

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
    addReviewItem(patientContent, 'SSN (Last 4)', 'XXX-XX-' + $('#ssn').val());
    addReviewItem(patientContent, 'Medical Record #', $('#medical-record-number').val());
    
    // Build address
    const patientAddress = $('#patient-street-address').val() + ', ' + 
                          $('#patient-city').val() + ', ' + 
                          $('#patient-state').val() + ' ' + 
                          $('#patient-zip').val();
    
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
        ssn_last_4: $('#ssn').val(),
        medical_record_number: $('#medical-record-number').val()
      },
      address: {
        street: $('#patient-street-address').val(),
        city: $('#patient-city').val(),
        state: $('#patient-state').val(),
        zip: $('#patient-zip').val()
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