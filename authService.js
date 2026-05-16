import httpClient from './httpClient.js';

const API_BASE_URL = 'https://auth.bankapp.online/api/mobile';
const API_ENDPOINTS = {
    AUTHENTICATION_COMPLETE: '/authentication/complete',
    AUTHENTICATION_INITIATE: '/authentication/initiate',
    REGISTRATION_COMPLETE: '/registration/complete',
    VERIFICATION_COMPLETE: '/verification/complete/email/',
    VERIFICATION_INITIATE: '/verification/initiate/email',
};

export class AuthServiceError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'AuthServiceError';
        this.code = options.code || 'unknown';
        this.status = options.status || null;
        this.cause = options.cause || null;
    }
}

function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

export function getKnownUser() {
    return getCookie('knownUser') === 'true';
}

async function request(path, options) {
    try {
        const response = await httpClient.fetch(`${API_BASE_URL}${path}`, options);
        return await parseResponse(response);
    } catch (error) {
        if (error instanceof AuthServiceError) {
            throw error;
        }

        if (error instanceof TypeError && String(error.message).includes('fetch')) {
            throw new AuthServiceError('Unable to connect to the server. Please try again.', {
                cause: error,
                code: 'network',
            });
        }

        throw new AuthServiceError('Something went wrong. Please try again.', {
            cause: error,
        });
    }
}

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    let text = '';

    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        text = await response.text();
    }

    if (!response.ok) {
        throw new AuthServiceError(extractMessage(data, text, response.status), {
            code: 'http',
            status: response.status,
        });
    }

    return data ?? text;
}

function extractMessage(data, text, status) {
    if (typeof data === 'string' && data.trim()) {
        return data.trim();
    }

    if (text && text.trim()) {
        return text.trim();
    }

    if (data && typeof data === 'object') {
        for (const key of ['message', 'error', 'detail', 'title']) {
            if (typeof data[key] === 'string' && data[key].trim()) {
                return data[key].trim();
            }
        }
    }

    if (status >= 500) {
        return 'The server is unavailable. Please try again.';
    }

    return 'Request failed. Please try again.';
}

function ensurePasskeySupport(methodName) {
    if (!window.PublicKeyCredential || !navigator.credentials || typeof navigator.credentials[methodName] !== 'function') {
        throw new AuthServiceError('Passkeys are not supported on this device or browser.', {
            code: 'not_supported',
        });
    }
}

function normalizeWebAuthnError(error, kind) {
    if (error instanceof AuthServiceError) {
        return error;
    }

    if (error?.name === 'NotAllowedError') {
        return new AuthServiceError(
            kind === 'registration' ? 'Passkey setup was cancelled.' : 'Passkey login was cancelled.',
            { cause: error, code: 'cancelled' }
        );
    }

    if (error?.name === 'NotSupportedError') {
        return new AuthServiceError('Passkeys are not supported on this device or browser.', {
            cause: error,
            code: 'not_supported',
        });
    }

    return new AuthServiceError(
        kind === 'registration'
            ? 'Failed to create your passkey. Please try again.'
            : 'Failed to authenticate with your passkey. Please try again.',
        { cause: error, code: 'webauthn_failed' }
    );
}

export async function initiateVerification(email) {
    return request(API_ENDPOINTS.VERIFICATION_INITIATE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });
}

export async function completeVerification(email, otpValue) {
    return request(API_ENDPOINTS.VERIFICATION_COMPLETE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otpValue }),
    });
}

export async function initiateAuthentication() {
    return request(API_ENDPOINTS.AUTHENTICATION_INITIATE, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

export async function createRegistrationCredential(registrationOptions) {
    ensurePasskeySupport('create');

    try {
        const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(registrationOptions);
        const credential = await navigator.credentials.create({ publicKey });

        if (!credential) {
            throw new AuthServiceError('Passkey setup was cancelled.', {
                code: 'cancelled',
            });
        }

        return credential.toJSON();
    } catch (error) {
        throw normalizeWebAuthnError(error, 'registration');
    }
}

export async function completeRegistration(sessionId, credentialJSON) {
    const response = await request(API_ENDPOINTS.REGISTRATION_COMPLETE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            RegistrationResponseJSON: JSON.stringify(credentialJSON),
            sessionId,
        }),
    });

    setCookie('knownUser', 'true');
    return response;
}

export async function createAuthenticationCredential(loginOptions) {
    ensurePasskeySupport('get');

    try {
        const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(loginOptions);
        const credential = await navigator.credentials.get({ publicKey });

        if (!credential) {
            throw new AuthServiceError('Passkey login was cancelled.', {
                code: 'cancelled',
            });
        }

        return credential.toJSON();
    } catch (error) {
        throw normalizeWebAuthnError(error, 'authentication');
    }
}

export async function completeAuthentication(sessionId, credentialJSON) {
    const response = await request(API_ENDPOINTS.AUTHENTICATION_COMPLETE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            AuthenticationResponseJSON: JSON.stringify(credentialJSON),
            credentialId: credentialJSON.id,
            sessionId,
        }),
    });

    setCookie('knownUser', 'true');
    return response;
}
