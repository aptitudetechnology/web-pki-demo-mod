import { CONSTANTS } from '../utils/constants.js';
import { Validation } from '../utils/validation.js';
import { Clipboard } from '../utils/clipboard.js';

export class SignVerify {
    constructor(keyManager, cryptoOps) {
        this.keyManager = keyManager;
        this.cryptoOps = cryptoOps;
        this.currentMode = 'sign';
        this.useCustomPublicKey = false;
    }

    // Initialize sign & verify functionality
    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    // Setup event listeners
    setupEventListeners() {
        // Tab switching
        document.getElementById('signTab').addEventListener('click', () => this.switchTab('sign'));
        document.getElementById('verifyTab').addEventListener('click', () => this.switchTab('verify'));

        // Sign button
        document.getElementById('signBtnNew').addEventListener('click', () => this.handleSign());

        // Verify button
        document.getElementById('verifyBtn').addEventListener('click', () => this.handleVerify());

        // Toggle custom public key for verification
        document.getElementById('toggleVerifyPublicKeyBtn').addEventListener('click', () => {
            this.toggleCustomPublicKey();
        });
    }

    // Switch between sign and verify tabs
    switchTab(mode) {
        this.currentMode = mode;

        // Update tab buttons
        document.getElementById('signTab').classList.toggle('active', mode === 'sign');
        document.getElementById('verifyTab').classList.toggle('active', mode === 'verify');

        // Update tab content
        document.getElementById('signMode').classList.toggle('active', mode === 'sign');
        document.getElementById('verifyMode').classList.toggle('active', mode === 'verify');

        this.updateUI();
    }

    // Toggle custom public key input for verification
    toggleCustomPublicKey() {
        this.useCustomPublicKey = !this.useCustomPublicKey;
        
        const container = document.getElementById('verifyCustomPublicKeyContainer');
        const button = document.getElementById('toggleVerifyPublicKeyBtn');
        
        if (this.useCustomPublicKey) {
            container.style.display = 'block';
            button.textContent = 'Use Own Public Key';
        } else {
            container.style.display = 'none';
            button.textContent = 'Use Custom Public Key';
        }
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
