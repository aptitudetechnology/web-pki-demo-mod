import { CONSTANTS } from '../utils/constants.js';
import { Validation } from '../utils/validation.js';
import { Clipboard } from '../utils/clipboard.js';

export class Decrypt {
    constructor(keyManager, cryptoOps) {
        this.keyManager = keyManager;
        this.cryptoOps = cryptoOps;
    }

    // Initialize decrypt functionality
    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    // Setup event listeners
    setupEventListeners() {
        // Decrypt button
        document.getElementById('decryptBtn').addEventListener('click', () => this.handleDecrypt());
    }

    // Handle message decryption
    async handleDecrypt() {
        const decryptBtn = document.getElementById('decryptBtn');
        const messageInput = document.getElementById('messageToDecrypt');
        const output = document.getElementById('decryptOutput');

        try {
            // Validate encrypted message
            const encryptedMessage = messageInput.value.trim();
            if (!encryptedMessage) {
                throw new Error('Please enter an encrypted message to decrypt');
            }

            // Check if keys are available
            if (!this.keyManager.hasKeys()) {
                throw new Error('No keys available. Please generate or load keys first.');
            }

            // Validate PGP message format
            if (!encryptedMessage.includes('-----BEGIN PGP MESSAGE-----')) {
                throw new Error('Invalid PGP message format. Please ensure you\'ve pasted a complete encrypted PGP message.');
            }

            // Set loading state
            decryptBtn.disabled = true;
            decryptBtn.textContent = 'Decrypting...';
            this.updateStatus('pending', 'Decrypting Message...');

            // Get private key and passphrase
            const privateKey = this.keyManager.getPrivateKey();
            const passphrase = this.keyManager.getPassphrase();

            if (!passphrase) {
                throw new Error('Passphrase is required for decryption. Please ensure your key is properly loaded.');
            }

            // Decrypt the message
            const decryptedMessage = await this.cryptoOps.decryptMessage(encryptedMessage, privateKey, passphrase);

            // Show success result
            const resultMessage = `✅ Message decrypted successfully!\n\nDecrypted message:\n${decryptedMessage}`;
            this.showOutput(output, resultMessage, 'success');
            this.updateStatus('ready', 'Message Decrypted');

            // Add copy button for decrypted content
            this.addCopyButton(output, decryptedMessage);

        } catch (error) {
            console.error('Decrypt failed:', error);
            
            // Provide helpful error messages
            let errorMessage = error.message;
            if (error.message.includes('Incorrect key passphrase')) {
                errorMessage = 'Incorrect passphrase. Please check your key passphrase.';
            } else if (error.message.includes('No decryption keys found')) {
                errorMessage = 'This message was not encrypted for your key. You cannot decrypt it.';
            } else if (error.message.includes('Error decrypting message')) {
                errorMessage = 'Failed to decrypt message. Please check that:\n• The message is a valid PGP encrypted message\n• The message was encrypted for your public key\n• Your private key and passphrase are correct';
            }
            
            this.showOutput(output, `Decrypt failed: ${errorMessage}`, 'error');
            this.updateStatus('error', 'Decrypt Failed');
        } finally {
            decryptBtn.disabled = false;
            decryptBtn.textContent = 'Decrypt Message';
        }
    }

    // Update UI based on current state
    updateUI() {
        const hasKeys = this.keyManager.hasKeys();
        
        // Update status
        if (hasKeys) {
            this.updateStatus('ready', 'Ready to Decrypt');
        } else {
            this.updateStatus('pending', 'Keys Required');
        }

        // Enable/disable decrypt button
        document.getElementById('decryptBtn').disabled = !hasKeys;
    }

    // Update status indicator
    updateStatus(status, text) {
        const statusEl = document.getElementById('decryptStatus');
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
    addCopyButton(outputEl, decryptedContent) {
        // Remove existing copy button if present
        const existingBtn = outputEl.querySelector('.copy-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy Decrypted Message';
        copyBtn.style.marginTop = '10px';
        
        copyBtn.addEventListener('click', async () => {
            const success = await Clipboard.copyToClipboard(decryptedContent);
            if (success) {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Decrypted Message';
                }, 2000);
            } else {
                copyBtn.textContent = 'Copy Failed';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Decrypted Message';
                }, 2000);
            }
        });

        outputEl.appendChild(copyBtn);
    }

    // Get current operation status
    getStatus() {
        return {
            hasKeys: this.keyManager.hasKeys(),
            canDecrypt: this.keyManager.hasKeys() && this.keyManager.getPassphrase()
        };
    }

    // Reset all inputs and outputs
    reset() {
        document.getElementById('messageToDecrypt').value = '';
        document.getElementById('decryptOutput').style.display = 'none';
        this.updateUI();
    }
}
