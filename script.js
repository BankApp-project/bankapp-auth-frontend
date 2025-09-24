// Constants
const API_BASE_URL = 'http://localhost:8080';
const API_ENDPOINTS = {
    VERIFICATION_INITIATE: '/verification/initiate/email',
    VERIFICATION_COMPLETE: '/verification/complete/email/',
    REGISTRATION_COMPLETE: '/registration/complete',
    AUTHENTICATION_COMPLETE: '/authentication/complete',
    AUTHENTICATION_INITIATE: '/authentication/initiate'
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
    OTP_INVALID_LENGTH: 'Verification code must be ' + VALIDATION.OTP_LENGTH + 'digits',
    OTP_SUCCESS: 'Email verification completed successfully!',
    RESEND_SUCCESS: 'Verification code resent successfully!',
    RESEND_FAILED: 'Failed to resend verification code',
    RESEND_ERROR: 'Error resending verification code',
    CONNECTION_ERROR: 'Error: Unable to connect to the server. Make sure the API is running on localhost:8080',
    RESEND_TEXT: "Didn't receive the code? Resend",
    PASSKEY_CREATING: 'Creating your passkey...',
    PASSKEY_FAILED: 'Failed to create passkey. Please try again.',
    PASSKEY_CANCELLED: 'Passkey creation was cancelled.',
    PASSKEY_NOT_SUPPORTED: 'Passkeys are not supported on this device/browser.',
    PASSKEY_AUTHENTICATING: 'Authenticating with your passkey...',
    AUTHENTICATION_SUCCESS: 'Welcome back! You are now logged in.',
    AUTHENTICATION_FAILED: 'Failed to authenticate. Please try again.',
    REGISTRATION_SUCCESS: 'Account created successfully! You are now logged in.',
    REGISTRATION_FAILED: 'Failed to complete registration. Please try again.'
};

const BUTTON_STATES = {
    SENDING: '<span class="loading"></span>Sending...',
    VERIFYING: '<span class="loading"></span>Verifying...',
    RESENDING: 'Resending...',
    SEND_VERIFICATION: 'Send Verification',
    VERIFY_CODE: 'Verify Code',
    CREATING_PASSKEY: '<span class="loading"></span>Creating Passkey...',
    AUTHENTICATING_PASSKEY: '<span class="loading"></span>Authenticating...'
};

// Screen elements
const startScreen = document.getElementById('startScreen');
const emailScreen = document.getElementById('emailScreen');
const otpScreen = document.getElementById('otpScreen');
const registrationWelcomeScreen = document.getElementById('registrationWelcomeScreen');
const loginWelcomeScreen = document.getElementById('loginWelcomeScreen');

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

// Start screen elements
const continueBtn = document.getElementById('continueBtn');


let currentEmail = '';

// Cookie utility functions
function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Continue button functionality
continueBtn.addEventListener('click', async () => {
    console.log('Continue button clicked');
    
    // Check if user is known (has knownUser cookie set to true)
    const knownUser = getCookie('knownUser');
    console.log('knownUser cookie value:', knownUser);
    
    if (knownUser === 'true') {
        console.log('Known user detected, initiating passkey login flow');
        await handleKnownUserLogin();
    } else {
        console.log('Unknown user, proceeding with email verification');
        showEmailScreen();
    }
});

// Handle known user login flow
async function handleKnownUserLogin() {
    console.log('Starting known user login flow');
    
    try {
        // Show loading state on continue button
        continueBtn.disabled = true;
        continueBtn.innerHTML = '<span class="loading"></span>Authenticating...';
        
        // Make API call to authentication/initiate
        console.log('Sending authentication initiate request to:', `${API_BASE_URL}${API_ENDPOINTS.AUTHENTICATION_INITIATE}`);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTHENTICATION_INITIATE}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log('Authentication initiate response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Authentication initiate successful, response data:', data);
            
            // Use the existing passkey login function with the response data
            await handlePasskeyLogin(data.sessionId, data.loginOptions);
        } else {
            const errorText = await response.text();
            console.log('Authentication initiate failed:', response.status, errorText);
            
            // If authentication initiate fails, fall back to email verification
            console.log('Falling back to email verification');
            showEmailScreen();
        }
    } catch (error) {
        console.error('Known user login failed:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.log('Connection error during known user login');
        } else {
            console.log('General error during known user login:', error.message);
        }
        
        // Fall back to email verification on error
        console.log('Falling back to email verification due to error');
        showEmailScreen();
    } finally {
        // Reset button state
        continueBtn.disabled = false;
        continueBtn.innerHTML = 'Continue';
    }
}

