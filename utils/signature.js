import CryptoJS from 'crypto-js';

/**
 * Generate HMAC signature for request data
 * This should match the backend signature validation
 */

// In production, this should be retrieved securely or derived from user session
const SIGNATURE_SECRET = process.env.NEXT_PUBLIC_SIGNATURE_SECRET || 'default-signature-secret-change-in-production';

/**
 * Generate HMAC signature for request data
 * @param {Object} data - Request data to sign
 * @param {string} secret - Secret key for HMAC
 * @returns {string} - Hex encoded signature (to match backend)
 */
export function generateSignature(data, secret = SIGNATURE_SECRET) {
  // Add timestamp to match backend signature generation
  const timestamp = data.timestamp || Date.now();
  const payload = JSON.stringify(data) + timestamp.toString();
  const signature = CryptoJS.HmacSHA256(payload, secret);
  return CryptoJS.enc.Hex.stringify(signature);
}

/**
 * Create signable data from score submission request
 * @param {Object} requestData - Score submission request data
 * @returns {Object} - Signable data object
 */
export function createSignableData(requestData) {
  const signableData = {
    player: requestData.player,
    scoreAmount: requestData.scoreAmount,
    transactionAmount: requestData.transactionAmount,
    sessionId: requestData.sessionId,
    timestamp: requestData.timestamp
  };
  
  // Remove undefined/null values
  Object.keys(signableData).forEach(key => {
    if (signableData[key] === undefined || signableData[key] === null) {
      delete signableData[key];
    }
  });
  
  return signableData;
}

/**
 * Sign a score submission request
 * @param {Object} requestData - Score submission request data
 * @returns {string} - Base64 encoded signature
 */
export function signScoreSubmissionRequest(requestData) {
  const signableData = createSignableData(requestData);
  return generateSignature(signableData);
}

/**
 * Add signature to request headers
 * @param {Object} requestData - Request data to sign
 * @param {Object} headers - Existing headers object
 * @returns {Object} - Headers with signature added
 */
export function addSignatureToHeaders(requestData, headers = {}) {
  const signature = signScoreSubmissionRequest(requestData);
  return {
    ...headers,
    'X-Request-Signature': signature
  };
}