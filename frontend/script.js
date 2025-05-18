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
        const response = await fetch('http://127.0.0.1:8000/api/birth-certificate/submit', {
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

previewImage.onload = () => {
    canvas.width = TEMPLATE_WIDTH;
    canvas.height = TEMPLATE_HEIGHT;
    drawPreview();
};

form.addEventListener('input', drawPreview);

drawPreview(); // Show placeholders on load

function drawPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(previewImage, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

    // Field definitions: id, x, y, placeholder, fontSize, fontStyle
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
}
