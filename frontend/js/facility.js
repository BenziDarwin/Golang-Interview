class FacilityProfile {
    constructor() {
        this.isEditMode = false;
        this.originalData = {};
        this.currentData = {};
        this.facilityId = this.getFacilityIdFromCookie();

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFacilityData();
    }

    getFacilityIdFromCookie() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === 'facility_id') {
            return value;
        }
    }
    return null;
}

    bindEvents() {
        // Tab switching
        $('.tab-button').on('click', (e) => {
            this.switchTab($(e.target).data('tab'));
        });

        // Edit/Save/Cancel buttons
        $('#editBtn').on('click', () => this.toggleEditMode(true));
        $('#saveBtn').on('click', () => this.saveFacility());
        $('#cancelBtn').on('click', () => this.cancelEdit());

        this.bindMultiSelectEvents();
    }

    bindMultiSelectEvents() {
        $('#organization_type_select').on('change', (e) => {
            if ($(e.target).val() && this.isEditMode) {
                this.addTag('organization_type', $(e.target).val());
                $(e.target).val('');
            }
        });

        $('#genomic_tests_select').on('change', (e) => {
            if ($(e.target).val() && this.isEditMode) {
                this.addTag('genomic_tests', $(e.target).val());
                $(e.target).val('');
            }
        });
    }

    switchTab(tabName) {
        $('.tab-button').removeClass('active');
        $(`[data-tab="${tabName}"]`).addClass('active');

        $('.tab-content').removeClass('active');
        $(`#${tabName}`).addClass('active');
    }

    toggleEditMode(edit) {
        this.isEditMode = edit;

        const container = $('.profile-container');
        if (edit) {
            container.removeClass('view-mode').addClass('edit-mode');
            $('#editBtn').hide();
            $('#saveBtn, #cancelBtn').css('display', 'inline-flex');
            this.toggleFormInputs(false);
        } else {
            container.removeClass('edit-mode').addClass('view-mode');
            $('#editBtn').css('display', 'inline-flex');
            $('#saveBtn, #cancelBtn').hide();
            this.toggleFormInputs(true);
        }
    }

    toggleFormInputs(disabled) {
        $('.form-input, .form-select, .checkbox-input, #organization_type_select, #genomic_tests_select').prop('disabled', disabled);
    }

    showAlert(message, type = 'success') {
        const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
        const alertHtml = `
            <div class="alert alert-${type}">
                <i class="fas fa-${icon}"></i>
                ${message}
            </div>
        `;

        $('#alertContainer').html(alertHtml);

        setTimeout(() => {
            $('#alertContainer').empty();
        }, 5000);
    }

  async loadFacilityData() {
    try {
        const response = await fetch(`/api/v1/facilities/registry/${this.facilityId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        this.originalData = data[0];
        this.currentData = { ...data[0] };
        this.populateForm(data[0]);
    
    } catch (err) {
        console.error(err);
        this.showAlert('Failed to load facility data. Please try again.', 'error');
    }
}

  populateForm(data) {
    console.log('Populating form with data:', data);

    $('#facilityName').text(data.name);
    $('#organizationName').text(data.organization_name);

    $('#name').val(data.name || '');
    $('#organization_name').val(data.organization_name || '');
    $('#provider_specialty').val(data.provider_specialty || '');
    $('#status').val(data.status || '');
    $('#yearly_cases').val(data.yearly_cases || '');
    $('#address').val(data.address || '');

    this.populateMultiSelect('organization_type', data.organization_type || []);
    this.populateMultiSelect('genomic_tests', data.genomic_tests || []);

    // Handle contacts array -> map by type
    if (data.contacts && Array.isArray(data.contacts)) {
        const contactMap = data.contacts.reduce((acc, contact) => {
            acc[contact.type] = contact;
            return acc;
        }, {});

        this.populateContact('meaningful_use', contactMap.meaningful_use || {});
        this.populateContact('registry_lead', contactMap.registry_lead || {});
        this.populateContact('network_lead', contactMap.network_lead || {});
    }

    // Technical section
    if (data.technical) {
        $('#software_vendor').val(data.technical.software_vendor || '');
        $('#software_product').val(data.technical.software_product || '');
        $('#software_version').val(data.technical.software_version || '');
        $('#transport_option').val(data.technical.transport_option || '');
        $('#upgrade_date').val(data.technical.upgrade_date ? new Date(data.technical.upgrade_date).toISOString().split('T')[0] : '');
        $('#is_cehrt2014').prop('checked', Boolean(data.technical.is_cehrt2014));
        $('#supports_hl7cda').prop('checked', Boolean(data.technical.supports_hl7cda));
    }

    // Identification section
    if (data.identification) {
        $('#registry_id').val(data.identification.registry_id || '');
        $('#npi').val(data.identification.npi || '');
    }
}
    populateContact(type, contactData) {
        if (!contactData) return;

        $(`#${type}_name`).val(contactData.name);
        $(`#${type}_email`).val(contactData.email);
        $(`#${type}_phone`).val(contactData.phone);
    }

    populateMultiSelect(field, values) {
        const $container = $(`#${field}_tags`).empty();
        values.forEach(value => this.createTag(field, value, $container));
    }

    addTag(field, value) {
        const $container = $(`#${field}_tags`);
        const existing = $container.children(`[data-value="${value}"]`);
        if (!existing.length) {
            this.createTag(field, value, $container);
        }
    }

    createTag(field, value, $container) {
        const $tag = $(`
            <div class="tag" data-value="${value}">
                ${this.formatTagLabel(value)}
                ${this.isEditMode ? `<button type="button" class="tag-remove" data-field="${field}" data-value="${value}">×</button>` : ''}
            </div>
        `);
        $container.append($tag);

        $tag.find('.tag-remove').on('click', (e) => {
            this.removeTag(field, value);
        });
    }

    removeTag(field, value) {
        $(`#${field}_tags`).find(`[data-value="${value}"]`).remove();
    }

    formatTagLabel(value) {
        return value.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase()
            .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    collectFormData() {
        return {
            name: $('#name').val(),
            organization_name: $('#organization_name').val(),
            provider_specialty: $('#provider_specialty').val(),
            status: $('#status').val(),
            yearly_cases: $('#yearly_cases').val(),
            address: $('#address').val(),
            organization_type: this.getTagValues('organization_type'),
            genomic_tests: this.getTagValues('genomic_tests'),
            contacts: {
                meaningful_use: this.getContactData('meaningful_use'),
                registry_lead: this.getContactData('registry_lead'),
                network_lead: this.getContactData('network_lead')
            },
            technical: {
                software_vendor: $('#software_vendor').val(),
                software_product: $('#software_product').val(),
                software_version: $('#software_version').val(),
                transport_option: $('#transport_option').val(),
                upgrade_date: $('#upgrade_date').val(),
                is_cehrt2014: $('#is_cehrt2014').is(':checked'),
                supports_hl7cda: $('#supports_hl7cda').is(':checked')
            },
            identification: {
                registry_id: $('#registry_id').val(),
                npi: $('#npi').val()
            }
        };
    }

    getTagValues(field) {
        return $(`#${field}_tags`).children().map((_, el) => $(el).data('value')).get();
    }

    getContactData(type) {
        return {
            name: $(`#${type}_name`).val(),
            email: $(`#${type}_email`).val(),
            phone: $(`#${type}_phone`).val()
        };
    }

    validateForm() {
        const errors = [];
        const data = this.collectFormData();

        if (!data.name.trim()) errors.push('Facility name is required');
        if (!data.organization_name.trim()) errors.push('Organization name is required');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[\+]?[0-9\-\s\(\)]+$/;

        for (const key in data.contacts) {
            const contact = data.contacts[key];
            if (contact.email && !emailRegex.test(contact.email)) {
                errors.push(`Invalid email format for ${this.formatTagLabel(key)} contact`);
            }
            if (contact.phone && !phoneRegex.test(contact.phone)) {
                errors.push(`Invalid phone format for ${this.formatTagLabel(key)} contact`);
            }
        }

        return errors;
    }

    async saveFacility() {
    const errors = this.validateForm();
    if (errors.length) {
        this.showAlert(`Please fix the following errors:\n${errors.join('\n')}`, 'error');
        return;
    }

    const formData = this.collectFormData();
    const $saveBtn = $('#saveBtn').prop('disabled', true).html('<div class="spinner"></div> Saving...');

    try {
        const response = await fetch(`/api/v1/facilities/${this.currentData.ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to save');

        this.originalData = { ...formData };
        this.currentData = { ...formData };

        $('#facilityName').text(formData.name);
        $('#organizationName').text(formData.organization_name);

        this.toggleEditMode(false);
        this.showAlert('Facility profile updated successfully!');
    } catch (err) {
        console.error(err);
        this.showAlert('Failed to save facility profile. Please try again.', 'error');
    } finally {
        $saveBtn.prop('disabled', false).html('Save');
    }
}


    async simulateSaveApiCall(data) {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    cancelEdit() {
        this.populateForm(this.originalData);
        this.toggleEditMode(false);
    }
}
