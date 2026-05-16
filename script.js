import httpClient from './httpClient.js';

const API_BASE_URL = 'https://auth.bankapp.online/api/mobile';
const API_ENDPOINTS = {
    VERIFICATION_INITIATE: '/verification/initiate/email',
    VERIFICATION_COMPLETE: '/verification/complete/email/',
    REGISTRATION_COMPLETE: '/registration/complete',
    AUTHENTICATION_COMPLETE: '/authentication/complete',
    AUTHENTICATION_INITIATE: '/authentication/initiate'
};

const VALIDATION = {
    OTP_LENGTH: 6
};

const MESSAGES = {
    EMAIL_REQUIRED: 'Your email is invalid',
    EMAIL_INVALID: 'Your email is invalid',
    EMAIL_SENT: 'Verification code sent.',
    OTP_REQUIRED: 'Code must be 6 digits.',
    OTP_INVALID_LENGTH: 'Code must be 6 digits.',
    OTP_SUCCESS: 'Email verification completed successfully.',
    RESEND_SUCCESS: 'Verification code resent successfully.',
    RESEND_FAILED: 'Failed to resend verification code.',
    RESEND_ERROR: 'Error resending verification code.',
    CONNECTION_ERROR: 'Unable to connect to the server. Please try again.',
    PASSKEY_CREATING: 'Creating your passkey...',
    PASSKEY_FAILED: 'Failed to create passkey. Please try again.',
    PASSKEY_CANCELLED: 'Passkey creation was cancelled.',
    PASSKEY_NOT_SUPPORTED: 'Passkeys are not supported on this device/browser.',
    PASSKEY_AUTHENTICATING: 'Authenticating with your passkey...',
    AUTHENTICATION_SUCCESS: 'Welcome back. You are now logged in.',
    AUTHENTICATION_FAILED: 'Failed to authenticate. Please try again.',
    REGISTRATION_SUCCESS: 'Account created successfully. You are now logged in.',
    REGISTRATION_FAILED: 'Failed to complete registration. Please try again.'
};

const BUTTON_STATES = {
    SENDING: '<span class="loading"></span>Sending...',
    VERIFYING: '<span class="loading"></span>Verifying...',
    RESENDING: 'Resending...',
    SEND_CODE: 'Send code',
    CONTINUE: 'Continue',
    LOGIN: 'Log in',
    CREATING_PASSKEY: '<span class="loading"></span>Creating Passkey...',
    AUTHENTICATING_PASSKEY: '<span class="loading"></span>Authenticating...'
};

const screens = {
    start: document.getElementById('startScreen'),
    email: document.getElementById('emailScreen'),
    otp: document.getElementById('otpScreen'),
    registrationSuccess: document.getElementById('registrationWelcomeScreen'),
    loginSuccess: document.getElementById('loginWelcomeScreen')
};

const continueBtn = document.getElementById('continueBtn');
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('email');
const emailSubmitBtn = document.getElementById('emailSubmitBtn');
const emailMessageDiv = document.getElementById('emailMessage');
const emailGroup = document.getElementById('emailGroup');
const emailFieldError = document.getElementById('emailFieldError');
const otpForm = document.getElementById('otpForm');
const emailConfirmInput = document.getElementById('emailConfirm');
const otpValueInput = document.getElementById('otpValue');
const otpSubmitBtn = document.getElementById('otpSubmitBtn');
const otpMessageDiv = document.getElementById('otpMessage');
const emailDisplay = document.getElementById('emailDisplay');
const backBtn = document.getElementById('backBtn');
const resendLink = document.getElementById('resendLink');
const otpDigits = Array.from(document.querySelectorAll('.otp-digit'));

let currentEmail = '';

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

function setActiveScreen(screenName, activeScreen) {
    Object.values(screens).forEach((screen) => {
        screen.classList.toggle('active', screen === activeScreen);
    });
    document.body.dataset.screen = screenName;
}

function isEmailValid(email) {
    const normalizedEmail = email.trim();
    const [localPart] = normalizedEmail.split('@');
    const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

    return (
        normalizedEmail.length <= 254 &&
        !normalizedEmail.includes('..') &&
        !localPart.startsWith('.') &&
        !localPart.endsWith('.') &&
        emailPattern.test(normalizedEmail)
    );
}

function setEmailFieldError(message) {
    emailGroup.classList.add('invalid');
    emailFieldError.textContent = message;
    emailFieldError.hidden = false;
    emailSubmitBtn.disabled = true;
}

function clearEmailFieldError() {
    emailGroup.classList.remove('invalid');
    emailFieldError.textContent = '';
    emailFieldError.hidden = true;
    emailSubmitBtn.disabled = false;
}

