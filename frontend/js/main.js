// Session and authentication management
const SessionManager = {
  // Check if user has valid session token
  hasValidSession: function () {
    const sessionToken = this.getCookie("session_token");
    const userRole = this.getCookie("user_role");
    return sessionToken && sessionToken !== "";
  },

  // Get cookie value by name
  getCookie: function (name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  },

  // Set cookie
  setCookie: function (name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
  },

  // Remove cookie
  removeCookie: function (name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },

  // Get user role from cookie
  getUserRole: function () {
    return this.getCookie("user_role") || "guest";
  },

  // Get user name from cookie
  getUserName: function () {
    return this.getCookie("user_name")? this.getCookie("user_name").replace(/"/g, "") || "User": "";
  },

  // Logout user
  logout: function () {
    this.removeCookie("session_token");
    this.removeCookie("user_role");
    this.removeCookie("user_name");
    this.removeCookie("user_email");
    this.removeCookie("facility_id");
    window.location.href = "index.html";
  },
};

// Navigation and access control
const NavigationManager = {
  // Define which pages require authentication
  protectedPages: [
    "register-cancer-patient.html",
    "cancer-patients.html",
    "sickle-cell-patients.html",
    "external-referrals.html",
    "register-external-referral.html",
    "external-referrals.html",
    "cancer-patient-detail.html",
    "sickle-cell-patient-detail.html",
    "admin.html",
    "dashboard.html",
    "reports.html",
  ],

  // Define public pages (always accessible)
  publicPages: [
    "index.html",
    "check-facility.html",
    "register-facility.html",
    "login.html",
    "about.html",
  ],

  // Check if current page requires authentication
  isProtectedPage: function (pageName) {
    return this.protectedPages.includes(pageName);
  },

  // Check if user can access current page
  canAccessPage: function (pageName) {
    if (this.publicPages.includes(pageName)) {
      return true;
    }

    if (this.isProtectedPage(pageName)) {
      return SessionManager.hasValidSession();
    }

    return true; // Default allow for unlisted pages
  },

  // Redirect to login if access denied
  checkPageAccess: function () {
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    if (!this.canAccessPage(currentPage)) {
      alert("Please log in to access this page.");
      window.location.href = "login.html";
      return false;
    }
    return true;
  },

  // Generate user initials for avatar
  getUserInitials: function () {
    const userName = SessionManager.getUserName();
    const names = userName.split(" ");
    if (names.length >= 2) {
      return (
        names[0].charAt(0) + names[names.length - 1].charAt(0)
      ).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  },

  // Generate navigation HTML based on user session
  generateNavigation: function () {
    const hasSession = SessionManager.hasValidSession();
    const userRole = SessionManager.getUserRole();
    const userName = SessionManager.getUserName();
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    let navItems = `
      <li><a href="/index.html" ${currentPage === "index.html" ? 'class="active"' : ""}>Home</a></li>
    `;

    if (hasSession) {
      if (userRole === "facility") {
        navItems += `
          <li><a href="/facility/facility.html" ${currentPage === "facility.html" ? 'class="active"' : ""}>My Facility</a></li>
        `;
      }

      // Add admin link for admin users
      if (userRole === "admin" || userRole === "super_admin") {
        navItems += `
          <li><a href="admin.html" ${currentPage === "admin.html" ? 'class="active"' : ""}>Admin</a></li>
        `;
      }
    } else {
      // Add login link for non-authenticated users
      navItems += `
        <li><a id="login" href="login.html" ${currentPage === "login.html" ? 'class="active"' : ""}> <i class="fas fa-sign-in-alt"></i> Login</a></li>
      `;
    }

    return navItems;
  },

  // Generate user dropdown menu
  generateUserDropdown: function () {
    const userName = SessionManager.getUserName();
    const userRole = SessionManager.getUserRole();
    const userInitials = this.getUserInitials();

    return `
      <div class="user-dropdown">
        <div class="user-avatar" id="user-avatar">
          <div class="avatar-circle">
            ${userInitials}
          </div>
        </div>
        <div class="dropdown-menu" id="dropdown-menu">
          <div class="dropdown-header">
            <div class="user-info">
              <div class="user-name">${userName}</div>
              <div class="user-role">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-items">
          <a href="facility.html" class="dropdown-item" id="profile-link">
              <i class="fas fa-user"></i>
              Profile
            </a>
           <!-- 
            <a href="#" class="dropdown-item" id="settings-link">
              <i class="fas fa-cog"></i>
              Settings
            </a>-->
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item logout-item" id="logout-btn">
              <i class="fas fa-sign-out-alt"></i>
              Logout
            </a>
          </div>
        </div>
      </div>
    `;
  },

  // Load header dynamically
  loadHeader: function () {
    const hasSession = SessionManager.hasValidSession();

    const headerHTML = `
      <header>
        <div class="container">
          <div class="logo">
            <img src="../assets/images/logo.png" alt="Uganda National Patient Registry Logo" style="height: 50px;">
            <h1>Uganda National Patient Registry</h1>
          </div>
        
          <nav>
            <ul class="nav-items">
              ${this.generateNavigation()}
            </ul>
          </nav>
          
          <div class="header-right">
            ${hasSession ? this.generateUserDropdown() : ""}
            <div class="mobile-menu-toggle">
              <i class="fas fa-bars"></i>
            </div>
          </div>
        </div>
      </header>
      
      <style>
        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .nav-items {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          gap: 15px;
        }
        
        .user-dropdown {
          position: fixed;
          right: 30px;
          top: 20px;
        }
        
        .user-avatar {
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .user-avatar:hover {
          transform: scale(1.05);
        }
        
        #login {
          position: fixed;
          right: 30px;
          top: 20px;
          background-color: #0C4296;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: background-color 0.3s ease, transform 0.2s ease;
          text-decoration: none;
        }

        #login i {
          margin-right: 8px;
        }

        #login:hover {
          background-color: #093577; /* A darker hover shade of #0C4296 */
          transform: scale(1.05);
        }
        
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .dropdown-menu {
          position: absolute;
          top: 50px;
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.3s ease;
          z-index: 1000;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .dropdown-menu.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .dropdown-header {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }
        
        .user-info .user-name {
          font-weight: bold;
          color: #333;
          font-size: 14px;
        }
        
        .user-info .user-role {
          color: #666;
          font-size: 12px;
          text-transform: capitalize;
        }
        
        .dropdown-divider {
          height: 1px;
          background: #e9ecef;
          margin: 0;
        }
        
        .dropdown-items {
          padding: 8px 0;
        }
        
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 15px;
          color: #333;
          text-decoration: none;
          transition: background-color 0.2s ease;
          font-size: 14px;
        }
        
        .dropdown-item:hover {
          background-color: #f8f9fa;
          color: #333;
        }
        
        .dropdown-item.logout-item {
          color: #dc3545;
        }
        
        .dropdown-item.logout-item:hover {
          background-color: #f8f9fa;
          color: #dc3545;
        }
        
        .dropdown-item i {
          width: 16px;
          text-align: center;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .container {
            flex-wrap: wrap;
            position: relative;
          }

          .logo {
            flex: 1;
            min-width: 200px;
          }

          .logo h1 {
            font-size: 16px;
          }

          .logo img {
            height: 35px !important;
          }
          
          .header-right {
            order: 2;
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
          }

          .mobile-menu-toggle {
            display: block !important;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #333;
            padding: 5px;
          }

          nav {
            order: 3;
            width: 100%;
            display: none;
            background: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-top: 10px;
            border-radius: 8px;
          }

          nav.active {
            display: block;
          }

          .nav-items {
            flex-direction: column;
            gap: 0;
            padding: 10px 0;
          }

          .nav-items li a {
            display: block;
            padding: 12px 20px;
            color: #333;
            text-decoration: none;
            border-bottom: 1px solid #eee;
          }

          .nav-items li:last-child a {
            border-bottom: none;
          }

          .nav-items li a:hover,
          .nav-items li a.active {
            background-color: #f8f9fa;
            color: #0C4296;
          }

          /* Adjust login button position for mobile */
          #login {
            position: static;
            margin-left: 10px;
            padding: 8px 12px;
            font-size: 14px;
          }

          /* Adjust user dropdown position for mobile */
          .user-dropdown {
            position: static;
            margin-left: 10px;
          }
          
          .dropdown-menu {
            right: -10px;
            min-width: 180px;
          }
        }

        @media (max-width: 480px) {
          .logo h1 {
            font-size: 14px;
          }

          .logo img {
            height: 30px !important;
          }

          #login {
            padding: 6px 10px;
            font-size: 12px;
          }

          #login span {
            display: none;
          }

          .avatar-circle {
            width: 35px;
            height: 35px;
            font-size: 14px;
          }
        }

        /* Hide mobile menu toggle by default */
        .mobile-menu-toggle {
          display: none;
        }
      </style>
    `;

    // Insert header at the beginning of body
    $("body").prepend(headerHTML);

    // Bind avatar dropdown toggle
    $("#user-avatar").click(function (e) {
      e.stopPropagation();
      $("#dropdown-menu").toggleClass("show");
    });

    // Close dropdown when clicking outside
    $(document).click(function (e) {
      if (!$(e.target).closest(".user-dropdown").length) {
        $("#dropdown-menu").removeClass("show");
      }
    });

    // Bind logout event
    $("#logout-btn").click(function (e) {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        SessionManager.logout();
      }
    });

    // Bind profile and settings links (you can customize these)
    $("#profile-link").click(function (e) {
      e.preventDefault();
      // Add profile page navigation here
      console.log("Navigate to profile page");
    });

    $("#settings-link").click(function (e) {
      e.preventDefault();
      // Add settings page navigation here
      console.log("Navigate to settings page");
    });
  },
};

// Initialize when document is ready
$(document).ready(function () {
  // Check page access first
  if (!NavigationManager.checkPageAccess()) {
    return; // Stop execution if access denied
  }

  // Load header dynamically
  NavigationManager.loadHeader();

  if (SessionManager.hasValidSession()) {
    $(".hero").hide();
  }

  // Mobile menu toggle
  $(document).on("click", ".mobile-menu-toggle", function () {
    $("nav").toggleClass("active");
    $(this).find("i").toggleClass("fa-bars fa-times");
  });

  // Close mobile menu when clicking outside
  $(document).on("click", function (event) {
    if (!$(event.target).closest("header").length) {
      $("nav").removeClass("active");
      $(".mobile-menu-toggle i").removeClass("fa-times").addClass("fa-bars");
    }
  });

  // Intercept navigation clicks for protected pages
  $(document).on("click", "nav a", function (e) {
    const href = $(this).attr("href");
    const pageName = href.split("/").pop();

    // Check if trying to access protected page without session
    if (
      NavigationManager.isProtectedPage(pageName) &&
      !SessionManager.hasValidSession()
    ) {
      e.preventDefault();
      alert("Please log in to access this page.");
      window.location.href = "login.html";
      return false;
    }
  });

  // Add smooth scrolling for all links
  $('a[href*="#"]:not([href="#"])').click(function () {
    if (
      location.pathname.replace(/^\//, "") ===
        this.pathname.replace(/^\//, "") &&
      location.hostname === this.hostname
    ) {
      let target = $(this.hash);
      target = target.length ? target : $("[name=" + this.hash.slice(1) + "]");
      if (target.length) {
        $("html, body").animate(
          {
            scrollTop: target.offset().top - 80,
          },
          800,
        );
        return false;
      }
    }
  });

  // Form validation - add 'required' indicator to labels
  $("form label").each(function () {
    const input = $("#" + $(this).attr("for"));
    if (input.attr("required")) {
      $(this).append(' <span class="required">*</span>');
    }
  });

  // Add input focus animation
  $("input, select, textarea")
    .on("focus", function () {
      $(this).parent(".form-group").addClass("focused");
    })
    .on("blur", function () {
      $(this).parent(".form-group").removeClass("focused");
    });

  // Form error handling
  $("form").on("submit", function (e) {
    const form = $(this);
    let isValid = true;

    // Reset previous errors
    form.find(".form-error").remove();
    form.find(".input-error").removeClass("input-error");

    // Check required fields
    form.find("[required]").each(function () {
      if ($(this).val() === "") {
        isValid = false;
        $(this).addClass("input-error");
        $(this)
          .parent(".form-group")
          .append('<div class="form-error">This field is required</div>');
      }
    });

    // Check email format
    form.find('input[type="email"]').each(function () {
      const email = $(this).val();
      if (email !== "" && !isValidEmail(email)) {
        isValid = false;
        $(this).addClass("input-error");
        $(this)
          .parent(".form-group")
          .append(
            '<div class="form-error">Please enter a valid email address</div>',
          );
      }
    });

    // Check phone format
    form.find('input[type="tel"]').each(function () {
      const phone = $(this).val();
      if (phone !== "" && !isValidPhone(phone)) {
        isValid = false;
        $(this).addClass("input-error");
        $(this)
          .parent(".form-group")
          .append(
            '<div class="form-error">Please enter a valid phone number</div>',
          );
      }
    });

    // If not valid, prevent form submission
    if (!isValid) {
      e.preventDefault();

      // Scroll to first error
      const firstError = form.find(".input-error").first();
      if (firstError.length) {
        $("html, body").animate(
          {
            scrollTop: firstError.offset().top - 100,
          },
          500,
        );
      }
    }
  });

  // Helper functions for validation
  function isValidEmail(email) {
    const re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  function isValidPhone(phone) {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(String(phone));
  }

  // Form step navigation for multi-step forms
  $(".next-step").click(function () {
    const currentStep = $(this).closest(".form-step");
    const nextStep = currentStep.next(".form-step");
    const currentStepNumber = parseInt(currentStep.data("step"));

    // Validate current step fields before proceeding
    let isStepValid = true;
    currentStep.find("[required]").each(function () {
      if ($(this).val() === "") {
        isStepValid = false;
        $(this).addClass("input-error");
      } else {
        $(this).removeClass("input-error");
      }
    });

    if (isStepValid) {
      // Move to next step
      currentStep.removeClass("active");
      nextStep.addClass("active");

      // Update progress indicator
      $(".progress-step").removeClass("active");
      $(`.progress-step[data-step="${currentStepNumber + 1}"]`).addClass(
        "active",
      );

      // Scroll to top of form
      $("html, body").animate(
        {
          scrollTop: $(".form-progress").offset().top - 100,
        },
        500,
      );
    } else {
      // Show error message
      alert("Please fill in all required fields before proceeding.");
    }
  });

  $(".prev-step").click(function () {
    const currentStep = $(this).closest(".form-step");
    const prevStep = currentStep.prev(".form-step");
    const currentStepNumber = parseInt(currentStep.data("step"));

    // Move to previous step
    currentStep.removeClass("active");
    prevStep.addClass("active");

    // Update progress indicator
    $(".progress-step").removeClass("active");
    $(`.progress-step[data-step="${currentStepNumber - 1}"]`).addClass(
      "active",
    );

    // Scroll to top of form
    $("html, body").animate(
      {
        scrollTop: $(".form-progress").offset().top - 100,
      },
      500,
    );
  });

  // Add form styling and interactions
  $(".form-group input, .form-group select, .form-group textarea")
    .each(function () {
      if ($(this).val() !== "") {
        $(this).parent(".form-group").addClass("has-value");
      }
    })
    .on("input change", function () {
      if ($(this).val() !== "") {
        $(this).parent(".form-group").addClass("has-value");
      } else {
        $(this).parent(".form-group").removeClass("has-value");
      }
    });

  // Clear error on input
  $("input, select, textarea").on("input change", function () {
    $(this).removeClass("input-error");
    $(this).parent(".form-group").find(".form-error").remove();
  });

  // Add form styling
  $(".form-group input, .form-group select, .form-group textarea")
    .focus(function () {
      $(this).parent(".form-group").addClass("focused");
    })
    .blur(function () {
      $(this).parent(".form-group").removeClass("focused");
    });

  // Session timeout warning (optional)
  if (SessionManager.hasValidSession()) {
    // Check session every 30 minutes
    setInterval(
      function () {
        // You can add logic here to check if session is still valid
        // and warn user before automatic logout
      },
      30 * 60 * 1000,
    );
  }
});

// Utility functions for other pages to use
window.HealthRegistry = {
  SessionManager: SessionManager,
  NavigationManager: NavigationManager,

  // Helper function for login pages to set session
  setUserSession: function (token, role, userName) {
    SessionManager.setCookie("session_token", token);
    SessionManager.setCookie("user_role", role);
    SessionManager.setCookie("user_name", userName);
  },

  // Helper function to check if user is admin
  isAdmin: function () {
    const role = SessionManager.getUserRole();
    return role === "admin" || role === "super_admin";
  },
};