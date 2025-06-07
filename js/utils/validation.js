import { CONSTANTS } from './constants.js';

export const Validation = {
    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate required form fields for key generation
    validateKeyGenerationFields() {
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const passphrase = document.getElementById('passphrase').value;

        if (!name) {
            throw new Error('Name is required');
        }
        if (!email) {
            throw new Error('Email is required');
        }
        if (!this.isValidEmail(email)) {
            throw new Error(CONSTANTS.ERRORS.INVALID_EMAIL);
        }
        if (!passphrase) {
            throw new Error('Passphrase is required');
        }
        if (passphrase.length < CONSTANTS.MIN_PASSPHRASE_LENGTH) {
            throw new Error(CONSTANTS.ERRORS.PASSPHRASE_TOO_SHORT);
        }

        return { name, email, passphrase };
    },

    // Validate message input
    validateMessage(message) {
        if (!message || message.trim().length === 0) {
            throw new Error('Message cannot be empty');
        }
        return message.trim();
    },

    // Validate PGP message format
    validatePGPMessage(message) {
        const pgpMessageRegex = /-----BEGIN PGP (MESSAGE|SIGNED MESSAGE)-----[\s\S]*-----END PGP (MESSAGE|SIGNATURE)-----/;
        return pgpMessageRegex.test(message);
    },

    // Validate PGP public key format
    validatePGPPublicKey(key) {
        const pgpKeyRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]*-----END PGP PUBLIC KEY BLOCK-----/;
        return pgpKeyRegex.test(key);
    },

    // Validate passphrase for decryption
    validatePassphrase(passphrase) {
        if (!passphrase) {
            throw new Error('Passphrase is required for decryption');
        }
        return passphrase;
    },

    // Validate key backup file structure
    validateKeyBackup(backup) {
        if (!backup || typeof backup !== 'object') {
            throw new Error('Invalid backup file format');
        }
        
        if (!backup.keys || !backup.keys.private || !backup.keys.public) {
            throw new Error('Backup file missing required keys');
        }
        
        if (!this.validatePGPPublicKey(backup.keys.public)) {
            throw new Error('Invalid public key in backup file');
        }
        
        return true;
    }
};
