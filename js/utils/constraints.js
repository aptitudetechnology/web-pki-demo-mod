// Application constants
export const CONSTANTS = {
    // Key generation defaults
    DEFAULT_ALGORITHM: 'ecc',
    DEFAULT_EXPIRATION: 63072000, // 2 years in seconds
    DEFAULT_CURVE: 'curve25519',
    DEFAULT_RSA_BITS: 2048,
    
    // Validation rules
    MIN_PASSPHRASE_LENGTH: 8,
    
    // UI constants
    LOADING_TEXT: 'Processing...',
    
    // Status types
    STATUS: {
        PENDING: 'pending',
        READY: 'ready',
        ERROR: 'error',
        SUCCESS: 'success'
    },
    
    // File extensions
    KEY_FILE_EXTENSION: '.json',
    
    // Time constants
    SECONDS_PER_YEAR: 31536000,
    
    // Error messages
    ERRORS: {
        NO_KEYS: 'No key pair available. Please generate or load keys first.',
        INVALID_EMAIL: 'Please enter a valid email address',
        PASSPHRASE_TOO_SHORT: 'Passphrase must be at least 8 characters long',
        REQUIRED_FIELD: 'This field is required',
        INVALID_KEY_FILE: 'Invalid key file format',
        DECRYPTION_FAILED: 'Failed to decrypt message. Check your passphrase and try again.',
        VERIFICATION_FAILED: 'Signature verification failed',
        ENCRYPTION_FAILED: 'Encryption failed',
        SIGNING_FAILED: 'Signing failed'
    },
    
    // Success messages
    SUCCESS: {
        KEY_GENERATED: 'Key pair generated successfully!',
        KEY_LOADED: 'Key pair loaded successfully!',
        KEY_SAVED: 'Key pair saved successfully!',
        MESSAGE_SIGNED: 'Message signed successfully!',
        MESSAGE_VERIFIED: 'Message verified successfully!',
        MESSAGE_ENCRYPTED: 'Message encrypted successfully!',
        MESSAGE_DECRYPTED: 'Message decrypted successfully!'
    }
};