function showEmailMessage(text, type) {
    emailMessageDiv.textContent = text;
    emailMessageDiv.className = `message ${type}`;
    emailMessageDiv.style.display = 'block';
}

function hideEmailMessage() {
    emailMessageDiv.style.display = 'none';
    emailMessageDiv.textContent = '';
}

function setOtpErrorState(hasError) {
    otpDigits.forEach((input) => input.classList.toggle('error', hasError));
}

function showOtpMessage(text, type) {
    otpMessageDiv.textContent = text;
    otpMessageDiv.className = `message otp-message ${type}`;
    otpMessageDiv.style.display = 'block';
    setOtpErrorState(type === 'error');
}

function showAuthenticationError(message) {
    if (screens.start.classList.contains('active')) {
        showEmailScreen();
        showEmailMessage(message, 'error');
        return;
    }

    showOtpMessage(message, 'error');
}

function hideOtpMessage() {
    otpMessageDiv.style.display = 'none';
    otpMessageDiv.textContent = '';
    setOtpErrorState(false);
}

function getOtpValue() {
    return otpDigits.map((input) => input.value).join('');
}

function syncOtpValue() {
    const otpValue = getOtpValue();
    otpValueInput.value = otpValue;
    otpSubmitBtn.disabled = otpValue.length !== VALIDATION.OTP_LENGTH;
}

function clearOtpInputs() {
    otpDigits.forEach((input) => {
        input.value = '';
        input.classList.remove('error');
    });
    syncOtpValue();
}

function fillOtpDigits(value, startIndex = 0) {
    const digits = value.replace(/\D/g, '').slice(0, VALIDATION.OTP_LENGTH - startIndex);
    digits.split('').forEach((digit, offset) => {
        const input = otpDigits[startIndex + offset];
        if (input) input.value = digit;
    });
    syncOtpValue();

    const nextIndex = Math.min(startIndex + digits.length, VALIDATION.OTP_LENGTH - 1);
    otpDigits[nextIndex]?.focus();
}

function extractResponseMessage(text, fallback) {
    return text && text.trim() ? text.trim() : fallback;
}

async function sendVerificationCode(email) {
    return httpClient.fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_INITIATE}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    });
}

continueBtn.addEventListener('click', async () => {
    const knownUser = getCookie('knownUser');

    if (knownUser === 'true') {
        await handleKnownUserLogin();
        return;
    }

    showEmailScreen();
});

async function handleKnownUserLogin() {
    try {
        continueBtn.disabled = true;
        continueBtn.innerHTML = BUTTON_STATES.AUTHENTICATING_PASSKEY;

        const response = await httpClient.fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTHENTICATION_INITIATE}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            showEmailScreen();
            return;
        }

        const data = await response.json();
        await handlePasskeyLogin(data.sessionId, data.loginOptions);
    } catch (error) {
        console.error('Known user login failed:', error);
        showEmailScreen();
    } finally {
        if (screens.start.classList.contains('active')) {
            continueBtn.disabled = false;
            continueBtn.innerHTML = BUTTON_STATES.LOGIN;
        }
    }
}

emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email || !isEmailValid(email)) {
        setEmailFieldError(MESSAGES.EMAIL_INVALID);
        hideEmailMessage();
        return;
    }

    try {
        hideEmailMessage();
        clearEmailFieldError();
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.innerHTML = BUTTON_STATES.SENDING;

        const response = await sendVerificationCode(email);

        if (!response.ok) {
            const errorText = await response.text();
            showEmailMessage(`Error: ${response.status} - ${extractResponseMessage(errorText, 'Failed to send verification email')}`, 'error');
            return;
        }

        currentEmail = email;
        showOtpScreen();
    } catch (error) {
        console.error('Email form submission error:', error);
        showEmailMessage(error instanceof TypeError ? MESSAGES.CONNECTION_ERROR : `Error: ${error.message}`, 'error');
    } finally {
        emailSubmitBtn.disabled = false;
        emailSubmitBtn.innerHTML = BUTTON_STATES.SEND_CODE;
    }
});

otpForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const otpValue = getOtpValue();

    if (otpValue.length !== VALIDATION.OTP_LENGTH) {
        showOtpMessage(MESSAGES.OTP_INVALID_LENGTH, 'error');
        return;
    }

    try {
        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = BUTTON_STATES.VERIFYING;
        hideOtpMessage();

        const response = await httpClient.fetch(`${API_BASE_URL}${API_ENDPOINTS.VERIFICATION_COMPLETE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: currentEmail,
                otpValue
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            showOtpMessage(extractResponseMessage(errorText, 'invalid code'), 'error');
            return;
        }

        const data = await response.json();
        showOtpMessage(MESSAGES.OTP_SUCCESS, 'success');

        setTimeout(async () => {
            if (data.type === 'registration') {
                await handlePasskeyRegistration(data.sessionId, data.registrationOptions);
                return;
            }

            if (data.type === 'login') {
                await handlePasskeyLogin(data.sessionId, data.loginOptions);
                return;
            }

            showOtpMessage('Unexpected response from server.', 'error');
        }, 1000);
    } catch (error) {
        console.error('OTP form submission error:', error);
        showOtpMessage(error instanceof TypeError ? MESSAGES.CONNECTION_ERROR : `Error: ${error.message}`, 'error');
    } finally {
        if (screens.otp.classList.contains('active')) {
            otpSubmitBtn.innerHTML = BUTTON_STATES.CONTINUE;
            syncOtpValue();
        }
    }
});

backBtn.addEventListener('click', resetToEmailScreen);

resendLink.addEventListener('click', async () => {
    if (!currentEmail) {
        showOtpMessage('Enter your email again to resend the code.', 'error');
        return;
    }

    try {
        resendLink.disabled = true;
        resendLink.textContent = BUTTON_STATES.RESENDING;
        const response = await sendVerificationCode(currentEmail);

        if (!response.ok) {
            const errorText = await response.text();
            showOtpMessage(extractResponseMessage(errorText, MESSAGES.RESEND_FAILED), 'error');
            return;
        }

        showOtpMessage(MESSAGES.RESEND_SUCCESS, 'info');
    } catch (error) {
        console.error('Resend failed:', error);
        showOtpMessage(MESSAGES.RESEND_ERROR, 'error');
    } finally {
        resendLink.disabled = false;
        resendLink.textContent = 'Resend';
    }
});

otpDigits.forEach((input, index) => {
    input.addEventListener('input', (event) => {
        const value = event.target.value.replace(/\D/g, '');
        event.target.value = '';

        if (value.length > 0) {
            fillOtpDigits(value, index);
        } else {
            syncOtpValue();
        }

        hideOtpMessage();
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && input.value === '' && index > 0) {
            otpDigits[index - 1].focus();
            otpDigits[index - 1].value = '';
            syncOtpValue();
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            otpDigits[index - 1].focus();
        }

        if (event.key === 'ArrowRight' && index < otpDigits.length - 1) {
            event.preventDefault();
            otpDigits[index + 1].focus();
        }
    });

    input.addEventListener('paste', (event) => {
        event.preventDefault();
        const pastedValue = event.clipboardData.getData('text');
        fillOtpDigits(pastedValue, index);
        hideOtpMessage();
    });
});

emailInput.addEventListener('input', () => {
    clearEmailFieldError();
    hideEmailMessage();
});

function showEmailScreen() {
    setActiveScreen('email', screens.email);
    emailInput.focus();
}

function showOtpScreen() {
    setActiveScreen('otp', screens.otp);
    emailConfirmInput.value = currentEmail;
    emailDisplay.textContent = `Code sent to: ${currentEmail}`;
    clearOtpInputs();
    hideEmailMessage();
    hideOtpMessage();
    otpDigits[0]?.focus();
}

function resetToEmailScreen() {
    setActiveScreen('email', screens.email);
    otpForm.reset();
    clearOtpInputs();
    currentEmail = '';
    hideOtpMessage();
    hideEmailMessage();
    emailInput.focus();
}

function showRegistrationWelcomeScreen() {
    setActiveScreen('success', screens.registrationSuccess);
}

function showLoginWelcomeScreen() {
    setActiveScreen('success', screens.loginSuccess);
}

async function handlePasskeyRegistration(sessionId, registrationOptions) {
    try {
        if (!window.PublicKeyCredential) {
            showOtpMessage(MESSAGES.PASSKEY_NOT_SUPPORTED, 'error');
            return;
        }

        otpSubmitBtn.disabled = true;
        otpSubmitBtn.innerHTML = BUTTON_STATES.CREATING_PASSKEY;
        showOtpMessage(MESSAGES.PASSKEY_CREATING, 'info');

        const credentialCreationOptions = PublicKeyCredential.parseCreationOptionsFromJSON(registrationOptions);
        const credential = await navigator.credentials.create({
            publicKey: credentialCreationOptions
        });

        if (!credential) {
            showOtpMessage(MESSAGES.PASSKEY_CANCELLED, 'error');
            return;
        }

        await completeRegistration(sessionId, credential.toJSON());
    } catch (error) {
        console.error('Passkey creation failed:', error);

        if (error.name === 'NotAllowedError') {
            showOtpMessage(MESSAGES.PASSKEY_CANCELLED, 'error');
        } else if (error.name === 'NotSupportedError') {
            showOtpMessage(MESSAGES.PASSKEY_NOT_SUPPORTED, 'error');
        } else {
            showOtpMessage(MESSAGES.PASSKEY_FAILED, 'error');
        }
    } finally {
        if (screens.otp.classList.contains('active')) {
            otpSubmitBtn.innerHTML = BUTTON_STATES.CONTINUE;
            syncOtpValue();
        }
    }
}

async function completeRegistration(sessionId, credentialJSON) {
    try {
        const response = await httpClient.fetch(`${API_BASE_URL}${API_ENDPOINTS.REGISTRATION_COMPLETE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId,
                RegistrationResponseJSON: JSON.stringify(credentialJSON)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            showOtpMessage(`Registration failed: ${extractResponseMessage(errorText, 'Unknown error')}`, 'error');
            return;
        }

        const data = await response.json();
        handleRegistrationSuccess(data.accessToken, data.refreshToken);
    } catch (error) {
        console.error('Registration completion failed:', error);
        showOtpMessage(error instanceof TypeError ? MESSAGES.CONNECTION_ERROR : MESSAGES.REGISTRATION_FAILED, 'error');
    }
}

