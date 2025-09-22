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
        showEmailMessage('Please enter an email address', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showEmailMessage('Please enter a valid email address', 'error');
        return;
    }

    try {
        // Show loading state
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.innerHTML = '<span class="loading"></span>Sending...';
        hideEmailMessage();

        // Make API call
        const response = await fetch('http://localhost:8080/verification/initiate/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: email})
        });

        if (response.ok) {
            currentEmail = email;
            showOtpScreen();
            showEmailMessage('Verification email sent successfully!', 'success');
        } else {
            const errorText = await response.text();
            showEmailMessage(`Error: ${response.status} - ${errorText || 'Failed to send verification email'}`, 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showEmailMessage('Error: Unable to connect to the server. Make sure the API is running on localhost:8080', 'error');
        } else {
            showEmailMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        emailSubmitBtn.disabled = false;
        emailSubmitBtn.innerHTML = 'Send Verification';
    }
});

// OTP form submission
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otpValue = otpValueInput.value.trim();

    if (!otpValue) {
        showOtpMessage('Please enter the verification code', 'error');
        return;
    }

    if (otpValue.length !== 6) {
        showOtpMessage('Verification code must be 6 digits', 'error');
        return;
    }

    try {
        // Show loading state
        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = '<span class="loading"></span>Verifying...';
        hideOtpMessage();

        // Make API call
        const response = await fetch('http://localhost:8080/verification/complete/email/', {
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
            showOtpMessage('Email verification completed successfully!', 'success');
            // You might want to redirect or show a success screen here
            setTimeout(() => {
                resetToEmailScreen();
            }, 2000);
        } else {
            const errorText = await response.text();
            showOtpMessage(`Error: ${response.status} - ${errorText || 'Invalid verification code'}`, 'error');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showOtpMessage('Error: Unable to connect to the server. Make sure the API is running on localhost:8080', 'error');
        } else {
            showOtpMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.innerHTML = 'Verify Code';
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
        resendLink.textContent = 'Resending...';

        const response = await fetch('http://localhost:8080/verification/initiate/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: currentEmail})
        });

        if (response.ok) {
            showOtpMessage('Verification code resent successfully!', 'success');
        } else {
            showOtpMessage('Failed to resend verification code', 'error');
        }
    } catch (error) {
        showOtpMessage('Error resending verification code', 'error');
    } finally {
        resendLink.style.pointerEvents = 'auto';
        resendLink.textContent = "Didn't receive the code? Resend";
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