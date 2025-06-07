import { CONSTANTS } from '../utils/constants.js';
import { Validation } from '../utils/validation.js';

export class CryptoOps {
    constructor(keyManager) {
        this.keyManager = keyManager;
    }

    // Encrypt message
    async encryptMessage(message, recipientPublicKey = null) {
        try {
            Validation.validateMessage(message);

            let publicKey;
            
            if (recipientPublicKey) {
                // Use provided public key
                if (!Validation.validatePGPPublicKey(recipientPublicKey)) {
                    throw new Error('Invalid public key format');
                }
                publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });
            } else {
                // Use own public key
                const keyPair = this.keyManager.getCurrentKeyPair();
                if (!keyPair) {
                    throw new Error(CONSTANTS.ERRORS.NO_KEYS);
                }
                publicKey = keyPair.publicKeyObj;
            }

            const encrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: message }),
                encryptionKeys: publicKey,
                format: 'armored'
            });

            return encrypted;

        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error(`${CONSTANTS.ERRORS.ENCRYPTION_FAILED}: ${error.message}`);
        }
    }

    // Decrypt message
    async decryptMessage(encryptedMessage, passphrase) {
        try {
            const keyPair = this.keyManager.getCurrentKeyPair();
            if (!keyPair) {
                throw new Error(CONSTANTS.ERRORS.NO_KEYS);
            }

            Validation.validatePassphrase(passphrase);

            if (!Validation.validatePGPMessage(encryptedMessage)) {
                throw new Error('Invalid encrypted message format');
            }

            // Decrypt the private key with passphrase
            const privateKey = await openpgp.decryptKey({
                privateKey: keyPair.privateKeyObj,
                passphrase: passphrase
            });

            // Read the encrypted message
            const message = await openpgp.readMessage({
                armoredMessage: encryptedMessage
            });

            // Decrypt the message
            const { data: decrypted } = await openpgp.decrypt({
                message: message,
                decryptionKeys: privateKey,
                format: 'utf8'
            });

            return decrypted;

        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error(`${CONSTANTS.ERRORS.DECRYPTION_FAILED}: ${error.message}`);
        }
    }

    // Sign message
    async signMessage(message, passphrase) {
        try {
            const keyPair = this.keyManager.getCurrentKeyPair();
            if (!keyPair) {
                throw new Error(CONSTANTS.ERRORS.NO_KEYS);
            }

            Validation.validateMessage(message);
            Validation.validatePassphrase(passphrase);

            // Decrypt the private key with passphrase
            const privateKey = await openpgp.decryptKey({
                privateKey: keyPair.privateKeyObj,
                passphrase: passphrase
            });

            // Create and sign the message
            const signed = await openpgp.sign({
                message: await openpgp.createCleartextMessage({ text: message }),
                signingKeys: privateKey,
                format: 'armored'
            });

            return signed;

        } catch (error) {
            console.error('Signing failed:', error);
            throw new Error(`${CONSTANTS.ERRORS.SIGNING_FAILED}: ${error.message}`);
        }
    }

    // Verify signed message
    async verifyMessage(signedMessage, signerPublicKey = null) {
        try {
            if (!Validation.validatePGPMessage(signedMessage)) {
                throw new Error('Invalid signed message format');
            }

            let publicKey;
            
            if (signerPublicKey) {
                // Use provided public key
                if (!Validation.validatePGPPublicKey(signerPublicKey)) {
                    throw new Error('Invalid public key format');
                }
                publicKey = await openpgp.readKey({ armoredKey: signerPublicKey });
            } else {
                // Use own public key
                const keyPair = this.keyManager.getCurrentKeyPair();
                if (!keyPair) {
                    throw new Error(CONSTANTS.ERRORS.NO_KEYS);
                }
                publicKey = keyPair.publicKeyObj;
            }

            // Read the signed message
            const message = await openpgp.readCleartextMessage({
                cleartextMessage: signedMessage
            });

            // Verify the signature
            const verificationResult = await openpgp.verify({
                message: message,
                verificationKeys: publicKey,
                format: 'utf8'
            });

            // Check if signature is valid
            const { verified } = verificationResult.signatures[0];
            await verified; // This will throw if verification fails

            return {
                verified: true,
                data: verificationResult.data,
                signatures: verificationResult.signatures
            };

        } catch (error) {
            console.error('Verification failed:', error);
            
            // Check if it's a verification failure vs other error
            if (error.message.includes('Signature verification failed')) {
                return {
                    verified: false,
                    error: 'Signature verification failed - the message may have been tampered with or signed by a different key'
                };
            }
            
            throw new Error(`${CONSTANTS.ERRORS.VERIFICATION_FAILED}: ${error.message}`);
        }
    }

    // Sign and encrypt message (combined operation)
    async signAndEncryptMessage(message, passphrase, recipientPublicKey = null) {
        try {
            const keyPair = this.keyManager.getCurrentKeyPair();
            if (!keyPair) {
                throw new Error(CONSTANTS.ERRORS.NO_KEYS);
            }

            Validation.validateMessage(message);
            Validation.validatePassphrase(passphrase);

            // Decrypt the private key with passphrase
            const privateKey = await openpgp.decryptKey({
                privateKey: keyPair.privateKeyObj,
                passphrase: passphrase
            });

            let publicKey;
            if (recipientPublicKey) {
                if (!Validation.validatePGPPublicKey(recipientPublicKey)) {
                    throw new Error('Invalid public key format');
                }
                publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });
            } else {
                publicKey = keyPair.publicKeyObj;
            }

            // Sign and encrypt the message
            const signedAndEncrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: message }),
                encryptionKeys: publicKey,
                signingKeys: privateKey,
                format: 'armored'
            });

            return signedAndEncrypted;

        } catch (error) {
            console.error('Sign and encrypt failed:', error);
            throw new Error(`Sign and encrypt failed: ${error.message}`);
        }
    }

    // Decrypt and verify message (combined operation)
    async decryptAndVerifyMessage(encryptedMessage, passphrase, signerPublicKey = null) {
        try {
            const keyPair = this.keyManager.getCurrentKeyPair();
            if (!keyPair) {
                throw new Error(CONSTANTS.ERRORS.NO_KEYS);
            }

            Validation.validatePassphrase(passphrase);

            // Decrypt the private key with passphrase
            const privateKey = await openpgp.decryptKey({
                privateKey: keyPair.privateKeyObj,
                passphrase: passphrase
            });

            let verificationKeys;
            if (signerPublicKey) {
                if (!Validation.validatePGPPublicKey(signerPublicKey)) {
                    throw new Error('Invalid public key format');
                }
                verificationKeys = await openpgp.readKey({ armoredKey: signerPublicKey });
            } else {
                verificationKeys = keyPair.publicKeyObj;
            }

            // Read the encrypted message
            const message = await openpgp.readMessage({
                armoredMessage: encryptedMessage
            });

            // Decrypt and verify the message
            const result = await openpgp.decrypt({
                message: message,
                decryptionKeys: privateKey,
                verificationKeys: verificationKeys,
                format: 'utf8'
            });

            // Check signature verification
            const signatureValid = result.signatures.length > 0;
            let signatureVerified = false;
            
            if (signatureValid) {
                try {
                    const { verified } = result.signatures[0];
                    await verified;
                    signatureVerified = true;
                } catch (e) {
                    console.warn('Signature verification failed:', e);
                }
            }

            return {
                data: result.data,
                signatureValid,
                signatureVerified,
                signatures: result.signatures
            };

        } catch (error) {
            console.error('Decrypt and verify failed:', error);
            throw new Error(`Decrypt and verify failed: ${error.message}`);
        }
    }
}
