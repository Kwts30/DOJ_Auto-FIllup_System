// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000' 
    : 'https://kwits-doj.onrender.com'; // Your Render deployment URL

// Modal elements
const loadingModal = document.getElementById('loading-modal');
const successModal = document.getElementById('success-modal');
const cancelButton = document.getElementById('cancel-button');
const doneButton = document.getElementById('done-button');
const errorModal = document.getElementById('error-modal');
const closeErrorButton = document.getElementById('close-error-button');
const errorMessage = document.getElementById('error-message');
let currentRequest = null;

// Show loading modal
function showLoadingModal() {
    loadingModal.classList.add('show');
}

// Hide loading modal
function hideLoadingModal() {
    loadingModal.classList.remove('show');
}

// Show success modal
function showSuccessModal() {
    successModal.classList.add('show');
}

// Hide success modal
function hideSuccessModal() {
    successModal.classList.remove('show');
}

function showErrorModal(message) {
    errorMessage.textContent = message;
    errorModal.classList.add('show');
}

function hideErrorModal() {
    errorModal.classList.remove('show');
}

// Event listeners for modal buttons
cancelButton.addEventListener('click', () => {
    if (currentRequest) {
        currentRequest.abort();
        currentRequest = null;
    }
    hideLoadingModal();
});

doneButton.addEventListener('click', () => {
    hideSuccessModal();
});

closeErrorButton.addEventListener('click', hideErrorModal);

document.getElementById('birth-certificate-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Show loading modal
    showLoadingModal();

    // Capture the canvas as a Blob (image file)
    const canvas = document.getElementById('preview-canvas');
    const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    // Prepare form data
    const formData = new FormData();
    formData.append('image', imageBlob, 'preview.png');
    formData.append('name_first', document.getElementById('name_first').value);
    formData.append('name_middle', document.getElementById('name_middle').value);
    formData.append('name_last', document.getElementById('name_last').value);
    formData.append('birth_state', document.getElementById('birth_state').value);
    formData.append('birth_city', document.getElementById('birth_city').value);
    formData.append('state_file_num', document.getElementById('state_file_num').value);
    formData.append('local_reg_num', document.getElementById('local_reg_num').value);

    try {
        // Create AbortController for the request
        const controller = new AbortController();
        currentRequest = controller;

        // Send the form data to the backend
        const response = await fetch(`${API_BASE_URL}/api/birth-certificate/submit`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        let result = {};
        try {
            result = await response.json();
            console.log('Parsed JSON:', result);
        } catch (e) {
            result.message = 'Unknown error (invalid JSON response)';
            console.log('JSON parse error:', e);
        }
        console.log('Response object:', response);
        
        // Hide loading modal
        hideLoadingModal();

        if (response.ok) {
            document.getElementById('success-message').textContent = 'Birth certificate has been successfully processed and sent to Discord!';
            showSuccessModal();
            // Clear all form fields
            document.getElementById('birth-certificate-form').reset();
            drawPreview();
        } else {
            showErrorModal(result.message || 'An error occurred while processing your request.');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
        } else {
            console.error('Error submitting the form:', error);
            showErrorModal('An error occurred while submitting the form.');
        }
        hideLoadingModal();
    } finally {
        currentRequest = null;
    }
});

const form = document.getElementById('birth-certificate-form');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');

// High-quality resolution for A4 at 300dpi: 2480x3508px
const TEMPLATE_WIDTH = 2480; // actual image width
const TEMPLATE_HEIGHT = 3508; // actual image height
const PREVIEW_WIDTH = 600; // preview width for display
const PREVIEW_HEIGHT = 850; // preview height for display
const SCALE_X = TEMPLATE_WIDTH / PREVIEW_WIDTH;
const SCALE_Y = TEMPLATE_HEIGHT / PREVIEW_HEIGHT;

const previewImage = new window.Image();
previewImage.src = 'assets/birthcert.png';

// Add marriage certificate preview image
const marriagePreviewImage = new window.Image();
marriagePreviewImage.src = 'assets/marriagecert.png';

// Track current certificate type
let currentCertificateType = 'birth';

