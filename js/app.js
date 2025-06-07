// app.js - Main application controller with centralized event handling
import { KeyManager } from './modules/keyManager.js';
import { CryptoOps } from './modules/cryptoOps.js';
import { SignVerify } from './modules/signVerify.js';
import { Encrypt } from './modules/encrypt.js';
import { Decrypt } from './modules/decrypt.js';
import { UIManager } from './modules/uiManager.js';
import { ModalManager } from './modules/modalManager.js';
import { TabManager } from './modules/tabManager.js';
import { Validation } from './utils/validation.js';
import { Formatting } from './utils/formatting.js';
import { Clipboard } from './utils/clipboard.js';

class PGPApp {
    constructor() {
        // Initialize modules
        this.keyManager = new KeyManager();
        this.cryptoOps = new CryptoOps();
        this.signVerify = new SignVerify();
        this.encrypt = new Encrypt();
        this.decrypt = new Decrypt();
        this.uiManager = new UIManager();
        this.modalManager = new ModalManager();
        this.tabManager = new TabManager();
        
        // Application state
        this.state = {
            currentKeyPair: null,
            isGenerating: false,
            advancedConfig: {
                algorithm: 'ecc',
                keySize: null,
                expiration: 63072000, // 2 years
                usage: {
                    sign: true,
                    encrypt: true,
                    certify: true
                },
                comment: ''
            },
            currentTab: 'sign'
        };
        
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Initializing PGP App...');
            
            // Check if OpenPGP.js is loaded
            if (typeof openpgp === 'undefined') {
                throw new Error('OpenPGP.js library not loaded');
            }

            // Setup all event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.uiManager.initializeUI();
            
            this.isInitialized = true;
            console.log('PGP App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.uiManager.showError(`Failed to initialize: ${error.message}`);
        }
    }

    // ==================== EVENT LISTENER SETUP ====================
    setupEventListeners() {
        // Key Generation Events
        this.bindElement('generateBtn', 'click', this.handleGenerateClick.bind(this));
        
        // Advanced Options Events
        this.bindElement('enableAdvancedOptions', 'change', this.handleAdvancedOptionsToggle.bind(this));
        
        // Modal Events
        this.bindElement('modalClose', 'click', () => this.modalManager.hideModal('advancedOptionsModal'));
        this.bindElement('modalCancel', 'click', () => this.modalManager.hideModal('advancedOptionsModal'));
        this.bindElement('modalApply', 'click', this.handleModalApply.bind(this));
        
        // File Operation Events
        this.bindElement('saveKeyBtn', 'click', this.handleSaveKey.bind(this));
        this.bindElement('loadKeyBtn', 'click', () => document.getElementById('keyFileInput').click());
        this.bindElement('keyFileInput', 'change', this.handleFileLoad.bind(this));
        
        // Tab Events
        this.bindElement('signTab', 'click', () => this.tabManager.switchTab('sign'));
        this.bindElement('verifyTab', 'click', () => this.tabManager.switchTab('verify'));
        
        // Sign/Verify Events
        this.bindElement('signBtnNew', 'click', this.handleSignMessage.bind(this));
        this.bindElement('verifyBtn', 'click', this.handleVerifyMessage.bind(this));
        this.bindElement('toggleVerifyPublicKeyBtn', 'click', this.handleToggleVerifyPublicKey.bind(this));
        
        // Encryption Events
        this.bindElement('encryptBtn', 'click', this.handleEncrypt.bind(this));
        this.bindElement('toggleEncryptPublicKeyBtn', 'click', this.handleToggleEncryptPublicKey.bind(this));
        
        // Decryption Events
        this.bindElement('decryptBtn', 'click', this.handleDecrypt.bind(this));
        
        // Advanced Options Form Events
        this.bindAdvancedOptionsEvents();
        
        // Global Events
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        window.addEventListener('error', this.handleGlobalError.bind(this));
        
        // Modal overlay click to close
        this.bindElement('advancedOptionsModal', 'click', (e) => {
            if (e.target.id === 'advancedOptionsModal') {
                this.modalManager.hideModal('advancedOptionsModal');
            }
        });
        
        console.log('All event listeners setup complete');
    }

