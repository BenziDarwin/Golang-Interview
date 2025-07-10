// Session and authentication management
const SessionManager = {
  // Check if user has valid session token
  hasValidSession: function () {
    const sessionToken = this.getCookie("session_token")
    const userRole = this.getCookie("user_role")
    return sessionToken && sessionToken !== ""
  },

  // Get cookie value by name
  getCookie: (name) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(";").shift()
    return null
  },

  // Set cookie
  setCookie: (name, value, days = 7) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`
  },

  // Remove cookie
  removeCookie: (name) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
  },

  // Get user role from cookie
  getUserRole: function () {
    return this.getCookie("user_role") || "guest"
  },

  // Get user name from cookie
  getUserName: function () {
    return this.getCookie("user_name") ? this.getCookie("user_name").replace(/"/g, "") || "User" : ""
  },

  // Get facility ID from cookie
  getFacilityId: function () {
    return this.getCookie("facility_id")
  },

  // Logout user
  logout: function () {
    this.removeCookie("session_token")
    this.removeCookie("user_role")
    this.removeCookie("user_name")
    this.removeCookie("user_email")
    this.removeCookie("facility_id")
    window.location.href = "/index.html"
  },
}

// Navigation and access control
const NavigationManager = {
  facilityName: null, // Store facility name

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
  publicPages: ["index.html", "check-facility.html", "register-facility.html", "login.html", "about.html"],

  // Check if current page requires authentication
  isProtectedPage: function (pageName) {
    return this.protectedPages.includes(pageName)
  },

  // Check if user can access current page
  canAccessPage: function (pageName) {
    if (this.publicPages.includes(pageName)) {
      return true
    }
    if (this.isProtectedPage(pageName)) {
      return SessionManager.hasValidSession()
    }
    return true // Default allow for unlisted pages
  },

  // Redirect to login if access denied
  checkPageAccess: function () {
    const currentPage = window.location.pathname.split("/").pop() || "index.html"
    if (!this.canAccessPage(currentPage)) {
      alert("Please log in to access this page.")
      window.location.href = "/login.html"
      return false
    }
    return true
  },

  // Generate user initials for avatar
  getUserInitials: () => {
    const userName = SessionManager.getUserName()
    const names = userName.split(" ")
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
    }
    return userName.substring(0, 2).toUpperCase()
  },

  // Fetch facility name
  fetchFacilityName: async function () {
    const facilityId = SessionManager.getFacilityId()
    const userRole = SessionManager.getUserRole()

    if (facilityId && userRole === "facility") {
      try {
        const response = await fetch(`/api/v1/facilities/registry/${facilityId}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            this.facilityName = data[0].name
          }
        }
      } catch (error) {
        console.error("Error fetching facility name:", error)
      }
    }
  },

  // Generate navigation HTML based on user session
  generateNavigation: () => {
    const hasSession = SessionManager.hasValidSession()
    const userRole = SessionManager.getUserRole()
    const userName = SessionManager.getUserName()
    const currentPage = window.location.pathname.split("/").pop() || "index.html"

    let navItems = `
      <li><a href="/index.html" ${currentPage === "index.html" ? 'class="active"' : ""}>Home</a></li>
    `

    if (hasSession) {
      if (userRole === "facility") {
        navItems += `
          <li><a href="/facility/facility.html" ${currentPage === "facility.html" ? 'class="active"' : ""}>My Facility</a></li>
        `
      }

      // Add admin link for admin users
      if (userRole === "admin" || userRole === "super_admin") {
        navItems += `
          <li><a href="admin.html" ${currentPage === "admin.html" ? 'class="active"' : ""}>Admin</a></li>
        `
      }
    } else {
      // Add login link for non-authenticated users
      navItems += `
        <li><a id="login" href="/login.html" ${currentPage === "login.html" ? 'class="active"' : ""}> <i class="fas fa-sign-in-alt"></i> Login</a></li>
      `
    }

    return navItems
  },

  // Generate facility title for header
  generateFacilityTitle: function () {
    if (this.facilityName && SessionManager.getUserRole() === "facility") {
      return `
        <div class="facility-title">
          <i class="fas fa-hospital"></i>
          <span>${this.facilityName}</span>
        </div>
      `
    }
    return ""
  },

  // Generate user dropdown menu
  generateUserDropdown: function () {
    const userName = SessionManager.getUserName()
    const userRole = SessionManager.getUserRole()
    const userInitials = this.getUserInitials()

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
              ${this.facilityName ? `<div class="facility-name">${this.facilityName}</div>` : ""}
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
    `
  },

  // Load header dynamically
  loadHeader: async function () {
    const hasSession = SessionManager.hasValidSession()

    // Fetch facility name first if user is a facility
    if (hasSession && SessionManager.getUserRole() === "facility") {
      await this.fetchFacilityName()
    }

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

          ${this.generateFacilityTitle()}
                    
          <div class="header-right">
            ${hasSession ? this.generateUserDropdown() : ""}
            <div class="mobile-menu-toggle">
              <i class="fas fa-bars"></i>
            </div>
          </div>
        </div>
      </header>
            
      <style>
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo h1 {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .nav-items {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          gap: 30px;
        }

        .nav-items li a {
          text-decoration: none;
          color: #333;
          font-weight: 500;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .nav-items li a:hover,
        .nav-items li a.active {
          background-color: #f0f4ff;
          color: #0C4296;
        }

        .facility-title {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #0C4296, #1a5bb8);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(12, 66, 150, 0.2);
          margin-left: 40px;
          margin-right: 40px;
        }

        .facility-title i {
          font-size: 16px;
          opacity: 0.9;
        }

        .facility-title span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
                
        .user-dropdown {
          position: inherit;
        }
                
        .user-avatar {
          cursor: pointer;
          position: fixed;
          top: 15px;
          right: 100px;
          transition: transform 0.2s ease;
        }
                
        .user-avatar:hover {
          transform: scale(1.05);
        }
                
        #login {
          background-color: #0C4296;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          position: fixed;
          top: 15px;
          right: 100px;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: background-color 0.3s ease, transform 0.2s ease;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        #login:hover {
          background-color: #093577;
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

        .user-info .facility-name {
          color: #0C4296;
          font-size: 11px;
          margin-top: 4px;
          font-weight: 500;
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

        /* Hide mobile menu toggle by default */
        .mobile-menu-toggle {
          display: none;
        }
                
        /* Mobile responsiveness */
        @media (max-width: 1024px) {
          .facility-title {
            margin-left: 20px;
            margin-right: 20px;
          }

          .facility-title span {
            max-width: 150px;
          }
        }

        @media (max-width: 768px) {
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

          .facility-title {
            order: 3;
            width: 100%;
            margin: 10px 0 0 0;
            justify-content: center;
          }

          .facility-title span {
            max-width: none;
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
            order: 4;
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

          #login {
            position: static;
            margin-left: 10px;
            padding: 8px 12px;
            font-size: 14px;
          }

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

          .facility-title {
            font-size: 12px;
            padding: 6px 12px;
          }

          .facility-title i {
            font-size: 14px;
          }
        }
      </style>
    `

    // Insert header at the beginning of body
    document.body.insertAdjacentHTML("afterbegin", headerHTML)

    // Bind avatar dropdown toggle
    const userAvatar = document.getElementById("user-avatar")
    if (userAvatar) {
      userAvatar.addEventListener("click", (e) => {
        e.stopPropagation()
        document.getElementById("dropdown-menu").classList.toggle("show")
      })
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-dropdown")) {
        const dropdownMenu = document.getElementById("dropdown-menu")
        if (dropdownMenu) {
          dropdownMenu.classList.remove("show")
        }
      }
    })

    // Bind logout event
    const logoutBtn = document.getElementById("logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault()
        if (confirm("Are you sure you want to logout?")) {
          SessionManager.logout()
        }
      })
    }

    // Bind profile link
    const profileLink = document.getElementById("profile-link")
    if (profileLink) {
      profileLink.addEventListener("click", (e) => {
        e.preventDefault()
        console.log("Navigate to profile page")
      })
    }
  },
}

