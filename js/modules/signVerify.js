import { CONSTANTS } from '../utils/constants.js';
import { Validation } from '../utils/validation.js';
import { Clipboard } from '../utils/clipboard.js';

// modules/signVerify.js - Sign and verify messages with proper key decryption
export class SignVerify {
    constructor(keyManager, cryptoOps) {
        this.keyManager = keyManager;
        this.cryptoOps = cryptoOps;
        this.useCustomPublicKey = false;
        this.currentMode = 'sign';
    }

    async signMessage(message, keyPair, passphrase) {
        try {
            console.log('Starting message signing...');
            
            if (!keyPair || !keyPair.privateKey) {
                throw new Error('No private key available for signing');
            }

            if (!passphrase) {
                throw new Error('Passphrase is required for signing');
            }
            
            // Read the private key (handle both string and object formats)
            let privateKey;
            if (typeof keyPair.privateKey === 'string') {
                privateKey = await openpgp.readPrivateKey({ armoredKey: keyPair.privateKey });
            } else {
                privateKey = keyPair.privateKey;
            }

            // Decrypt the private key with the passphrase
            console.log('Decrypting private key...');
            const decryptedPrivateKey = await openpgp.decryptKey({
                privateKey: privateKey,
                passphrase: passphrase
            });

            // Create the message to sign
            const messageToSign = await openpgp.createMessage({ text: message });

            // Sign the message
            console.log('Signing message...');
            const signedMessage = await openpgp.sign({
                message: messageToSign,
                signingKeys: decryptedPrivateKey,
                format: 'armored' // This will return the signature in ASCII armor format
            });

            console.log('Message signed successfully');
            return signedMessage;

        } catch (error) {
            console.error('Error signing message:', error);
            throw new Error(`Error signing message: ${error.message}`);
        }
    }

    async verifyMessage(signedMessage, publicKey) {
        try {
            console.log('Starting message verification...');
            
            if (!signedMessage) {
                throw new Error('No signed message provided');
            }

            // Read the signed message
            let message;
            try {
                message = await openpgp.readMessage({ armoredMessage: signedMessage });
            } catch (error) {
                throw new Error('Invalid signed message format');
            }

            // Handle public key (could be string or object)
            let verificationKeys;
            if (publicKey) {
                if (typeof publicKey === 'string') {
                    verificationKeys = await openpgp.readKey({ armoredKey: publicKey });
                } else {
                    verificationKeys = publicKey;
                }
            } else {
                throw new Error('No public key provided for verification');
            }

            // Verify the signature
            console.log('Verifying signature...');
            const verificationResult = await openpgp.verify({
                message: message,
                verificationKeys: verificationKeys
            });

            // Process verification results
            const { data: verifiedData, signatures } = verificationResult;
            
            let isValid = false;
            let signerInfo = null;

            if (signatures && signatures.length > 0) {
                // Check if any signature is valid
                for (const signature of signatures) {
                    try {
                        await signature.verified; // This will throw if signature is invalid
                        isValid = true;
                        
                        // Try to get signer information
                        if (signature.keyID) {
                            signerInfo = signature.keyID.toHex();
                        }
                        break; // At least one valid signature found
                    } catch (e) {
                        console.log('Signature verification failed:', e.message);
                    }
                }
            }

            console.log('Verification completed');
            
            return {
                valid: isValid,
                message: verifiedData,
                signer: signerInfo,
                signatures: signatures.length
            };

        } catch (error) {
            console.error('Error verifying message:', error);
            throw new Error(`Error verifying message: ${error.message}`);
        }
    }

