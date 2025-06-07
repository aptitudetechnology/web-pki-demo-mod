// File utilities for PGP operations
class FileUtils {
    constructor() {
        this.supportedFormats = ['txt', 'asc', 'pgp', 'key'];
    }

    // Save key pair to file
    async saveKeyPairToFile(keyPair, filename = null) {
        try {
            if (!keyPair || !keyPair.privateKey || !keyPair.publicKey) {
                throw new Error('Invalid key pair provided');
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const keyId = keyPair.metadata?.keyId || 'unknown';
            
            // Default filename if not provided
            const defaultFilename = filename || `keypair_${keyId}_${timestamp}.txt`;
            
            // Create file content
            const content = this.formatKeyPairForExport(keyPair);
            
            // Download file
            this.downloadTextFile(content, defaultFilename);
            
            return true;
        } catch (error) {
            console.error('Failed to save key pair to file:', error);
            throw new Error(`File save failed: ${error.message}`);
        }
    }

    // Save individual key to file
    async saveKeyToFile(keyData, keyType, filename = null) {
        try {
            if (!keyData) {
                throw new Error('No key data provided');
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const defaultFilename = filename || `${keyType}_key_${timestamp}.asc`;
            
            this.downloadTextFile(keyData, defaultFilename);
            
            return true;
        } catch (error) {
            console.error(`Failed to save ${keyType} key to file:`, error);
            throw new Error(`File save failed: ${error.message}`);
        }
    }

    // Load key from file
    async loadKeyFromFile(file) {
        try {
            if (!file) {
                throw new Error('No file provided');
            }

            // Validate file type
            if (!this.isValidKeyFile(file)) {
                throw new Error('Invalid file type. Supported formats: ' + this.supportedFormats.join(', '));
            }

            const content = await this.readFileAsText(file);
            
            // Validate content looks like a PGP key
            if (!this.isValidPGPContent(content)) {
                throw new Error('File does not contain valid PGP key data');
            }

            return {
                filename: file.name,
                content: content,
                size: file.size,
                lastModified: new Date(file.lastModified)
            };
        } catch (error) {
            console.error('Failed to load key from file:', error);
            throw new Error(`File load failed: ${error.message}`);
        }
    }

    // Save encrypted/signed content to file
    async saveContentToFile(content, filename, type = 'txt') {
        try {
            if (!content) {
                throw new Error('No content provided');
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const defaultFilename = filename || `pgp_${type}_${timestamp}.${type === 'encrypted' ? 'asc' : 'txt'}`;
            
            this.downloadTextFile(content, defaultFilename);
            
            return true;
        } catch (error) {
            console.error('Failed to save content to file:', error);
            throw new Error(`File save failed: ${error.message}`);
        }
    }

    // Load content from file for encryption/decryption
    async loadContentFromFile(file) {
        try {
            if (!file) {
                throw new Error('No file provided');
            }

            const content = await this.readFileAsText(file);
            
            return {
                filename: file.name,
                content: content,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified)
            };
        } catch (error) {
            console.error('Failed to load content from file:', error);
            throw new Error(`File load failed: ${error.message}`);
        }
    }

    // Format key pair for export
    formatKeyPairForExport(keyPair) {
        const header = `# PGP Key Pair Export
# Generated: ${new Date().toISOString()}
# Key ID: ${keyPair.metadata?.keyId || 'Unknown'}
# Algorithm: ${keyPair.metadata?.algorithm || 'Unknown'}
# User IDs: ${keyPair.metadata?.userIds?.join(', ') || 'Unknown'}

`;

        const privateKeySection = `# PRIVATE KEY
# Keep this secret and secure!
${keyPair.privateKey}

`;

        const publicKeySection = `# PUBLIC KEY
# Share this with others to receive encrypted messages
${keyPair.publicKey}
`;

        return header + privateKeySection + publicKeySection;
    }

    // Utility: Download text as file
    downloadTextFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    }

    // Utility: Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(new Error('Failed to read file: ' + error.message));
            };
            
            reader.readAsText(file);
        });
    }

    // Validation: Check if file is valid key file
    isValidKeyFile(file) {
        if (!file || !file.name) return false;
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        return this.supportedFormats.includes(extension) || file.type === 'text/plain';
    }

    // Validation: Check if content looks like PGP data
    isValidPGPContent(content) {
        if (!content || typeof content !== 'string') return false;
        
        const pgpMarkers = [
            '-----BEGIN PGP PUBLIC KEY BLOCK-----',
            '-----BEGIN PGP PRIVATE KEY BLOCK-----',
            '-----BEGIN PGP MESSAGE-----',
            '-----BEGIN PGP SIGNATURE-----'
        ];
        
        return pgpMarkers.some(marker => content.includes(marker));
    }

    // Get file info without reading content
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            isValidKeyFile: this.isValidKeyFile(file)
        };
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export for use in other modules
//window.FileUtils = FileUtils;

// ES6 Module Export (use this instead of window.FileUtils)
export { FileUtils };

// For backward compatibility with non-module scripts
if (typeof window !== 'undefined') {
    window.FileUtils = FileUtils;
}
