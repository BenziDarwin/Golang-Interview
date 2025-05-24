// Main JavaScript file for common functionality across all pages

$(document).ready(function() {
  // Mobile menu toggle
  $('.mobile-menu-toggle').click(function() {
    $('nav').toggleClass('active');
    $(this).find('i').toggleClass('fa-bars fa-times');
  });

  // Close mobile menu when clicking outside
  $(document).on('click', function(event) {
    if (!$(event.target).closest('header').length) {
      $('nav').removeClass('active');
      $('.mobile-menu-toggle i').removeClass('fa-times').addClass('fa-bars');
    }
  });

  // Add smooth scrolling for all links
  $('a[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') && 
        location.hostname === this.hostname) {
      let target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top - 80
        }, 800);
        return false;
      }
    }
  });

  // Form validation - add 'required' indicator to labels
  $('form label').each(function() {
    const input = $('#' + $(this).attr('for'));
    if (input.attr('required')) {
      $(this).append(' <span class="required">*</span>');
    }
  });

  // Add input focus animation
  $('input, select, textarea').on('focus', function() {
    $(this).parent('.form-group').addClass('focused');
  }).on('blur', function() {
    $(this).parent('.form-group').removeClass('focused');
  });

  // Form error handling
  $('form').on('submit', function(e) {
    const form = $(this);
    let isValid = true;

    // Reset previous errors
    form.find('.form-error').remove();
    form.find('.input-error').removeClass('input-error');

    // Check required fields
    form.find('[required]').each(function() {
      if ($(this).val() === '') {
        isValid = false;
        $(this).addClass('input-error');
        $(this).parent('.form-group').append('<div class="form-error">This field is required</div>');
      }
    });

    // Check email format
    form.find('input[type="email"]').each(function() {
      const email = $(this).val();
      if (email !== '' && !isValidEmail(email)) {
        isValid = false;
        $(this).addClass('input-error');
        $(this).parent('.form-group').append('<div class="form-error">Please enter a valid email address</div>');
      }
    });

    // Check phone format
    form.find('input[type="tel"]').each(function() {
      const phone = $(this).val();
      if (phone !== '' && !isValidPhone(phone)) {
        isValid = false;
        $(this).addClass('input-error');
        $(this).parent('.form-group').append('<div class="form-error">Please enter a valid phone number</div>');
      }
    });

    // If not valid, prevent form submission
    if (!isValid) {
      e.preventDefault();
      
      // Scroll to first error
      const firstError = form.find('.input-error').first();
      if (firstError.length) {
        $('html, body').animate({
          scrollTop: firstError.offset().top - 100
        }, 500);
      }
    }
  });

  // Helper functions for validation
  function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  function isValidPhone(phone) {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(String(phone));
  }

  // Form step navigation for multi-step forms
  $('.next-step').click(function() {
    const currentStep = $(this).closest('.form-step');
    const nextStep = currentStep.next('.form-step');
    const currentStepNumber = parseInt(currentStep.data('step'));
    
    // Validate current step fields before proceeding
    let isStepValid = true;
    currentStep.find('[required]').each(function() {
      if ($(this).val() === '') {
        isStepValid = false;
        $(this).addClass('input-error');
      } else {
        $(this).removeClass('input-error');
      }
    });
    
    if (isStepValid) {
      // Move to next step
      currentStep.removeClass('active');
      nextStep.addClass('active');
      
      // Update progress indicator
      $('.progress-step').removeClass('active');
      $(`.progress-step[data-step="${currentStepNumber + 1}"]`).addClass('active');
      
      // Scroll to top of form
      $('html, body').animate({
        scrollTop: $('.form-progress').offset().top - 100
      }, 500);
    } else {
      // Show error message
      alert('Please fill in all required fields before proceeding.');
    }
  });
  
  $('.prev-step').click(function() {
    const currentStep = $(this).closest('.form-step');
    const prevStep = currentStep.prev('.form-step');
    const currentStepNumber = parseInt(currentStep.data('step'));
    
    // Move to previous step
    currentStep.removeClass('active');
    prevStep.addClass('active');
    
    // Update progress indicator
    $('.progress-step').removeClass('active');
    $(`.progress-step[data-step="${currentStepNumber - 1}"]`).addClass('active');
    
    // Scroll to top of form
    $('html, body').animate({
      scrollTop: $('.form-progress').offset().top - 100
    }, 500);
  });

  // Add form styling and interactions
  $('.form-group input, .form-group select, .form-group textarea').each(function() {
    if ($(this).val() !== '') {
      $(this).parent('.form-group').addClass('has-value');
    }
  }).on('input change', function() {
    if ($(this).val() !== '') {
      $(this).parent('.form-group').addClass('has-value');
    } else {
      $(this).parent('.form-group').removeClass('has-value');
    }
  });

  // Clear error on input
  $('input, select, textarea').on('input change', function() {
    $(this).removeClass('input-error');
    $(this).parent('.form-group').find('.form-error').remove();
  });

  // Add form styling
  $('input, select, textarea').focus(function() {
    $(this).parent('.form-group').addClass('focused');
  }).blur(function() {
    $(this).parent('.form-group').removeClass('focused');
  });
});