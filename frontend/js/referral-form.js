$(document).ready(function() {
  const currentStep = $(this).closest('.form-step');
  console.log('Current step:', currentStep.data('step'));

  // Handle next step button to show review summary
  $('.next-step').click(function() {
    const currentStep = $(this).closest('.form-step');
    console.log('Current step:', currentStep.data('step'));
    
    // Validate required fields on Step 1
    if (currentStep.data('step') === 1) {
      let valid = true;
      currentStep.find('input, select').each(function() {
        if ($(this).prop('required') && !$(this).val()) {
          alert(`Please fill the required field: ${$(this).prev('label').text()}`);
          valid = false;
          return false; // break each loop
        }
      });
      if (!valid) return;
      
      // Populate review summary for Step 2
      populateReviewSummary();
      // Hide Step 1 and show Step 2
      currentStep.removeClass('active');
      $('.form-step[data-step="2"]').addClass('active');
    } 
  });

  // Populate review summary for Step 2
  function populateReviewSummary() {
    const summary = $('#review-summary');
    summary.empty();
    
    const fields = [
      { label: 'Referred By', id: 'referred_by' },
      { label: 'Facility Name', id: 'facility_name' },
      { label: 'Diagnosis', id: 'diagnosis' },
      { label: 'Referred To', id: 'referred_to' },
      { label: 'Country', id: 'country' },
      { label: 'City', id: 'city' },
      { label: 'Receiving Facility', id: 'facility' },
      { label: 'Doctor', id: 'doctor' },
      { label: 'Referral Date', id: 'referral_date' }
    ];

    fields.forEach(f => {
      const val = $(`#${f.id}`).val();
      if(val) {
        summary.append(`
          <div class="review-item">
            <strong>${f.label}:</strong> ${val}
          </div>
        `);
      }
    });
  }

  // Handle final form submission
  $('#register-referral-form').submit(async function(e) {
    e.preventDefault();

    // Collect only your referral fields
    const formData = {
      referred_by: $('#referred_by').val(),
      facility_name: $('#facility_name').val(),
      diagnosis: $('#diagnosis').val(),
      referred_to: $('#referred_to').val(),
      country: $('#country').val(),
      city: $('#city').val(),
      facility: $('#facility').val(),
      doctor: $('#doctor').val(),
      referral_date: $('#referral_date').val()
    };

    // Basic validation (all required)
    for (const [key, val] of Object.entries(formData)) {
      if (!val) {
        alert(`Please fill the required field: ${key.replace('_', ' ')}`);
        return;
      }
    }

    try {
      const response = await fetch('http://localhost:6060/api/v1/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();

      console.log('Referral submitted:', result);

      // Hide form and show success message
      $('#register-referral-form').addClass('hidden');
      $('#registration-success').removeClass('hidden');

      // Scroll to success message
      $('html, body').animate({
        scrollTop: $('#registration-success').offset().top - 100
      }, 500);

    } catch (error) {
      console.error('Error submitting referral:', error);
      alert('There was an error submitting the referral. Please try again later.');
    }
  });

});