// Initialize when document is ready
document.addEventListener("DOMContentLoaded", async () => {
  // Check page access first
  if (!NavigationManager.checkPageAccess()) {
    return // Stop execution if access denied
  }

  // Load header dynamically
  await NavigationManager.loadHeader()

  const heroElement = document.querySelector(".hero")
  if (SessionManager.hasValidSession() && heroElement) {
    heroElement.style.display = "none"
  }

  // Mobile menu toggle
  const mobileToggle = document.querySelector(".mobile-menu-toggle")
  if (mobileToggle) {
    mobileToggle.addEventListener("click", function () {
      const nav = document.querySelector("nav")
      nav.classList.toggle("active")
      const icon = this.querySelector("i")
      icon.classList.toggle("fa-bars")
      icon.classList.toggle("fa-times")
    })
  }

  // Close mobile menu when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest("header")) {
      const nav = document.querySelector("nav")
      if (nav) {
        nav.classList.remove("active")
        const icon = document.querySelector(".mobile-menu-toggle i")
        if (icon) {
          icon.classList.remove("fa-times")
          icon.classList.add("fa-bars")
        }
      }
    }
  })

  // Intercept navigation clicks for protected pages
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href")
      const pageName = href.split("/").pop()

      // Check if trying to access protected page without session
      if (NavigationManager.isProtectedPage(pageName) && !SessionManager.hasValidSession()) {
        e.preventDefault()
        alert("Please log in to access this page.")
        window.location.href = "/login.html"
        return false
      }
    })
  })

  // Add smooth scrolling for all links
  document.querySelectorAll('a[href*="#"]:not([href="#"])').forEach((link) => {
    link.addEventListener("click", function (e) {
      if (
        window.location.pathname.replace(/^\//, "") === this.pathname.replace(/^\//, "") &&
        window.location.hostname === this.hostname
      ) {
        let target = document.querySelector(this.hash)
        target = target ? target : document.querySelector(`[name="${this.hash.slice(1)}"]`)
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 80,
            behavior: "smooth",
          })
          e.preventDefault()
        }
      }
    })
  })

  // Form validation - add 'required' indicator to labels
  document.querySelectorAll("form label").forEach((label) => {
    const input = document.getElementById(label.getAttribute("for"))
    if (input && input.hasAttribute("required")) {
      label.innerHTML += ' <span class="required">*</span>'
    }
  })

  // Add input focus animation
  document.querySelectorAll("input, select, textarea").forEach((element) => {
    element.addEventListener("focus", function () {
      this.parentElement.classList.add("focused")
    })
    element.addEventListener("blur", function () {
      this.parentElement.classList.remove("focused")
    })
  })

  // Form error handling
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      let isValid = true

      // Reset previous errors
      form.querySelectorAll(".form-error").forEach((error) => {
        error.remove()
      })
      form.querySelectorAll(".input-error").forEach((input) => {
        input.classList.remove("input-error")
      })

      // Check required fields
      form.querySelectorAll("[required]").forEach((input) => {
        if (input.value === "") {
          isValid = false
          input.classList.add("input-error")
          input.parentElement.insertAdjacentHTML("beforeend", '<div class="form-error">This field is required</div>')
        }
      })

      // Check email format
      form.querySelectorAll('input[type="email"]').forEach((input) => {
        const email = input.value
        if (email !== "" && !isValidEmail(email)) {
          isValid = false
          input.classList.add("input-error")
          input.parentElement.insertAdjacentHTML(
            "beforeend",
            '<div class="form-error">Please enter a valid email address</div>',
          )
        }
      })

      // Check phone format
      form.querySelectorAll('input[type="tel"]').forEach((input) => {
        const phone = input.value
        if (phone !== "" && !isValidPhone(phone)) {
          isValid = false
          input.classList.add("input-error")
          input.parentElement.insertAdjacentHTML(
            "beforeend",
            '<div class="form-error">Please enter a valid phone number</div>',
          )
        }
      })

      // If not valid, prevent form submission
      if (!isValid) {
        e.preventDefault()
        // Scroll to first error
        const firstError = form.querySelector(".input-error")
        if (firstError) {
          window.scrollTo({
            top: firstError.offsetTop - 100,
            behavior: "smooth",
          })
        }
      }
    })
  })

  // Helper functions for validation
  function isValidEmail(email) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
  }

  function isValidPhone(phone) {
    const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    return re.test(String(phone))
  }

  // Form step navigation for multi-step forms
  document.querySelectorAll(".next-step").forEach((button) => {
    button.addEventListener("click", function () {
      const currentStep = this.closest(".form-step")
      const nextStep = currentStep.nextElementSibling
      const currentStepNumber = Number.parseInt(currentStep.getAttribute("data-step"))

      // Validate current step fields before proceeding
      let isStepValid = true
      currentStep.querySelectorAll("[required]").forEach((input) => {
        if (input.value === "") {
          isStepValid = false
          input.classList.add("input-error")
        } else {
          input.classList.remove("input-error")
        }
      })

      if (isStepValid) {
        // Move to next step
        currentStep.classList.remove("active")
        nextStep.classList.add("active")

        // Update progress indicator
        document.querySelectorAll(".progress-step").forEach((step) => {
          step.classList.remove("active")
        })
        document.querySelector(`.progress-step[data-step="${currentStepNumber + 1}"]`).classList.add("active")

        // Scroll to top of form
        window.scrollTo({
          top: document.querySelector(".form-progress").offsetTop - 100,
          behavior: "smooth",
        })
      } else {
        // Show error message
        alert("Please fill in all required fields before proceeding.")
      }
    })
  })

  document.querySelectorAll(".prev-step").forEach((button) => {
    button.addEventListener("click", function () {
      const currentStep = this.closest(".form-step")
      const prevStep = currentStep.previousElementSibling
      const currentStepNumber = Number.parseInt(currentStep.getAttribute("data-step"))

      // Move to previous step
      currentStep.classList.remove("active")
      prevStep.classList.add("active")

      // Update progress indicator
      document.querySelectorAll(".progress-step").forEach((step) => {
        step.classList.remove("active")
      })
      document.querySelector(`.progress-step[data-step="${currentStepNumber - 1}"]`).classList.add("active")

      // Scroll to top of form
      window.scrollTo({
        top: document.querySelector(".form-progress").offsetTop - 100,
        behavior: "smooth",
      })
    })
  })

  // Add form styling and interactions
  document.querySelectorAll(".form-group input, .form-group select, .form-group textarea").forEach((element) => {
    if (element.value !== "") {
      element.parentElement.classList.add("has-value")
    }
    element.addEventListener("input", () => {
      if (element.value !== "") {
        element.parentElement.classList.add("has-value")
      } else {
        element.parentElement.classList.remove("has-value")
      }
    })
    element.addEventListener("change", () => {
      if (element.value !== "") {
        element.parentElement.classList.add("has-value")
      } else {
        element.parentElement.classList.remove("has-value")
      }
    })
  })

  // Clear error on input
  document.querySelectorAll("input, select, textarea").forEach((element) => {
    element.addEventListener("input", function () {
      this.classList.remove("input-error")
      this.parentElement.querySelector(".form-error").remove()
    })
    element.addEventListener("change", function () {
      this.classList.remove("input-error")
      this.parentElement.querySelector(".form-error").remove()
    })
  })

  // Add form styling
  document.querySelectorAll(".form-group input, .form-group select, .form-group textarea").forEach((element) => {
    element.addEventListener("focus", function () {
      this.parentElement.classList.add("focused")
    })
    element.addEventListener("blur", function () {
      this.parentElement.classList.remove("focused")
    })
  })

  // Session timeout warning (optional)
  if (SessionManager.hasValidSession()) {
    // Check session every 30 minutes
    setInterval(
      () => {
        // You can add logic here to check if session is still valid
        // and warn user before automatic logout
      },
      30 * 60 * 1000,
    )
  }
})

// Utility functions for other pages to use
window.HealthRegistry = {
  SessionManager: SessionManager,
  NavigationManager: NavigationManager,
  // Helper function for login pages to set session
  setUserSession: (token, role, userName) => {
    SessionManager.setCookie("session_token", token)
    SessionManager.setCookie("user_role", role)
    SessionManager.setCookie("user_name", userName)
  },
  // Helper function to check if user is admin
  isAdmin: () => {
    const role = SessionManager.getUserRole()
    return role === "admin" || role === "super_admin"
  },
}
