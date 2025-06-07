import { CONSTANTS } from '../utils/constants.js';
import { Validation } from '../utils/validation.js';
import { Clipboard } from '../utils/clipboard.js';

export class Encrypt {
    constructor(keyManager, cryptoOps) {
        this.keyManager = keyManager;
        this.cryptoOps = cryptoOps;
        this.useCustomPublicKey = false;
    }

    // Initialize encrypt functionality
    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    // Setup event listeners
    setupEventListeners() {
        // Encrypt button
        document.getElementById('encryptBtn').addEventListener('click', () => this.handleEncrypt());

        // Toggle custom public key
        document.getElementById('toggleEncryptPublicKeyBtn').addEventListener('click', () => {
            this.toggleCustomPublicKey();
        });
    }

    // Toggle custom public key input
    toggleCustomPublicKey() {
        this.useCustomPublicKey = !this.useCustomPublicKey;
        
        const container = document.getElementById('encryptCustomPublicKeyContainer');
        const button = document.getElementById('toggleEncryptPublicKeyBtn');
        
        if (this.useCustomPublicKey) {
            container.style.display = 'block';
            button.textContent = 'Use Own Public Key';
        } else {
            container.style.display = 'none';
            button.textContent = 'Use Custom Public Key';
        }

        this.updateUI();
    }

    // Handle message encryption
    async handleEncrypt() {
        const encryptBtn = document.getElementById('encryptBtn');
        const messageInput = document.getElementById('messageToEncrypt');
        const customPublicKeyInput = document.getElementById('encryptCustomPublicKey');
        const output = document.getElementById('encryptOutput');

        try {
            // Validate message
            const message = messageInput.value.trim();
            if (!message) {
                throw new Error('Please enter a message to encrypt');
            }

            // Determine which public key to use
            let publicKey;
            let recipientInfo = 'yourself';
            
            if (this.useCustomPublicKey) {
                const customPublicKey = customPublicKeyInput.value.trim();
                if (!customPublicKey) {
                    throw new Error('Please enter a recipient\'s public key or switch to use your own key');
                }
                publicKey = customPublicKey;
                recipientInfo = 'recipient';
            } else {
                if (!this.keyManager.hasKeys()) {
                    throw new Error('No keys available. Please generate/load keys or use a custom public key.');
                }
                publicKey = this.keyManager.getPublicKey();
            }

            // Set loading state
            encryptBtn.disabled = true;
            encryptBtn.textContent = 'Encrypting...';
            this.updateStatus('pending', 'Encrypting Message...');

            // Encrypt the message
            const encryptedMessage = await this.cryptoOps.encryptMessage(message, publicKey);

            // Show success result
            const resultMessage = `✅ Message encrypted successfully for ${recipientInfo}!\n\nEncrypted message:\n${encryptedMessage}`;
            this.showOutput(output, resultMessage, 'success');
            this.updateStatus('ready', 'Message Encrypted');

            // Add copy button
            this.addCopyButton(output, encryptedMessage);

        } catch (error) {
            console.error('Encrypt failed:', error);
            this.showOutput(output, `Encrypt failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Encrypt Failed');
        } finally {
            encryptBtn.disabled = false;
            encryptBtn.textContent = 'Encrypt Message';
        }
    }

    // Update UI based on current state
    updateUI() {
        const hasKeys = this.keyManager.hasKeys();
        
        // Update status
        if (hasKeys || this.useCustomPublicKey) {
            this.updateStatus('ready', 'Ready to Encrypt');
        } else {
            this.updateStatus('pending', 'Keys Required');
        }

        // Enable/disable encrypt button
        const encryptBtn = document.getElementById('encryptBtn');
        encryptBtn.disabled = !hasKeys && !this.useCustomPublicKey;
    }

    // Update status indicator
    updateStatus(status, text) {
        const statusEl = document.getElementById('encryptStatus');
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
    addCopyButton(outputEl, encryptedContent) {
        // Remove existing copy button if present
        const existingBtn = outputEl.querySelector('.copy-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy Encrypted Message';
        copyBtn.style.marginTop = '10px';
        
        copyBtn.addEventListener('click', async () => {
            const success = await Clipboard.copyToClipboard(encryptedContent);
            if (success) {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Encrypted Message';
                }, 2000);
            } else {
                copyBtn.textContent = 'Copy Failed';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Encrypted Message';
                }, 2000);
            }
        });

        outputEl.appendChild(copyBtn);
    }

    // Get current operation status
    getStatus() {
        return {
            useCustomPublicKey: this.useCustomPublicKey,
            hasKeys: this.keyManager.hasKeys()
        };
    }

    // Reset all inputs and outputs
    reset() {
        document.getElementById('messageToEncrypt').value = 'This is a secret message that will be encrypted!';
        document.getElementById('encryptCustomPublicKey').value = '';
        document.getElementById('encryptOutput').style.display = 'none';
        
        this.useCustomPublicKey = false;
        this.toggleCustomPublicKey();
        
        this.updateUI();
    }
}