function handleRegistrationSuccess(accessToken, refreshToken) {
    console.log('Registration successful. Tokens received:', { accessToken, refreshToken });
    setCookie('knownUser', 'true');
    showRegistrationWelcomeScreen();
}

async function handlePasskeyLogin(sessionId, loginOptions) {
    const startedFromStartScreen = screens.start.classList.contains('active');

    try {
        if (!window.PublicKeyCredential) {
            throw new Error(MESSAGES.PASSKEY_NOT_SUPPORTED);
        }

        if (!startedFromStartScreen) {
            otpSubmitBtn.disabled = true;
            otpSubmitBtn.innerHTML = BUTTON_STATES.AUTHENTICATING_PASSKEY;
            showOtpMessage(MESSAGES.PASSKEY_AUTHENTICATING, 'info');
        }

        const credentialRequestOptions = PublicKeyCredential.parseRequestOptionsFromJSON(loginOptions);
        const credential = await navigator.credentials.get({
            publicKey: credentialRequestOptions
        });

        if (!credential) {
            throw new Error(MESSAGES.PASSKEY_CANCELLED);
        }

        await completeAuthentication(sessionId, credential.toJSON());
    } catch (error) {
        console.error('Passkey authentication failed:', error);

        let errorMessage = MESSAGES.PASSKEY_FAILED;
        if (error.name === 'NotAllowedError') {
            errorMessage = MESSAGES.PASSKEY_CANCELLED;
        } else if (error.name === 'NotSupportedError' || error.message === MESSAGES.PASSKEY_NOT_SUPPORTED) {
            errorMessage = MESSAGES.PASSKEY_NOT_SUPPORTED;
        }

        if (startedFromStartScreen) {
            showEmailScreen();
            showEmailMessage(errorMessage, 'error');
        } else {
            showOtpMessage(errorMessage, 'error');
        }
    } finally {
        if (screens.otp.classList.contains('active')) {
            otpSubmitBtn.innerHTML = BUTTON_STATES.CONTINUE;
            syncOtpValue();
        }

        if (screens.start.classList.contains('active')) {
            continueBtn.disabled = false;
            continueBtn.innerHTML = BUTTON_STATES.LOGIN;
        }
    }
}

async function completeAuthentication(sessionId, credentialResponse) {
    try {
        const response = await httpClient.fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTHENTICATION_COMPLETE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId,
                AuthenticationResponseJSON: JSON.stringify(credentialResponse),
                credentialId: credentialResponse.id
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            showAuthenticationError(`Authentication failed: ${extractResponseMessage(errorText, 'Unknown error')}`);
            return;
        }

        const data = await response.json();
        handleLoginSuccess(data.accessToken, data.refreshToken);
    } catch (error) {
        console.error('Authentication completion failed:', error);
        showAuthenticationError(error instanceof TypeError ? MESSAGES.CONNECTION_ERROR : MESSAGES.AUTHENTICATION_FAILED);
    }
}

function handleLoginSuccess(accessToken, refreshToken) {
    console.log('Login successful. Tokens received:', { accessToken, refreshToken });
    setCookie('knownUser', 'true');
    showLoginWelcomeScreen();
}

setActiveScreen('start', screens.start);
syncOtpValue();