// Email form submission
emailForm.addEventListener('submit', async (e) => {
    console.log('Email form submitted');
    e.preventDefault();

    const email = emailInput.value.trim();
    console.log('Email input value:', email);

    if (!email) {
        console.log('Email validation failed: empty email');
        showEmailMessage(MESSAGES.EMAIL_REQUIRED, 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('Email validation failed: invalid format');
        showEmailMessage(MESSAGES.EMAIL_INVALID, 'error');
        return;
    }
    console.log('Email validation passed');

    try {
        // Show loading state
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.innerHTML = BUTTON_STATES.SENDING;
        hideEmailMessage();

        // Make API call
        console.log('Sending verification request to:', `${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`);
        console.log('Request body:', {email: email});
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: email})
        });
        console.log('Verification response status:', response.status);

        if (response.ok) {
            console.log('Verification email sent successfully');
            currentEmail = email;
            console.log('Current email set to:', currentEmail);
            showOtpScreen();
            showEmailMessage(MESSAGES.EMAIL_SENT, 'success');
        } else {
            const errorText = await response.text();
            console.log('Verification request failed:', response.status, errorText);
            showEmailMessage(`Error: ${response.status} - ${errorText || 'Failed to send verification email'}`, 'error');
        }
    } catch (error) {
        console.error('Email form submission error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.log('Connection error detected');
            showEmailMessage(MESSAGES.CONNECTION_ERROR, 'error');
        } else {
            console.log('General error:', error.message);
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
    console.log('OTP form submitted');
    e.preventDefault();

    const otpValue = otpValueInput.value.trim();
    console.log('OTP input value:', otpValue);
    console.log('Current email for verification:', currentEmail);

    if (!otpValue) {
        console.log('OTP validation failed: empty value');
        showOtpMessage(MESSAGES.OTP_REQUIRED, 'error');
        return;
    }

    if (otpValue.length !== VALIDATION.OTP_LENGTH) {
        console.log('OTP validation failed: invalid length', otpValue.length, 'expected:', VALIDATION.OTP_LENGTH);
        showOtpMessage(MESSAGES.OTP_INVALID_LENGTH, 'error');
        return;
    }
    console.log('OTP validation passed');

    try {
        // Show loading state
        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = BUTTON_STATES.VERIFYING;
        hideOtpMessage();

        // Make API call
        console.log('Sending OTP verification request to:', `${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_COMPLETE}`);
        console.log('Request body:', {email: currentEmail, otpValue: otpValue});
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
        console.log('OTP verification response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('OTP verification successful, response data:', data);
            
            if (data.type === 'registration') {
                console.log('Registration flow detected');
                showOtpMessage(MESSAGES.OTP_SUCCESS, 'success');
                setTimeout(async () => {
                    await handlePasskeyRegistration(data.sessionId, data.registrationOptions);
                }, 1000);
            } else if (data.type === 'login') {
                console.log('Login flow detected');
                showOtpMessage(MESSAGES.OTP_SUCCESS, 'success');
                setTimeout(async () => {
                    await handlePasskeyLogin(data.sessionId, data.loginOptions);
                }, 1000);
            } else {
                console.log('Unexpected response type:', data.type);
                showOtpMessage('Unexpected response from server.', 'error');
            }
        } else {
            const errorText = await response.text();
            console.log('OTP verification failed:', response.status, errorText);
            showOtpMessage(`Error: ${response.status} - ${errorText || 'Invalid verification code'}`, 'error');
        }
    } catch (error) {
        console.error('OTP form submission error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.log('Connection error detected');
            showOtpMessage(MESSAGES.CONNECTION_ERROR, 'error');
        } else {
            console.log('General error:', error.message);
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
    console.log('Back button clicked');
    resetToEmailScreen();
});

// Resend link functionality
resendLink.addEventListener('click', async (e) => {
    console.log('Resend link clicked for email:', currentEmail);
    e.preventDefault();

    try {
        resendLink.style.pointerEvents = 'none';
        resendLink.textContent = BUTTON_STATES.RESENDING;

        console.log('Sending resend request to:', `${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email: currentEmail})
        });
        console.log('Resend response status:', response.status);

        if (response.ok) {
            console.log('Resend successful');
            showOtpMessage(MESSAGES.RESEND_SUCCESS, 'success');
        } else {
            console.log('Resend failed');
            showOtpMessage(MESSAGES.RESEND_FAILED, 'error');
        }
    } catch (error) {
        console.error('Resend error:', error);
        showOtpMessage(MESSAGES.RESEND_ERROR, 'error');
    } finally {
        resendLink.style.pointerEvents = 'auto';
        resendLink.textContent = MESSAGES.RESEND_TEXT;
    }
});

// Auto-format OTP input
otpValueInput.addEventListener('input', (e) => {
    // Only allow digits
    const oldValue = e.target.value;
    e.target.value = e.target.value.replace(/\D/g, '');
    console.log('OTP input changed from', oldValue, 'to', e.target.value);
    hideOtpMessage();
});

// Screen management functions
function showEmailScreen() {
    console.log('Switching to email screen');
    startScreen.classList.remove('active');
    emailScreen.classList.add('active');
    emailInput.focus();
}

function showOtpScreen() {
    console.log('Switching to OTP screen for email:', currentEmail);
    emailScreen.classList.remove('active');
    otpScreen.classList.add('active');

    emailConfirmInput.value = currentEmail;
    emailDisplay.textContent = `Code sent to: ${currentEmail}`;
    otpValueInput.focus();

    hideEmailMessage();
    hideOtpMessage();
}

function resetToEmailScreen() {
    console.log('Resetting to email screen');
    otpScreen.classList.remove('active');
    registrationWelcomeScreen.classList.remove('active');
    loginWelcomeScreen.classList.remove('active');
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

// Show registration welcome screen
function showRegistrationWelcomeScreen() {
    console.log('Switching to registration welcome screen');
    startScreen.classList.remove('active');
    emailScreen.classList.remove('active');
    otpScreen.classList.remove('active');
    loginWelcomeScreen.classList.remove('active');
    registrationWelcomeScreen.classList.add('active');
}

// Show login welcome screen
function showLoginWelcomeScreen() {
    console.log('Switching to login welcome screen');
    startScreen.classList.remove('active');
    emailScreen.classList.remove('active');
    otpScreen.classList.remove('active');
    registrationWelcomeScreen.classList.remove('active');
    loginWelcomeScreen.classList.add('active');
}


// Clear email message when user starts typing
emailInput.addEventListener('input', hideEmailMessage);

// Passkey registration function
async function handlePasskeyRegistration(sessionId, registrationOptions) {
    console.log('Starting passkey registration with sessionId:', sessionId);
    console.log('Registration options:', registrationOptions);
    try {
        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            console.log('WebAuthn not supported');
            showOtpMessage(MESSAGES.PASSKEY_NOT_SUPPORTED, 'error');
            return;
        }
        console.log('WebAuthn is supported');

        // Show loading state
        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = BUTTON_STATES.CREATING_PASSKEY;
        showOtpMessage(MESSAGES.PASSKEY_CREATING, 'info');

        // Parse creation options from JSON (handles base64 to ArrayBuffer conversion)
        console.log('Parsing creation options');
        const credentialCreationOptions = PublicKeyCredential.parseCreationOptionsFromJSON(registrationOptions);
        console.log('Parsed creation options:', credentialCreationOptions);

        // Create the credential
        console.log('Creating credential...');
        const credential = await navigator.credentials.create({
            publicKey: credentialCreationOptions
        });
        console.log('Credential created:', credential);

        if (!credential) {
            console.log('Credential creation returned null');
            showOtpMessage(MESSAGES.PASSKEY_CANCELLED, 'error');
            return;
        }

        // Convert credential to JSON format using official method
        console.log('Converting credential to JSON format');
        const registrationResponseJSON = credential.toJSON();
        console.log('Credential JSON:', registrationResponseJSON);

        // Complete registration
        console.log('Completing registration...');
        await completeRegistration(sessionId, registrationResponseJSON);

    } catch (error) {
        console.error('Passkey creation failed:', error);
        
        if (error.name === 'NotAllowedError') {
            console.log('Passkey creation not allowed by user');
            showOtpMessage(MESSAGES.PASSKEY_CANCELLED, 'error');
        } else if (error.name === 'NotSupportedError') {
            console.log('Passkey not supported');
            showOtpMessage(MESSAGES.PASSKEY_NOT_SUPPORTED, 'error');
        } else {
            console.log('General passkey creation error:', error.message);
            showOtpMessage(MESSAGES.PASSKEY_FAILED, 'error');
        }
    } finally {
        // Reset button state
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.innerHTML = BUTTON_STATES.VERIFY_CODE;
    }
}

// Complete registration with the API
async function completeRegistration(sessionId, credentialJSON) {
    console.log('Completing registration with API for sessionId:', sessionId);
    try {
        console.log('Sending registration completion request to:', `${API_BASE_URL}${API_ENDPOINTS.REGISTRATION_COMPLETE}`);
        const requestBody = {
            sessionId: sessionId,
            RegistrationResponseJSON: JSON.stringify(credentialJSON)
        };
        console.log('Request body:', requestBody);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REGISTRATION_COMPLETE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        console.log('Registration completion response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Registration completed successfully, response data:', data);
            handleRegistrationSuccess(data.accessToken, data.refreshToken);
        } else {
            const errorText = await response.text();
            console.log('Registration completion failed:', response.status, errorText);
            showOtpMessage(`Registration failed: ${errorText || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Registration completion failed:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.log('Connection error during registration completion');
            showOtpMessage(MESSAGES.CONNECTION_ERROR, 'error');
        } else {
            console.log('General registration completion error:', error.message);
            showOtpMessage(MESSAGES.REGISTRATION_FAILED, 'error');
        }
    }
}

// Handle successful registration
function handleRegistrationSuccess(accessToken, refreshToken) {
    // Store tokens (you might want to use sessionStorage or localStorage)
    console.log('Registration successful. Tokens received:', { accessToken, refreshToken });
    console.log('Handling registration success');

    // Set knownUser cookie
    setCookie('knownUser', 'true');
    console.log('knownUser cookie set to true');

    showOtpMessage(MESSAGES.REGISTRATION_SUCCESS, 'success');

    // Show registration welcome screen after successful registration
    console.log('Setting timeout for registration welcome screen after', VALIDATION.REDIRECT_DELAY, 'ms');
    setTimeout(() => {
        console.log('Showing registration welcome screen after successful registration');
        showRegistrationWelcomeScreen();
    }, VALIDATION.REDIRECT_DELAY);
}

// Passkey login function
async function handlePasskeyLogin(sessionId, loginOptions) {
    console.log('Starting passkey login with sessionId:', sessionId);
    console.log('Login options:', loginOptions);
    try {
        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            console.log('WebAuthn not supported');
            showOtpMessage(MESSAGES.PASSKEY_NOT_SUPPORTED, 'error');
            return;
        }
        console.log('WebAuthn is supported');

        // Show loading state
        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = BUTTON_STATES.AUTHENTICATING_PASSKEY;
        showOtpMessage(MESSAGES.PASSKEY_AUTHENTICATING, 'info');

        // Parse request options from JSON (handles base64 to ArrayBuffer conversion)
        console.log('Parsing request options');
        const credentialRequestOptions = PublicKeyCredential.parseRequestOptionsFromJSON(loginOptions);
        console.log('Parsed request options:', credentialRequestOptions);

        // Get the credential
        console.log('Getting credential...');
        const credential = await navigator.credentials.get({
            publicKey: credentialRequestOptions
        });
        console.log('Credential retrieved:', credential);

        if (!credential) {
            console.log('Credential retrieval returned null');
            showOtpMessage(MESSAGES.PASSKEY_CANCELLED, 'error');
            return;
        }

        // Convert credential to JSON format using official method
        console.log('Converting credential to JSON format');
        const authenticationResponseJSON = credential.toJSON();
        console.log('Authentication response JSON:', authenticationResponseJSON);

        // Complete authentication
        console.log('Completing authentication...');
        await completeAuthentication(sessionId, authenticationResponseJSON);

    } catch (error) {
        console.error('Passkey authentication failed:', error);
        
        let errorMessage;
        if (error.name === 'NotAllowedError') {
            console.log('Passkey authentication not allowed by user');
            errorMessage = MESSAGES.PASSKEY_CANCELLED;
        } else if (error.name === 'NotSupportedError') {
            console.log('Passkey not supported');
            errorMessage = MESSAGES.PASSKEY_NOT_SUPPORTED;
        } else {
            console.log('General passkey authentication error:', error.message);
            errorMessage = MESSAGES.PASSKEY_FAILED;
        }
        
        // Show error message on email screen after redirecting if we're on start screen, otherwise on OTP screen
        if (startScreen.classList.contains('active')) {
            console.log('Fallback to email flow after passkey error');
            showEmailScreen();
            showEmailMessage(errorMessage, 'error');
        } else {
            showOtpMessage(errorMessage, 'error');
        }
    } finally {
        // Reset button state
        if (otpSubmitBtn) {
            otpSubmitBtn.disabled = false;
            otpSubmitBtn.innerHTML = BUTTON_STATES.VERIFY_CODE;
        }
        // Reset continue button state if we're on start screen
        if (startScreen.classList.contains('active')) {
            continueBtn.disabled = false;
            continueBtn.innerHTML = 'Continue';
        }
    }
}

// Complete authentication with the API
async function completeAuthentication(sessionId, credentialResponse) {
    console.log('Completing authentication with API for sessionId:', sessionId);
    try {
        console.log('Sending authentication completion request to:', `${API_BASE_URL}${API_ENDPOINTS.AUTHENTICATION_COMPLETE}`);
        const requestBody = {
            sessionId: sessionId,
            AuthenticationResponseJSON: JSON.stringify(credentialResponse),
            credentialId: credentialResponse.id
        };
        console.log('Request body:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTHENTICATION_COMPLETE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        console.log('Authentication completion response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Authentication completed successfully, response data:', data);
            handleLoginSuccess(data.accessToken, data.refreshToken);
        } else {
            const errorText = await response.text();
            console.log('Authentication completion failed:', response.status, errorText);
            showOtpMessage(`Authentication failed: ${errorText || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Authentication completion failed:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.log('Connection error during authentication completion');
            showOtpMessage(MESSAGES.CONNECTION_ERROR, 'error');
        } else {
            console.log('General authentication completion error:', error.message);
            showOtpMessage(MESSAGES.AUTHENTICATION_FAILED, 'error');
        }
    }
}

// Handle successful login
function handleLoginSuccess(accessToken, refreshToken) {
    // Store tokens (you might want to use sessionStorage or localStorage)
    console.log('Login successful. Tokens received:', { accessToken, refreshToken });
    console.log('Handling login success');
    
    // Set knownUser cookie
    setCookie('knownUser', 'true');
    console.log('knownUser cookie set to true');
    
    showOtpMessage(MESSAGES.AUTHENTICATION_SUCCESS, 'success');
    
    // Show login welcome screen after successful login
    console.log('Showing login welcome screen after successful login');
    showLoginWelcomeScreen();
}


