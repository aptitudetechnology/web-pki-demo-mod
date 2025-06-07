import { CONSTANTS } from '../utils/constants.js';
import { Validation } from '../utils/validation.js';
import { Formatting } from '../utils/formatting.js';

export class KeyManager {
    constructor() {
        this.currentKeyPair = null;
        this.advancedConfig = {
            algorithm: CONSTANTS.DEFAULT_ALGORITHM,
            keySize: null,
            expiration: CONSTANTS.DEFAULT_EXPIRATION,
            usage: {
                sign: true,
                encrypt: true,
                certify: true
            },
            comment: ''
        };
    }

    // Generate new key pair
    async generateKeyPair(userInfo) {
        try {
            const config = this.advancedConfig;
            
            // Build key generation options
            const keyOptions = {
                type: config.algorithm === 'ecc' ? 'ecc' : 'rsa',
                userIDs: [{ 
                    name: userInfo.name, 
                    email: userInfo.email, 
                    comment: config.comment 
                }],
                passphrase: userInfo.passphrase,
                format: 'armored'
            };

            // Set algorithm-specific options
            if (config.algorithm === 'ecc') {
                keyOptions.curve = CONSTANTS.DEFAULT_CURVE;
            } else {
                keyOptions.rsaBits = config.keySize || CONSTANTS.DEFAULT_RSA_BITS;
            }

            // Set expiration
            if (config.expiration > 0) {
                keyOptions.keyExpirationTime = config.expiration;
            }

            console.log('Generating key with options:', keyOptions);

            // Generate the key pair
            const { privateKey, publicKey } = await openpgp.generateKey(keyOptions);

            // Parse keys for metadata
            const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });
            const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });

            const keyPair = {
                privateKey,
                publicKey,
                privateKeyObj,
                publicKeyObj,
                metadata: {
                    keyId: publicKeyObj.getKeyIDs()[0].toHex().toUpperCase(),
                    fingerprint: publicKeyObj.getFingerprint(),
                    algorithm: config.algorithm.toUpperCase(),
                    created: publicKeyObj.getCreationTime(),
                    userIds: publicKeyObj.getUserIDs()
                }
            };

            this.currentKeyPair = keyPair;
            return keyPair;

        } catch (error) {
            console.error('Key generation failed:', error);
            throw new Error(`Key generation failed: ${error.message}`);
        }
    }

    // Load key pair from backup
    async loadKeyPair(backup) {
        try {
            Validation.validateKeyBackup(backup);

            // Parse keys
            const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: backup.keys.private });
            const publicKeyObj = await openpgp.readKey({ armoredKey: backup.keys.public });

            const keyPair = {
                privateKey: backup.keys.private,
                publicKey: backup.keys.public,
                privateKeyObj,
                publicKeyObj,
                metadata: backup.metadata || {
                    keyId: publicKeyObj.getKeyIDs()[0].toHex().toUpperCase(),
                    fingerprint: publicKeyObj.getFingerprint(),
                    algorithm: 'LOADED',
                    created: publicKeyObj.getCreationTime(),
                    userIds: publicKeyObj.getUserIDs()
                }
            };

            this.currentKeyPair = keyPair;
            return keyPair;

        } catch (error) {
            throw new Error(`Failed to load key pair: ${error.message}`);
        }
    }

    // Create key backup for download
    createKeyBackup(userInfo) {
        if (!this.currentKeyPair) {
            throw new Error(CONSTANTS.ERRORS.NO_KEYS);
        }

        const backup = {
            version: '1.0',
            created: new Date().toISOString(),
            userInfo: {
                name: userInfo.name,
                email: userInfo.email
            },
            config: {
                algorithm: this.advancedConfig.algorithm,
                keySize: this.advancedConfig.keySize,
                comment: this.advancedConfig.comment
            },
            keys: {
                private: this.currentKeyPair.privateKey,
                public: this.currentKeyPair.publicKey
            },
            metadata: this.currentKeyPair.metadata
        };

        return JSON.stringify(backup, null, 2);
    }

    // Get current key pair
    getCurrentKeyPair() {
        return this.currentKeyPair;
    }

    // Check if keys are available
    hasKeys() {
        return this.currentKeyPair !== null;
    }

    // Update advanced configuration
    updateAdvancedConfig(newConfig) {
        this.advancedConfig = { ...this.advancedConfig, ...newConfig };
    }

    // Get advanced configuration
    getAdvancedConfig() {
        return { ...this.advancedConfig };
    }

    // Get formatted key information
    getFormattedKeyInfo() {
        if (!this.currentKeyPair) {
            return null;
        }

        const metadata = this.currentKeyPair.metadata;
        return {
            keyId: metadata.keyId,
            fingerprint: Formatting.formatFingerprint(metadata.fingerprint),
            algorithm: Formatting.formatAlgorithm(metadata.algorithm),
            created: Formatting.formatDate(metadata.created),
            userIds: metadata.userIds
        };
    }

    // Clear current keys
    clearKeys() {
        this.currentKeyPair = null;
    }
}