    // Helper method to get passphrase from user (fallback if passphrase not provided)
    async getPassphraseForSigning() {
        // This method is now mainly for fallback cases
        // The main app should pass the passphrase directly
        return new Promise((resolve, reject) => {
            // Create a simple modal for passphrase input
            const modal = this.createPassphraseModal();
            document.body.appendChild(modal);
            
            const passphraseInput = modal.querySelector('#signingPassphrase');
            const confirmBtn = modal.querySelector('#confirmPassphrase');
            const cancelBtn = modal.querySelector('#cancelPassphrase');
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            confirmBtn.addEventListener('click', () => {
                const passphrase = passphraseInput.value;
                if (!passphrase) {
                    alert('Please enter your passphrase');
                    return;
                }
                cleanup();
                resolve(passphrase);
            });
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                reject(new Error('Passphrase entry cancelled'));
            });
            
            // Focus on input
            passphraseInput.focus();
            
            // Handle Enter key
            passphraseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
        });
    }

    // Create a simple modal for passphrase input
    createPassphraseModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
                <h3>Enter Passphrase</h3>
                <p>Please enter your passphrase to decrypt the signing key:</p>
                <input type="password" id="signingPassphrase" placeholder="Enter passphrase..." style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
                <div style="text-align: right; margin-top: 15px;">
                    <button id="cancelPassphrase" style="margin-right: 10px; padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="confirmPassphrase" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    // Handle message signing
    async handleSign() {
        const signBtn = document.getElementById('signBtnNew');
        const messageInput = document.getElementById('messageToSignNew');
        const output = document.getElementById('signOutputNew');

        try {
            // Validate message
            const message = messageInput.value.trim();
            if (!message) {
                throw new Error('Please enter a message to sign');
            }

            // Check if keys are available
            if (!this.keyManager.hasKeys()) {
                throw new Error('No keys available. Please generate or load keys first.');
            }

            // Set loading state
            signBtn.disabled = true;
            signBtn.textContent = 'Signing...';
            this.updateStatus('pending', 'Signing Message...');

            // Sign the message
            const signedMessage = await this.cryptoOps.signMessage(message);

            // Show success result
            this.showOutput(output, signedMessage, 'success');
            this.updateStatus('ready', 'Message Signed');

            // Add copy button
            this.addCopyButton(output, signedMessage);

        } catch (error) {
            console.error('Sign failed:', error);
            this.showOutput(output, `Sign failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Sign Failed');
        } finally {
            signBtn.disabled = false;
            signBtn.textContent = 'Sign Message';
        }
    }

    // Handle message verification
    async handleVerify() {
        const verifyBtn = document.getElementById('verifyBtn');
        const signedMessageInput = document.getElementById('signedMessageToVerify');
        const customPublicKeyInput = document.getElementById('verifyCustomPublicKey');
        const output = document.getElementById('verifyOutput');

        try {
            // Validate signed message
            const signedMessage = signedMessageInput.value.trim();
            if (!signedMessage) {
                throw new Error('Please enter a signed message to verify');
            }

            // Determine which public key to use
            let publicKey;
            if (this.useCustomPublicKey) {
                const customPublicKey = customPublicKeyInput.value.trim();
                if (!customPublicKey) {
                    throw new Error('Please enter a custom public key or switch to use your own key');
                }
                publicKey = customPublicKey;
            } else {
                if (!this.keyManager.hasKeys()) {
                    throw new Error('No keys available. Please generate/load keys or use a custom public key.');
                }
                publicKey = this.keyManager.getPublicKey();
            }

            // Set loading state
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';
            this.updateStatus('pending', 'Verifying Message...');

            // Verify the message
            const verificationResult = await this.cryptoOps.verifyMessage(signedMessage, publicKey);

            // Show verification result
            if (verificationResult.verified) {
                const resultMessage = `✅ Signature is VALID\n\nOriginal message:\n${verificationResult.message}\n\nSigned by: ${verificationResult.signerInfo || 'Unknown'}`;
                this.showOutput(output, resultMessage, 'success');
                this.updateStatus('ready', 'Signature Valid');
            } else {
                const resultMessage = `❌ Signature is INVALID\n\nReason: ${verificationResult.error || 'Signature verification failed'}`;
                this.showOutput(output, resultMessage, 'error');
                this.updateStatus('error', 'Signature Invalid');
            }

        } catch (error) {
            console.error('Verify failed:', error);
            this.showOutput(output, `Verify failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Verify Failed');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify Message';
        }
    }

    // Toggle custom public key option
    toggleCustomPublicKey() {
        this.useCustomPublicKey = !this.useCustomPublicKey;
        const customKeySection = document.getElementById('customPublicKeySection');
        const toggleBtn = document.getElementById('toggleCustomPublicKey');
        
        if (this.useCustomPublicKey) {
            customKeySection.style.display = 'block';
            toggleBtn.textContent = 'Use Own Public Key';
        } else {
            customKeySection.style.display = 'none';
            toggleBtn.textContent = 'Use Custom Public Key';
        }
        
        this.updateUI();
    }

    // Update UI based on current state
    updateUI() {
        const hasKeys = this.keyManager.hasKeys();
        
        // Update status
        if (hasKeys) {
            this.updateStatus('ready', 'Keys Available');
        } else {
            this.updateStatus('pending', 'Keys Required');
        }

        // Enable/disable buttons based on key availability
        document.getElementById('signBtnNew').disabled = !hasKeys;
        
        // For verify, enable if we have keys OR if using custom public key
        const verifyBtn = document.getElementById('verifyBtn');
        verifyBtn.disabled = !hasKeys && !this.useCustomPublicKey;
    }

    // Update status indicator
    updateStatus(status, text) {
        const statusEl = document.getElementById('signVerifyStatus');
        statusEl.className = `status ${status}`;
        statusEl.textContent = text;
    }

    // Show output with styling
    showOutput(outputEl, content, type = 'success') {
        outputEl.className = `output ${type}`;
        outputEl.textContent = content;
        outputEl.style.display = 'block';
    }

    // Add copy button to output
    addCopyButton(outputEl, content) {
        // Remove existing copy button if present
        const existingBtn = outputEl.querySelector('.copy-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy to Clipboard';
        copyBtn.style.marginTop = '10px';
        
        copyBtn.addEventListener('click', async () => {
            const success = await Clipboard.copyToClipboard(content);
            if (success) {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy to Clipboard';
                }, 2000);
            } else {
                copyBtn.textContent = 'Copy Failed';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy to Clipboard';
                }, 2000);
            }
        });

        outputEl.appendChild(copyBtn);
    }

    // Get current operation status
    getStatus() {
        return {
            currentMode: this.currentMode,
            useCustomPublicKey: this.useCustomPublicKey,
            hasKeys: this.keyManager.hasKeys()
        };
    }

    // Reset all inputs and outputs
    reset() {
        document.getElementById('messageToSignNew').value = '';
        document.getElementById('signedMessageToVerify').value = '';
        document.getElementById('verifyCustomPublicKey').value = '';
        
        document.getElementById('signOutputNew').style.display = 'none';
        document.getElementById('verifyOutput').style.display = 'none';
        
        this.useCustomPublicKey = false;
        this.toggleCustomPublicKey();
        
        this.updateUI();
    }
}