// Handle sidebar button clicks
document.querySelectorAll('.sidebar-menu button').forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        document.querySelectorAll('.sidebar-menu button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show/hide appropriate form
        if (button.textContent === 'Marriage Certificate') {
            document.getElementById('birth-certificate-section').style.display = 'none';
            document.getElementById('marriage-certificate-section').style.display = 'block';
            currentCertificateType = 'marriage';
            previewImage.src = 'assets/marriagecert.png';
        } else {
            document.getElementById('birth-certificate-section').style.display = 'block';
            document.getElementById('marriage-certificate-section').style.display = 'none';
            currentCertificateType = 'birth';
            previewImage.src = 'assets/birthcert.png';
        }
        // Wait for the new image to load before drawing
        previewImage.onload = () => {
            drawPreview();
        };
    });
});

// Load both images initially
previewImage.onload = () => {
    canvas.width = TEMPLATE_WIDTH;
    canvas.height = TEMPLATE_HEIGHT;
    drawPreview();
};

marriagePreviewImage.onload = () => {
    // Just ensure the marriage image is loaded
    console.log('Marriage certificate template loaded');
};

form.addEventListener('input', drawPreview);
document.getElementById('marriage-certificate-form').addEventListener('input', drawPreview);

drawPreview(); // Show placeholders on load

function drawPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the appropriate template
    if (currentCertificateType === 'marriage') {
        ctx.drawImage(marriagePreviewImage, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
    } else {
        ctx.drawImage(previewImage, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
    }

    if (currentCertificateType === 'birth') {
        // Birth certificate fields
        const fields = [
            { id: 'state_file_num', x: 75, y: 229, placeholder: 'SFN', fontStyle: 'bold' },
            { id: 'local_reg_num', x: 460, y: 229, placeholder: 'LRN', fontStyle: 'bold' },
            { id: 'name_first', x: 80, y: 384, placeholder: 'First Name of Child' },
            { id: 'name_middle', x: 245, y: 384, placeholder: 'Middle Name of Child' },
            { id: 'name_last', x: 405, y: 384, placeholder: 'Last Name of Child' },
            { id: 'sex', x: 80, y: 405, placeholder: 'Sex' },
            { id: 'birth_type', x: 135, y: 405, placeholder: 'Type of Birth' },
            { id: 'birth_weight', x: 245, y: 405, placeholder: 'multiple child' },
            { id: 'date_birth', x: 405, y: 405, placeholder: 'date of birth' },
            { id: 'birth_time', x: 499, y: 405, placeholder: 'Time of Birth' },
            { id: 'birth_place', x: 80, y: 427, placeholder: 'Hospital or Facility Name' },
            { id: 'birth_address', x: 325, y: 427, placeholder: 'Street Address' },
            { id: 'birth_city', x: 80, y: 450, placeholder: 'City' },
            { id: 'birth_state', x: 325, y: 450, placeholder: 'State' },
            { id: 'mother_name', x: 80, y: 472, placeholder: 'First Name of Mother' },
            { id: 'mother_middle', x: 245, y: 472, placeholder: 'Middle Name' },
            { id: 'mother_last', x: 345, y: 472, placeholder: 'Last Name' },
            { id: 'mother_birth', x: 545, y: 470, placeholder: 'DOB', fontSize: '24px' },
            { id: 'mother_bop', x: 455, y: 472, placeholder: 'Mother BOP' },
            { id: 'father_name', x: 80, y: 492, placeholder: 'First Name of Father' },
            { id: 'father_middle', x: 245, y: 492, placeholder: 'Middle Name' },
            { id: 'father_last', x: 345, y: 492, placeholder: 'Last Name' },
            { id: 'father_bop', x: 455, y: 492, placeholder: 'Father BOP' },
            { id: 'father_birth', x: 545, y: 492, placeholder: 'DOB', fontSize: '24px' },
            { id: 'issuer_name', x: 80, y: 515, placeholder: 'Full Name of Issuer' },
            { id: 'issuer_occupation', x: 245, y: 515, placeholder: 'Occupation' },
            { id: 'issuer_signature', x: 345, y: 515, placeholder: 'Issuer Signature', fontFamily: 'Segoe Script', fontStyle: 'italic', fontStyle: 'bold' },
            { id: 'registration_date', x: 455, y: 515, placeholder: 'Date of Registration' },
        ];

        fields.forEach(field => {
            let value = document.getElementById(field.id)?.value;
            if (!value) value = field.placeholder;

            // Set font properties
            let fontString = '';
            
            // Add font style if specified
            if (field.fontStyle) {
                fontString += field.fontStyle + ' ';
            }
            
            // Add font size
            if (field.fontSize) {
                fontString += field.fontSize + ' ';
            } else {
                fontString += '48px ';
            }
            
            // Add font family
            if (field.fontFamily) {
                fontString += field.fontFamily;
            } else {
                fontString += 'times-new-roman';
            }
            
            ctx.font = fontString;

            // Scale the coordinates for high resolution
            const scaledX = field.x * SCALE_X;
            const scaledY = field.y * SCALE_Y;

            ctx.fillText(value, scaledX, scaledY);
        });
    } else {
        // Marriage certificate fields (all from template, placeholder coordinates)
        const fields = [
            { id: 'marriage_state_file_num', x: 75, y: 229, placeholder: 'SFN', fontStyle: 'bold' },
            { id: 'marriage_local_reg_num', x: 460, y: 229, placeholder: 'LRN', fontStyle: 'bold' },
            { id: 'groom_first', x: 93, y: 328, placeholder: 'Groom First' },
            { id: 'groom_middle', x: 220, y: 328, placeholder: 'Groom Middle' },
            { id: 'groom_last', x: 348, y: 328, placeholder: 'Groom Last' },
            { id: 'groom_dob', x: 472, y: 328, placeholder: 'DOB' },
            { id: 'groom_address', x: 93, y: 349, placeholder: 'Groom Residence' },
            { id: 'groom_city', x: 265, y: 349, placeholder: 'Groom City' },
            { id: 'groom_birthplace', x: 374, y: 349, placeholder: 'Groom statebirth' },
            { id: 'groom_marriages', x: 471, y: 349, placeholder: 'Groom Marriages' },
            { id: 'groom_occupation', x: 93, y: 370, placeholder: 'Groom Occupation' },
            { id: 'groom_business', x: 265, y: 370, placeholder: 'Groom Business' },
            { id: 'groom_education', x: 435, y: 370, placeholder: 'Groom Education' },
            { id: 'groom_parent1', x: 93, y: 390, placeholder: 'Groom Parent 1' },
            { id: 'groom_parent1_birthplace', x: 250, y: 390, placeholder: 'Birthplace' },
            { id: 'groom_parent2', x: 330, y: 390, placeholder: 'Groom Parent 2' },
            { id: 'groom_parent2_birthplace', x: 483, y: 390, placeholder: 'Birthplace' },
            { id: 'bride_first', x: 93, y: 410, placeholder: 'Bride First' },
            { id: 'bride_middle', x: 220, y: 410, placeholder: 'Bride Middle' },
            { id: 'bride_last', x: 348, y: 410, placeholder: 'Bride Last' },
            { id: 'bride_dob', x: 472, y: 410, placeholder: 'Bride DOB' },
            { id: 'bride_address', x: 93, y: 430, placeholder: 'Bride Address' },
            { id: 'bride_city', x: 265, y: 430, placeholder: 'Bride City' },
            { id: 'bride_birthplace', x: 374, y: 430, placeholder: 'Bride statebirth' },
            { id: 'bride_marriages', x: 471, y: 430, placeholder: 'Bride Marriages' },
            { id: 'bride_occupation', x: 93, y: 450, placeholder: 'Bride Occupation' },
            { id: 'bride_business', x: 265, y: 450, placeholder: 'Bride Business' },
            { id: 'bride_education', x: 435, y: 450, placeholder: 'Bride Education' },
            { id: 'bride_parent1', x: 93, y: 472, placeholder: 'Bride Parent 1' },
            { id: 'bride_parent1_birthplace', x: 250, y: 472, placeholder: 'Birthplace' },
            { id: 'bride_parent2', x: 330, y: 472, placeholder: 'Bride Parent 2' },
            { id: 'bride_parent2_birthplace', x: 483, y: 472, placeholder: 'Birthplace' },
            { id: 'groom_signature', x: 98, y: 513, placeholder: 'Groom Signature', fontFamily: 'Segoe Script', fontStyle: 'italic', fontStyle: 'bold'},
            { id: 'bride_signature', x: 335, y: 513, placeholder: 'Bride Signature', fontFamily: 'Segoe Script', fontStyle: 'italic', fontStyle: 'bold'},
            { id: 'marriage_date', x: 93, y: 533, placeholder: 'Date' },
            { id: 'marriage_place', x: 257, y: 533, placeholder: 'place' },
            { id: 'marriage_city', x: 408, y: 533, placeholder: 'City' },
            { id: 'marriage_state', x: 487, y: 533, placeholder: 'State' },
            { id: 'officiant_name', x: 93, y: 556, placeholder: 'Officiant Name' },
            { id: 'officiant_occupation', x: 339, y: 556, placeholder: 'Officiant Occupation' },
            { id: 'witness1_signature', x: 100, y: 576, placeholder: 'Witness 1 Signature', fontFamily: 'Segoe Script', fontStyle: 'italic', fontStyle: 'bold'},
            { id: 'witness1_name', x: 330, y: 576, placeholder: 'Witness 1 Name' },
            { id: 'witness2_signature', x: 100, y: 598, placeholder: 'Witness 2 Signature', fontFamily: 'Segoe Script', fontStyle: 'italic', fontStyle: 'bold'},
            { id: 'witness2_name', x: 330, y: 598, placeholder: 'Witness 2 Name' },
        ];

        fields.forEach(field => {
            let value = document.getElementById(field.id)?.value;
            if (!value) value = field.placeholder;

            // Set font properties
            let fontString = '';
            if (field.fontStyle) fontString += field.fontStyle + ' ';
            if (field.fontSize) fontString += field.fontSize + ' '; else fontString += '48px ';
            if (field.fontFamily) fontString += field.fontFamily; else fontString += 'times-new-roman';
            ctx.font = fontString;

            // Scale the coordinates for high resolution
            const scaledX = field.x * SCALE_X;
            const scaledY = field.y * SCALE_Y;

            ctx.fillText(value, scaledX, scaledY);
        });
    }
}

// Add marriage certificate form submission handler
document.getElementById('marriage-certificate-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Show loading modal
    showLoadingModal();

    // Capture the canvas as a Blob (image file)
    const canvas = document.getElementById('preview-canvas');
    const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    // Prepare form data
    const formData = new FormData();
    formData.append('image', imageBlob, 'preview.png');
    formData.append('groom_first', document.getElementById('groom_first').value);
    formData.append('groom_middle', document.getElementById('groom_middle').value);
    formData.append('groom_last', document.getElementById('groom_last').value);
    formData.append('bride_first', document.getElementById('bride_first').value);
    formData.append('bride_middle', document.getElementById('bride_middle').value);
    formData.append('bride_last', document.getElementById('bride_last').value);
    formData.append('marriage_state', document.getElementById('marriage_state').value);
    formData.append('marriage_city', document.getElementById('marriage_city').value);
    formData.append('state_file_num', document.getElementById('marriage_state_file_num').value);
    formData.append('local_reg_num', document.getElementById('marriage_local_reg_num').value);

    try {
        // Create AbortController for the request
        const controller = new AbortController();
        currentRequest = controller;

        // Send the form data to the backend
        const response = await fetch(`${API_BASE_URL}/api/marriage-certificate/submit`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        let result = {};
        try {
            result = await response.json();
            console.log('Parsed JSON:', result);
        } catch (e) {
            result.message = 'Unknown error (invalid JSON response)';
            console.log('JSON parse error:', e);
        }
        console.log('Response object:', response);
        
        // Hide loading modal
        hideLoadingModal();

        if (response.ok) {
            document.getElementById('success-message').textContent = 'Marriage certificate has been successfully processed and sent to Discord!';
            showSuccessModal();
            // Clear all form fields
            document.getElementById('marriage-certificate-form').reset();
            drawPreview();
        } else {
            showErrorModal(result.message || 'An error occurred while processing your request.');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
        } else {
            console.error('Error submitting the form:', error);
            showErrorModal('An error occurred while submitting the form.');
        }
        hideLoadingModal();
    } finally {
        currentRequest = null;
    }
});
