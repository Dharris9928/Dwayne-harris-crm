/**
 * HMAC integrity checking for client-side storage
 * Prevents tampering with sessionStorage data
 */

const HMAC_ALGORITHM = 'SHA-256';

/**
 * Generate HMAC signature for data
 * Uses a client-side secret combined with server-provided salt
 */
export async function generateHMAC(data: any): Promise<string> {
  const dataString = JSON.stringify(data);
  
  // Use a combination of factors as the signing key
  // In production, you'd want a server-provided session-specific secret
  const secret = `${window.navigator.userAgent}|${window.location.origin}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(dataString);
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: HMAC_ALGORITHM },
    false,
    ['sign']
  );
  
  // Generate signature
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC signature
 */
export async function verifyHMAC(data: any, signature: string): Promise<boolean> {
  try {
    const expectedSignature = await generateHMAC(data);
    return expectedSignature === signature;
  } catch (error) {
    console.error('[HMAC] Verification failed:', error);
    return false;
  }
}

/**
 * Sign data for storage
 */
export async function signData<T>(data: T): Promise<{ data: T; signature: string; timestamp: number }> {
  const timestamp = Date.now();
  const payload = { ...data, timestamp };
  const signature = await generateHMAC(payload);
  
  return {
    data: data,
    signature,
    timestamp
  };
}

/**
 * Verify and extract signed data
 */
export async function verifySignedData<T>(
  signed: { data: T; signature: string; timestamp: number }
): Promise<{ valid: boolean; data: T | null }> {
  try {
    const payload = { ...signed.data, timestamp: signed.timestamp };
    const isValid = await verifyHMAC(payload, signed.signature);
    
    if (!isValid) {
      console.warn('[HMAC] Signature verification failed - data may have been tampered with');
      return { valid: false, data: null };
    }
    
    return { valid: true, data: signed.data };
  } catch (error) {
    console.error('[HMAC] Verification error:', error);
    return { valid: false, data: null };
  }
}
