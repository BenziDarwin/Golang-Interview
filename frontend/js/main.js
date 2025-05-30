// Main JavaScript file for common functionality across all pages

// Session and authentication management
const SessionManager = {
  // Check if user has valid session token
  hasValidSession: function() {
    const sessionToken = this.getCookie('session_token');
    const userRole = this.getCookie('user_role');
    return sessionToken && sessionToken !== '';
  },

  // Get cookie value by name
  getCookie: function(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },

  // Set cookie
  setCookie: function(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
  },

  // Remove cookie
  removeCookie: function(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },

  // Get user role from cookie
  getUserRole: function() {
    return this.getCookie('user_role') || 'guest';
  },

  // Logout user
  logout: function() {
    this.removeCookie('session_token');
    this.removeCookie('user_role');
    this.removeCookie('user_name');
    this.removeCookie('user_email');
    this.removeCookie('facility_id');
    window.location.href = 'index.html';
  }
};

// Navigation and access control
const NavigationManager = {
  // Define which pages require authentication
  protectedPages: [
    'register-patient.html',
    'patients.html',
    'admin.html',
    'dashboard.html',
    'reports.html'
  ],

  // Define public pages (always accessible)
  publicPages: [
    'index.html',
    'check-facility.html',
    'register-facility.html',
    'login.html',
    'about.html'
  ],

  // Check if current page requires authentication
  isProtectedPage: function(pageName) {
    return this.protectedPages.includes(pageName);
  },

  // Check if user can access current page
  canAccessPage: function(pageName) {
    if (this.publicPages.includes(pageName)) {
      return true;
    }
    
    if (this.isProtectedPage(pageName)) {
      return SessionManager.hasValidSession();
    }
    
    return true; // Default allow for unlisted pages
  },

  // Redirect to login if access denied
  checkPageAccess: function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (!this.canAccessPage(currentPage)) {
      alert('Please log in to access this page.');
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  // Generate navigation HTML based on user session
  generateNavigation: function() {
    const hasSession = SessionManager.hasValidSession();
    const userRole = SessionManager.getUserRole();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    let navItems = `
      <li><a href="index.html" ${currentPage === 'index.html' ? 'class="active"' : ''}>Home</a></li>
      <li><a href="check-facility.html" ${currentPage === 'check-facility.html' ? 'class="active"' : ''}>Check Facility</a></li>
      <li><a href="register-facility.html" ${currentPage === 'register-facility.html' ? 'class="active"' : ''}>Register Facility</a></li>
    `;

    // Add protected pages if user is authenticated
    if (hasSession) {
      if (userRole === 'facility') {
    navItems += `
        <li><a href="register-patient.html" ${currentPage === 'register-patient.html' ? 'class="active"' : ''}>Register Patient</a></li>
         <li><a href="patients.html" ${currentPage === 'patients.html' ? 'class="active"' : ''}>Patients</a></li>
      `;
      }
  

      // Add admin link for admin users
      if (userRole === 'admin' || userRole === 'super_admin') {
        navItems += `
          <li><a href="admin.html" ${currentPage === 'admin.html' ? 'class="active"' : ''}>Admin</a></li>
        `;
      }

      // Add logout option
      navItems += `
        <li><a href="#" id="logout-btn" class="logout-link">Logout</a></li>
      `;
    } else {
      // Add login link for non-authenticated users
      navItems += `
        <li><a href="login.html" ${currentPage === 'login.html' ? 'class="active"' : ''}>Login</a></li>
      `;
    }

    return navItems;
  },

  // Load header dynamically
  loadHeader: function() {
 
    const headerHTML = `
      <header>
        <div class="container">
          <div class="logo">
            <img src="../assets/logo.png" alt="Uganda National Cancer Registry Logo" style="height: 50px;">
            <h1>Uganda National Cancer Registry</h1>
          </div>
        
          <nav>
            <ul>
              ${this.generateNavigation()}
            </ul>
          </nav>
          <div class="mobile-menu-toggle">
            <i class="fas fa-bars"></i>
          </div>
        </div>
      </header>
    `;

    // Insert header at the beginning of body
    $('body').prepend(headerHTML);

    // Bind logout event
    $('#logout-btn').click(function(e) {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        SessionManager.logout();
      }
    });
  }
};

// Initialize when document is ready
$(document).ready(function() {
  // Check page access first
  if (!NavigationManager.checkPageAccess()) {
    return; // Stop execution if access denied
  }

  // Load header dynamically
  NavigationManager.loadHeader();

  // Mobile menu toggle
  $(document).on('click', '.mobile-menu-toggle', function() {
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

  // Intercept navigation clicks for protected pages
  $(document).on('click', 'nav a', function(e) {
    const href = $(this).attr('href');
    const pageName = href.split('/').pop();

    // Check if trying to access protected page without session
    if (NavigationManager.isProtectedPage(pageName) && !SessionManager.hasValidSession()) {
      e.preventDefault();
      alert('Please log in to access this page.');
      window.location.href = 'login.html';
      return false;
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

  // Session timeout warning (optional)
  if (SessionManager.hasValidSession()) {
    // Check session every 30 minutes
    setInterval(function() {
      // You can add logic here to check if session is still valid
      // and warn user before automatic logout
    }, 30 * 60 * 1000);
  }
});

// Utility functions for other pages to use
window.HealthRegistry = {
  SessionManager: SessionManager,
  NavigationManager: NavigationManager,
  
  // Helper function for login pages to set session
  setUserSession: function(token, role, userName) {
    SessionManager.setCookie('session_token', token);
    SessionManager.setCookie('user_role', role);
    SessionManager.setCookie('user_name', userName);
  },
  
  // Helper function to check if user is admin
  isAdmin: function() {
    const role = SessionManager.getUserRole();
    return role === 'admin' || role === 'super_admin';
  }
};