    // Helper method to safely bind events
    bindElement(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`Bound ${event} event to #${id}`);
        } else {
            console.warn(`Element #${id} not found for event binding`);
        }
    }

    // Bind advanced options form events
    bindAdvancedOptionsEvents() {
        // Algorithm radio buttons
        const algorithmRadios = document.querySelectorAll('input[name="algorithm"]');
        algorithmRadios.forEach(radio => {
            radio.addEventListener('change', this.handleAlgorithmChange.bind(this));
        });
        
        // Key expiration
        this.bindElement('keyExpiration', 'change', this.handleExpirationChange.bind(this));
        
        // Usage checkboxes
        this.bindElement('usageSign', 'change', this.handleUsageChange.bind(this));
        this.bindElement('usageEncrypt', 'change', this.handleUsageChange.bind(this));
        this.bindElement('usageCertify', 'change', this.handleUsageChange.bind(this));
        
        // Comment field
        this.bindElement('keyComment', 'input', this.handleCommentChange.bind(this));
    }

    // ==================== EVENT HANDLERS ====================
    
    async handleGenerateClick() {
        try {
            this.uiManager.setLoading('generateBtn', true);
            this.state.isGenerating = true;
            
            // Validate user input
            const userInfo = this.validateUserInput();
            
            // Generate key pair using KeyManager
            const keyPair = await this.keyManager.generateKeyPair(userInfo, this.state.advancedConfig);
            
            // Update application state
            this.state.currentKeyPair = keyPair;
            
            // Update UI
            this.uiManager.updateKeyInfo(keyPair);
            this.uiManager.showSuccess('Key pair generated successfully!');
            this.updateButtonStates();
            
            console.log('Key pair generated successfully');
            
        } catch (error) {
            console.error('Key generation failed:', error);
            this.uiManager.showError(`Key generation failed: ${error.message}`);
        } finally {
            this.uiManager.setLoading('generateBtn', false);
            this.state.isGenerating = false;
        }
    }

    handleAdvancedOptionsToggle(event) {
        const isEnabled = event.target.checked;
        const advancedDesc = document.getElementById('advanced-desc');
        const currentSettingsDisplay = document.getElementById('currentSettingsDisplay');
        
        if (isEnabled) {
            advancedDesc.classList.remove('hidden');
            currentSettingsDisplay.style.display = 'block';
            this.modalManager.showModal('advancedOptionsModal');
            this.updateCurrentSettingsDisplay();
        } else {
            advancedDesc.classList.add('hidden');
            currentSettingsDisplay.style.display = 'none';
        }
    }

    handleModalApply() {
        this.updateCurrentSettingsDisplay();
        this.modalManager.hideModal('advancedOptionsModal');
        this.uiManager.showSuccess('Advanced settings applied');
    }

    async handleSaveKey() {
        if (!this.state.currentKeyPair) {
            this.uiManager.showError('No key pair to save');
            return;
        }
        
        try {
            await this.keyManager.saveKeyPair(this.state.currentKeyPair);
            this.uiManager.showSuccess('Key pair saved successfully');
        } catch (error) {
            console.error('Save failed:', error);
            this.uiManager.showError(`Save failed: ${error.message}`);
        }
    }

    async handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.uiManager.setLoading('loadKeyBtn', true);
            
            const keyPair = await this.keyManager.loadKeyPair(file);
            this.state.currentKeyPair = keyPair;
            
            this.uiManager.updateKeyInfo(keyPair);
            this.uiManager.showSuccess('Key pair loaded successfully');
            this.updateButtonStates();
            
        } catch (error) {
            console.error('Load failed:', error);
            this.uiManager.showError(`Load failed: ${error.message}`);
        } finally {
            this.uiManager.setLoading('loadKeyBtn', false);
        }
    }

    async handleSignMessage() {
        if (!this.state.currentKeyPair) {
            this.uiManager.showError('No key pair loaded for signing');
            return;
        }
        
        try {
            const message = document.getElementById('messageToSignNew').value.trim();
            if (!message) {
                this.uiManager.showError('Please enter a message to sign');
                return;
            }
            
            this.uiManager.setLoading('signBtnNew', true);
            
            const signedMessage = await this.signVerify.signMessage(message, this.state.currentKeyPair);
            
            this.uiManager.showOutput('signOutputNew', 'Signed Message:', signedMessage);
            this.uiManager.showSuccess('Message signed successfully');
            
        } catch (error) {
            console.error('Signing failed:', error);
            this.uiManager.showError(`Signing failed: ${error.message}`);
        } finally {
            this.uiManager.setLoading('signBtnNew', false);
        }
    }

    async handleVerifyMessage() {
        try {
            const signedMessage = document.getElementById('signedMessageToVerify').value.trim();
            if (!signedMessage) {
                this.uiManager.showError('Please enter a signed message to verify');
                return;
            }
            
            this.uiManager.setLoading('verifyBtn', true);
            
            // Check if using custom public key
            const customKeyContainer = document.getElementById('verifyCustomPublicKeyContainer');
            let publicKey = null;
            
            if (customKeyContainer.style.display !== 'none') {
                const customKeyText = document.getElementById('verifyCustomPublicKey').value.trim();
                if (customKeyText) {
                    publicKey = customKeyText;
                }
            } else if (this.state.currentKeyPair) {
                publicKey = this.state.currentKeyPair.publicKey;
            }
            
            const result = await this.signVerify.verifyMessage(signedMessage, publicKey);
            
            this.uiManager.showVerifyResult('verifyOutput', result);
            
        } catch (error) {
            console.error('Verification failed:', error);
            this.uiManager.showError(`Verification failed: ${error.message}`);
        } finally {
            this.uiManager.setLoading('verifyBtn', false);
        }
    }

    handleToggleVerifyPublicKey() {
        const container = document.getElementById('verifyCustomPublicKeyContainer');
        const button = document.getElementById('toggleVerifyPublicKeyBtn');
        
        if (container.style.display === 'none') {
            container.style.display = 'block';
            button.textContent = 'Use Own Public Key';
        } else {
            container.style.display = 'none';
            button.textContent = 'Use Custom Public Key';
        }
    }

    async handleEncrypt() {
        try {
            const message = document.getElementById('messageToEncrypt').value.trim();
            if (!message) {
                this.uiManager.showError('Please enter a message to encrypt');
                return;
            }
            
            this.uiManager.setLoading('encryptBtn', true);
            
            // Check if using custom public key
            const customKeyContainer = document.getElementById('encryptCustomPublicKeyContainer');
            let publicKey = null;
            
            if (customKeyContainer.style.display !== 'none') {
                const customKeyText = document.getElementById('encryptCustomPublicKey').value.trim();
                if (customKeyText) {
                    publicKey = customKeyText;
                }
            } else if (this.state.currentKeyPair) {
                publicKey = this.state.currentKeyPair.publicKey;
            }
            
            if (!publicKey) {
                this.uiManager.showError('No public key available for encryption');
                return;
            }
            
            const encryptedMessage = await this.encrypt.encryptMessage(message, publicKey);
            
            this.uiManager.showOutput('encryptOutput', 'Encrypted Message:', encryptedMessage);
            this.uiManager.showSuccess('Message encrypted successfully');
            
        } catch (error) {
            console.error('Encryption failed:', error);
            this.uiManager.showError(`Encryption failed: ${error.message}`);
        } finally {
            this.uiManager.setLoading('encryptBtn', false);
        }
    }

    handleToggleEncryptPublicKey() {
        const container = document.getElementById('encryptCustomPublicKeyContainer');
        const button = document.getElementById('toggleEncryptPublicKeyBtn');
        
        if (container.style.display === 'none') {
            container.style.display = 'block';
            button.textContent = 'Use Own Public Key';
        } else {
            container.style.display = 'none';
            button.textContent = 'Use Custom Public Key';
        }
    }

    async handleDecrypt() {
        if (!this.state.currentKeyPair) {
            this.uiManager.showError('No private key loaded for decryption');
            return;
        }
        
        try {
            const encryptedMessage = document.getElementById('messageToDecrypt').value.trim();
            if (!encryptedMessage) {
                this.uiManager.showError('Please enter an encrypted message to decrypt');
                return;
            }
            
            this.uiManager.setLoading('decryptBtn', true);
            
            const decryptedMessage = await this.decrypt.decryptMessage(encryptedMessage, this.state.currentKeyPair);
            
            this.uiManager.showOutput('decryptOutput', 'Decrypted Message:', decryptedMessage);
            this.uiManager.showSuccess('Message decrypted successfully');
            
        } catch (error) {
            console.error('Decryption failed:', error);
            this.uiManager.showError(`Decryption failed: ${error.message}`);
        } finally {
            this.uiManager.setLoading('decryptBtn', false);
        }
    }

    // Advanced options handlers
    handleAlgorithmChange(event) {
        this.state.advancedConfig.algorithm = event.target.value;
        console.log('Algorithm changed to:', event.target.value);
    }

    handleExpirationChange(event) {
        this.state.advancedConfig.expiration = parseInt(event.target.value);
        console.log('Expiration changed to:', event.target.value);
    }

    handleUsageChange() {
        this.state.advancedConfig.usage = {
            sign: document.getElementById('usageSign').checked,
            encrypt: document.getElementById('usageEncrypt').checked,
            certify: document.getElementById('usageCertify').checked
        };
        console.log('Usage changed to:', this.state.advancedConfig.usage);
    }

    handleCommentChange(event) {
        this.state.advancedConfig.comment = event.target.value;
        console.log('Comment changed to:', event.target.value);
    }

    // Global event handlers
    handleGlobalKeydown(event) {
        if (event.key === 'Escape') {
            // Close any open modals
            this.modalManager.hideModal('advancedOptionsModal');
        }
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.uiManager.showError(`Unexpected error: ${event.error?.message || 'Unknown error'}`);
    }

    // ==================== UTILITY METHODS ====================
    
    validateUserInput() {
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const passphrase = document.getElementById('passphrase').value;
        
        if (!name) throw new Error('Name is required');
        if (!email) throw new Error('Email is required');
        if (!passphrase) throw new Error('Passphrase is required');
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (passphrase.length < 8) {
            throw new Error('Passphrase must be at least 8 characters long');
        }
        
        return { name, email, passphrase };
    }

    updateButtonStates() {
        const hasKeys = this.state.currentKeyPair !== null;
        
        // Enable/disable buttons based on key availability
        this.uiManager.setButtonState('saveKeyBtn', hasKeys);
        this.uiManager.setButtonState('signBtnNew', hasKeys);
        this.uiManager.setButtonState('verifyBtn', true); // Can verify with custom key
        this.uiManager.setButtonState('encryptBtn', true); // Can encrypt with custom key
        this.uiManager.setButtonState('decryptBtn', hasKeys);
        
        // Update status indicators
        this.updateStatusIndicators(hasKeys);
    }

    updateStatusIndicators(hasKeys) {
        const status = hasKeys ? 'Ready' : 'Keys Required';
        const statusClass = hasKeys ? 'ready' : 'pending';
        
        this.uiManager.updateStatus('keyStatus', hasKeys ? 'Keys Loaded' : 'No Keys', statusClass);
        this.uiManager.updateStatus('signVerifyStatus', status, statusClass);
        this.uiManager.updateStatus('encryptStatus', status, statusClass);
        this.uiManager.updateStatus('decryptStatus', status, statusClass);
    }

    updateCurrentSettingsDisplay() {
        const algorithmText = this.getAlgorithmDisplayText(this.state.advancedConfig.algorithm);
        const expirationText = this.getExpirationDisplayText(this.state.advancedConfig.expiration);
        const usageText = this.getUsageDisplayText(this.state.advancedConfig.usage);
        
        document.getElementById('currentAlgorithm').textContent = algorithmText;
        document.getElementById('currentExpiration').textContent = expirationText;
        document.getElementById('currentUsage').textContent = usageText;
    }

    getAlgorithmDisplayText(algorithm) {
        switch (algorithm) {
            case 'ecc': return 'ECC (Curve25519)';
            case 'rsa2048': return 'RSA 2048-bit';
            case 'rsa4096': return 'RSA 4096-bit';
            default: return 'ECC (Curve25519)';
        }
    }

    getExpirationDisplayText(expiration) {
        switch (expiration) {
            case 0: return 'Never expires';
            case 31536000: return '1 year';
            case 63072000: return '2 years';
            case 94608000: return '3 years';
            case 157680000: return '5 years';
            default: return '2 years';
        }
    }

    getUsageDisplayText(usage) {
        const capabilities = [];
        if (usage.sign) capabilities.push('Sign');
        if (usage.encrypt) capabilities.push('Encrypt');
        if (usage.certify) capabilities.push('Certify');
        return capabilities.join(', ') || 'None';
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing PGP App...');
    
    // Create and initialize the main app
    window.pgpApp = new PGPApp();
    await window.pgpApp.init();
    
    console.log('PGP App ready! Access via window.pgpApp');
});
