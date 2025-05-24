$(document).ready(function() {
  // Show/hide "Other" field based on transport option selection
  $('#transport-option').on('change', function() {
    if ($(this).val() === 'other') {
      $('#other-transport-group').removeClass('hidden');
      $('#other-transport').attr('required', true);
    } else {
      $('#other-transport-group').addClass('hidden');
      $('#other-transport').attr('required', false);
    }
  });

  // Handle "No genomic testing" checkbox
  $('#genomic-none').on('change', function() {
    if ($(this).is(':checked')) {
      $('input[name="genomic-tests[]"]').not(this).prop('checked', false).prop('disabled', true);
    } else {
      $('input[name="genomic-tests[]"]').prop('disabled', false);
    }
  });

  // Format phone numbers (XXX) XXX-XXXX
  $('input[type="tel"]').on('input', function() {
    let value = $(this).val().replace(/\D/g, '');
    
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    
    if (value.length > 6) {
      value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6);
    } else if (value.length > 3) {
      value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
    } else if (value.length > 0) {
      value = '(' + value;
    }
    
    $(this).val(value);
  });

  // Handle form review step
  $('.next-step').click(function() {
    const currentStep = $(this).closest('.form-step');
    
    // If moving to review step, populate summary
    if (currentStep.data('step') === 3) {
      populateReviewSummary();
    }
  });

  // Populate review summary
  function populateReviewSummary() {
    const summary = $('#review-summary');
    summary.empty();
    
    // Basic Information
    const basicSection = $(`
      <div class="review-section">
        <h5>Basic Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const basicContent = basicSection.find('.review-content');
    addReviewItem(basicContent, 'Facility Name', $('#facility-name').val());
    addReviewItem(basicContent, 'Organization Name', $('#organization-name').val());
    addReviewItem(basicContent, 'Provider Specialty', $('#provider-specialty').val());
    
    // Get selected organization types
    const orgTypes = [];
    $('input[name="registry-type[]"]:checked').each(function() {
      orgTypes.push($(this).next('label').text());
    });
    addReviewItem(basicContent, 'Organization Type', orgTypes.join(', '));
    addReviewItem(basicContent, 'Yearly Cases', $('#yearly-cases option:selected').text());
    
    summary.append(basicSection);
    
    // Contact Information
    const contactSection = $(`
      <div class="review-section">
        <h5>Contact Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const contactContent = contactSection.find('.review-content');
    
    // Meaningful Use Contact
    addReviewItem(contactContent, 'MU Contact Name', $('#mu-contact-name').val());
    addReviewItem(contactContent, 'MU Contact Email', $('#mu-contact-email').val());
    addReviewItem(contactContent, 'MU Contact Phone', $('#mu-contact-phone').val());
    
    // Registry Interface Lead
    addReviewItem(contactContent, 'Registry Lead Name', $('#registry-contact-name').val());
    addReviewItem(contactContent, 'Registry Lead Email', $('#registry-contact-email').val());
    addReviewItem(contactContent, 'Registry Lead Phone', $('#registry-contact-phone').val());
    
    // Networking Lead
    addReviewItem(contactContent, 'Network Lead Name', $('#network-contact-name').val());
    addReviewItem(contactContent, 'Network Lead Email', $('#network-contact-email').val());
    addReviewItem(contactContent, 'Network Lead Phone', $('#network-contact-phone').val());
    
    summary.append(contactSection);
    
    // Technical Information
    const technicalSection = $(`
      <div class="review-section">
        <h5>Technical Information</h5>
        <div class="review-content"></div>
      </div>
    `);
    
    const technicalContent = technicalSection.find('.review-content');
    
    addReviewItem(technicalContent, 'Software Vendor', $('#software-vendor').val());
    addReviewItem(technicalContent, 'Product Name', $('#software-product').val());
    addReviewItem(technicalContent, 'Version', $('#software-version').val());
    addReviewItem(technicalContent, '2014 CEHRT', $('#is-cehrt-2014').is(':checked') ? 'Yes' : 'No');
    addReviewItem(technicalContent, 'Supports HL7 CDA R2', $('#supports-hl7-cda').is(':checked') ? 'Yes' : 'No');
    
    if ($('#upgrade-date').val()) {
      addReviewItem(technicalContent, 'Planned Upgrade Date', formatDate($('#upgrade-date').val()));
    }
    
    let transportOption = $('#transport-option option:selected').text();
    if ($('#transport-option').val() === 'other') {
      transportOption += ': ' + $('#other-transport').val();
    }
    addReviewItem(technicalContent, 'Transport Option', transportOption);
    
    // Get selected genomic tests
    const genomicTests = [];
    $('input[name="genomic-tests[]"]:checked').each(function() {
      if ($(this).val() !== 'none') {
        genomicTests.push($(this).val());
      }
    });
    
    if ($('#genomic-none').is(':checked')) {
      addReviewItem(technicalContent, 'Genomic Testing', 'No genomic testing performed');
    } else if (genomicTests.length > 0) {
      addReviewItem(technicalContent, 'Genomic Tests', genomicTests.join(', '));
    }
    
    summary.append(technicalSection);
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
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  // Handle form submission
  $('#register-facility-form').submit(async function(e) {
    e.preventDefault();
    
    // Validate required checkbox
    if (!$('#terms-agreement').is(':checked')) {
      alert('You must agree to the terms to proceed');
      return;
    }

    // Generate a random facility ID for demo purposes
    const facilityId = 'TMP-' + Math.floor(100000 + Math.random() * 900000);

    // Collect form data
    const formData = {
      name: $('#facility-name').val(),
      organization_name: $('#organization-name').val(),
      provider_specialty: $('#provider-specialty').val(),
      contact: {
        meaningful_use: {
          name: $('#mu-contact-name').val(),
          email: $('#mu-contact-email').val(),
          phone: $('#mu-contact-phone').val()
        },
        registry_lead: {
          name: $('#registry-contact-name').val(),
          email: $('#registry-contact-email').val(),
          phone: $('#registry-contact-phone').val()
        },
        network_lead: {
          name: $('#network-contact-name').val(),
          email: $('#network-contact-email').val(),
          phone: $('#network-contact-phone').val()
        }
      },
      technical: {
        software_vendor: $('#software-vendor').val(),
        software_product: $('#software-product').val(),
        software_version: $('#software-version').val(),
        is_cehrt2014: $('#is-cehrt-2014').is(':checked'),
        supports_hl7cda: $('#supports-hl7-cda').is(':checked'),
        upgrade_date: $('#upgrade-date').val(),
        transport_option: $('#transport-option').val() === 'other' ? 
          $('#other-transport').val() : $('#transport-option option:selected').text()
      },
      organization_type: $('input[name="registry-type[]"]:checked').map(function() {
        return $(this).next('label').text();
      }).get(),
      yearly_cases: $('#yearly-cases').val(),
      genomic_tests: $('input[name="genomic-tests[]"]:checked').map(function() {
        return $(this).val() !== 'none' ? $(this).val() : null;
      }).get().filter(Boolean),
      identification: {
        registry_id: facilityId
      },
      status: 'pending'
    };

    // Log the JSON data
    try {
      const response = await fetch("http://localhost:6060/api/v1/facilities", {
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
      console.log('Facility registered successfully:', result); 
    }
    catch (error) {
      console.error('Error registering facility:', error);
      alert('There was an error registering the facility. Please try again later.');
      return;
    }
    
    // Hide form and show success message
    $('#register-facility-form').addClass('hidden');
    $('#registration-success').removeClass('hidden');
    
    // Set the temporary facility ID
    $('#temp-facility-id').text(facilityId);
    
    // Scroll to top of success message
    $('html, body').animate({
      scrollTop: $('#registration-success').offset().top - 100
    }, 500);
  });
});