// Export a standalone verify function if needed elsewhere
export async function verifyMessage(signedMessage, publicKey) {
    try {
        // Validate inputs
        if (!signedMessage || typeof signedMessage !== 'string') {
            throw new Error('Valid signed message is required');
        }

        if (!publicKey) {
            throw new Error('Public key is required for verification');
        }

        // Handle public key (could be string or key object)
        const pubKey = typeof publicKey === 'string' 
            ? await openpgp.readKey({ armoredKey: publicKey })
            : publicKey;

        // Read the signed message
        const message = await openpgp.readMessage({ armoredMessage: signedMessage });

        // Verify the signature
        const verification = await openpgp.verify({
            message,
            verificationKeys: pubKey
        });

        // Check if we have signatures
        if (!verification.signatures || verification.signatures.length === 0) {
            return {
                valid: false,
                message: 'No signatures found in the message',
                signer: null
            };
        }

        const signature = verification.signatures[0];
        const isValid = await signature.verified;

        return {
            valid: isValid,
            message: isValid ? 'Signature is valid' : 'Signature is invalid',
            signer: signature.keyID ? signature.keyID.toHex() : null
        };

    } catch (error) {
        return {
            valid: false,
            message: `Verification failed: ${error.message}`,
            signer: null
        };
    }
}
