// Helper function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

$(document).ready(async function() {
    const facilityId = getCookie('facility_id');
    if (!facilityId) {
        alert('Facility ID not found. Please register a facility first.');
        window.location.href = 'register-facility.html';
        return;
    }

    // Fetch patients from the API
    const response = await fetch(`http://localhost:6060/api/v1/patients/facility/${facilityId}`)
    if (!response.ok) {
        console.error('Error fetching patients:', response.statusText);
        alert('Failed to load patients. Please try again later.');
        return;
    }
    const samplePatients = await response.json();
    if (!Array.isArray(samplePatients) || samplePatients.length === 0) {
        console.warn('No patients found or data is not in expected format.');
        alert('No patients found for this facility.');
        return;
    }
    
    let allPatients = samplePatients;
    let filteredPatients = samplePatients;
    let currentPage = 1;
    let pageSize = 10;
    let totalPages = 1;

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function calculateAge(dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    function renderPatients(patients) {
        const patientsList = $('#patients-list');
        const patientCount = $('#patient-count');
        
        // Calculate pagination
        totalPages = Math.ceil(patients.length / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedPatients = patients.slice(startIndex, endIndex);
        
        patientCount.text(patients.length);
        
        if (patients.length === 0) {
            patientsList.html(`
                <div class="alert">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <h4>No Patients Found</h4>
                        <p>No patients match your search criteria.</p>
                    </div>
                </div>
            `);
            $('#pagination-controls').empty();
            $('#pagination-info').empty();
            return;
        }

        const patientsHtml = paginatedPatients.map(patient => {
            const fullName = `${patient.patient_info.first_name} ${patient.patient_info.middle_name || ''} ${patient.patient_info.last_name}`.trim();
            const age = calculateAge(patient.patient_info.dob);
            
            // Get the most recent diagnosis (first in array since they're ordered by creation date)
            const latestDiagnosis = patient.diagnosis && patient.diagnosis.length > 0 ? patient.diagnosis[0] : null;
            const primarySite = latestDiagnosis ? latestDiagnosis.primary_site : 'Not specified';
            const stage = latestDiagnosis ? latestDiagnosis.stage : 'Not specified';
            const diagnosisDate = latestDiagnosis ? formatDate(latestDiagnosis.date_of_diagnosis) : 'Not specified';
            
            return `
                <div class="patient-card">
                    <div class="patient-card-header">
                        <div>
                            <div class="patient-name">${fullName}</div>
                            <div class="patient-id">ID: ${patient.registration_id} | National ID: ${patient.patient_info.national_id || 'Not provided'}</div>
                        </div>
                    </div>
                    <div class="patient-card-content">
                        <div class="patient-card-item">
                            <div class="patient-card-label">Age</div>
                            <div class="patient-card-value">${age} years</div>
                        </div>
                        <div class="patient-card-item">
                            <div class="patient-card-label">Gender</div>
                            <div class="patient-card-value">${patient.patient_info.gender}</div>
                        </div>
                        <div class="patient-card-item">
                            <div class="patient-card-label">Primary Site</div>
                            <div class="patient-card-value">${primarySite}</div>
                        </div>
                        <div class="patient-card-item">
                            <div class="patient-card-label">Stage</div>
                            <div class="patient-card-value">${stage}</div>
                        </div>
                        <div class="patient-card-item">
                            <div class="patient-card-label">Diagnosis Date</div>
                            <div class="patient-card-value">${diagnosisDate}</div>
                        </div>
                        <div class="patient-card-item">
                            <div class="patient-card-label">Registration Date</div>
                            <div class="patient-card-value">${formatDate(patient.registration_date)}</div>
                        </div>
                    </div>
                    <div class="patient-card-actions">
                        <button class="btn primary view-patient" data-patient-id="${patient.ID}">
                            <i class="fas fa-eye"></i> View Patient
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        patientsList.html(patientsHtml);
        renderPagination(patients.length);
    }

    function renderPagination(totalItems) {
        const paginationControls = $('#pagination-controls');
        const paginationInfo = $('#pagination-info');
        
        if (totalItems === 0) {
            paginationControls.empty();
            paginationInfo.empty();
            return;
        }
        
        // Update pagination info
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);
        paginationInfo.text(`Showing ${startItem}-${endItem} of ${totalItems} patients`);
        
        // Generate pagination buttons
        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `<button class="pagination-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHtml += `<button class="pagination-btn page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHtml += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `<button class="pagination-btn page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHtml += `<button class="pagination-btn page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Next button
        paginationHtml += `<button class="pagination-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        paginationControls.html(paginationHtml);
    }

    function filterPatients(searchTerm) {
        currentPage = 1; // Reset to first page when filtering
        if (!searchTerm.trim()) {
            filteredPatients = allPatients;
        } else {
            const term = searchTerm.toLowerCase();
            filteredPatients = allPatients.filter(patient => {
                const fullName = `${patient.patient_info.first_name} ${patient.patient_info.middle_name || ''} ${patient.patient_info.last_name}`.toLowerCase();
                const registrationId = patient.registration_id.toLowerCase();
                const nationalId = (patient.patient_info.national_id || '').toLowerCase();
                
                // Search in diagnosis primary sites
                const primarySites = patient.diagnosis ? patient.diagnosis.map(d => d.primary_site.toLowerCase()).join(' ') : '';
                
                return fullName.includes(term) || 
                       registrationId.includes(term) || 
                       nationalId.includes(term) ||
                       primarySites.includes(term);
            });
        }
        renderPatients(filteredPatients);
    }

    // Event handlers
    $('#patient-search').on('input', function() {
        const searchTerm = $(this).val();
        filterPatients(searchTerm);
    });

$(document).on('click', '.view-patient', function() {
    const patientId = $(this).data('patient-id');
    // Navigate to patient detail page with patient ID as URL parameter
    window.location.href = `patient-detail.html?id=${patientId}`;
});

    // Pagination event handlers
    $(document).on('click', '.page-btn', function() {
        currentPage = parseInt($(this).data('page'));
        renderPatients(filteredPatients);
    });

    $(document).on('click', '#prev-page', function() {
        if (currentPage > 1) {
            currentPage--;
            renderPatients(filteredPatients);
        }
    });

    $(document).on('click', '#next-page', function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderPatients(filteredPatients);
        }
    });

    $('#page-size').on('change', function() {
        pageSize = parseInt($(this).val());
        currentPage = 1;
        renderPatients(filteredPatients);
    });

    // Mobile menu toggle
    $('.mobile-menu-toggle').click(function() {
        $('nav').toggleClass('active');
    });

    // Initial render
    renderPatients(allPatients);
});