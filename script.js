// Constants
const API_BASE_URL = 'http://localhost:8080';
const API_ENDPOINTS = {
    VERIFICATION_INITIATE: '/verification/initiate/email',
    VERIFICATION_COMPLETE: '/verification/complete/email/'
};

const VALIDATION = {
    OTP_LENGTH: 6,
    REDIRECT_DELAY: 2000
};

const MESSAGES = {
    EMAIL_REQUIRED: 'Please enter an email address',
    EMAIL_INVALID: 'Please enter a valid email address',
    EMAIL_SENT: 'Verification email sent successfully!',
    OTP_REQUIRED: 'Please enter the verification code',
    OTP_INVALID_LENGTH: 'Verification code must be 6 digits',
    OTP_SUCCESS: 'Email verification completed successfully!',
    RESEND_SUCCESS: 'Verification code resent successfully!',
    RESEND_FAILED: 'Failed to resend verification code',
    RESEND_ERROR: 'Error resending verification code',
    CONNECTION_ERROR: 'Error: Unable to connect to the server. Make sure the API is running on localhost:8080',
    RESEND_TEXT: "Didn't receive the code? Resend"
};

const BUTTON_STATES = {
    SENDING: '<span class="loading"></span>Sending...',
    VERIFYING: '<span class="loading"></span>Verifying...',
    RESENDING: 'Resending...',
    SEND_VERIFICATION: 'Send Verification',
    VERIFY_CODE: 'Verify Code'
};

// Screen elements
const emailScreen = document.getElementById('emailScreen');
const otpScreen = document.getElementById('otpScreen');

// Email form elements
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('email');
const emailSubmitBtn = document.getElementById('emailSubmitBtn');
const emailMessageDiv = document.getElementById('emailMessage');

// OTP form elements
const otpForm = document.getElementById('otpForm');
const emailConfirmInput = document.getElementById('emailConfirm');
const otpValueInput = document.getElementById('otpValue');
const otpSubmitBtn = document.getElementById('otpSubmitBtn');
const otpMessageDiv = document.getElementById('otpMessage');
const emailDisplay = document.getElementById('emailDisplay');
const backBtn = document.getElementById('backBtn');
const resendLink = document.getElementById('resendLink');

let currentEmail = '';

// Email form submission
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showEmailMessage(MESSAGES.EMAIL_REQUIRED, 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showEmailMessage(MESSAGES.EMAIL_INVALID, 'error');
        return;
    }

    try {
        // Show loading state
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.innerHTML = BUTTON_STATES.SENDING;
        hideEmailMessage();

        // Make API call
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: email})
        });

        if (response.ok) {
            currentEmail = email;
            showOtpScreen();
            showEmailMessage(MESSAGES.EMAIL_SENT, 'success');
        } else {
            const errorText = await response.text();
            showEmailMessage(`Error: ${response.status} - ${errorText || 'Failed to send verification email'}`, 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showEmailMessage(MESSAGES.CONNECTION_ERROR, 'error');
        } else {
            showEmailMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        emailSubmitBtn.disabled = false;
        emailSubmitBtn.innerHTML = BUTTON_STATES.SEND_VERIFICATION;
    }
});

// OTP form submission
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otpValue = otpValueInput.value.trim();

    if (!otpValue) {
        showOtpMessage(MESSAGES.OTP_REQUIRED, 'error');
        return;
    }

    if (otpValue.length !== VALIDATION.OTP_LENGTH) {
        showOtpMessage(MESSAGES.OTP_INVALID_LENGTH, 'error');
        return;
    }

    try {
        // Show loading state
        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = BUTTON_STATES.VERIFYING;
        hideOtpMessage();

        // Make API call
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_COMPLETE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentEmail,
                otpValue: otpValue
            })
        });

        if (response.ok) {
            showOtpMessage(MESSAGES.OTP_SUCCESS, 'success');
            // You might want to redirect or show a success screen here
            setTimeout(() => {
                resetToEmailScreen();
            }, VALIDATION.REDIRECT_DELAY);
        } else {
            const errorText = await response.text();
            showOtpMessage(`Error: ${response.status} - ${errorText || 'Invalid verification code'}`, 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showOtpMessage(MESSAGES.CONNECTION_ERROR, 'error');
        } else {
            showOtpMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.innerHTML = BUTTON_STATES.VERIFY_CODE;
    }
});

// Back button functionality
backBtn.addEventListener('click', () => {
    resetToEmailScreen();
});

// Resend link functionality
resendLink.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
        resendLink.style.pointerEvents = 'none';
        resendLink.textContent = BUTTON_STATES.RESENDING;

        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: currentEmail})
        });

        if (response.ok) {
            showOtpMessage(MESSAGES.RESEND_SUCCESS, 'success');
        } else {
            showOtpMessage(MESSAGES.RESEND_FAILED, 'error');
        }
    } catch (error) {
        showOtpMessage(MESSAGES.RESEND_ERROR, 'error');
    } finally {
        resendLink.style.pointerEvents = 'auto';
        resendLink.textContent = MESSAGES.RESEND_TEXT;
    }
});

// Auto-format OTP input
otpValueInput.addEventListener('input', (e) => {
    // Only allow digits
    e.target.value = e.target.value.replace(/\D/g, '');
    hideOtpMessage();
});

// Screen management functions
function showOtpScreen() {
    emailScreen.classList.remove('active');
    otpScreen.classList.add('active');

    emailConfirmInput.value = currentEmail;
    emailDisplay.textContent = `Code sent to: ${currentEmail}`;
    otpValueInput.focus();

    hideEmailMessage();
    hideOtpMessage();
}

function resetToEmailScreen() {
    otpScreen.classList.remove('active');
    emailScreen.classList.add('active');

    // Reset OTP form
    otpForm.reset();
    currentEmail = '';

    hideOtpMessage();
    hideEmailMessage();
}

// Message functions
function showEmailMessage(text, type) {
    emailMessageDiv.textContent = text;
    emailMessageDiv.className = `message ${type}`;
    emailMessageDiv.style.display = 'block';
}

function hideEmailMessage() {
    emailMessageDiv.style.display = 'none';
}

function showOtpMessage(text, type) {
    otpMessageDiv.textContent = text;
    otpMessageDiv.className = `message ${type}`;
    otpMessageDiv.style.display = 'block';
}

function hideOtpMessage() {
    otpMessageDiv.style.display = 'none';
}

// Clear email message when user starts typing
emailInput.addEventListener('input', hideEmailMessage);