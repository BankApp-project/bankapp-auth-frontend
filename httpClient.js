// HTTP Client with X-Correlation-ID support

// Store correlation ID in module scope
let correlationId = null;

/**
 * Get the current correlation ID
 * @returns {string|null} The current correlation ID
 */
export function getCorrelationId() {
    return correlationId;
}

/**
 * Set the correlation ID
 * @param {string} id - The correlation ID to set
 */
export function setCorrelationId(id) {
    correlationId = id;
}

/**
 * Enhanced fetch wrapper that handles X-Correlation-ID automatically
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function fetch(url, options = {}) {
    // Ensure headers object exists
    const headers = new Headers(options.headers || {});

    // Inject correlation ID if available
    if (correlationId) {
        headers.set('X-Correlation-ID', correlationId);
    }

    // Make the request
    const response = await window.fetch(url, {
        ...options,
        headers
    });

    // Extract and store correlation ID from response
    const responseCorrelationId = response.headers.get('X-Correlation-ID');
    if (responseCorrelationId) {
        setCorrelationId(responseCorrelationId);
    }

    return response;
}

// Export as default for convenience
export default {
    fetch,
    getCorrelationId,
    setCorrelationId
};
