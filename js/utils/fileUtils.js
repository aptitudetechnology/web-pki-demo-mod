export class FileUtils {
    constructor() {
        this.supportedFormats = ['txt', 'asc', 'pgp', 'key', 'json'];
    }

    // Save key pair with format options
    async saveKeyPairToFile(keyPair, filename = null, format = 'json') {
        if (!keyPair) {
            throw new Error('No key pair provided to save');
        }

        try {
            if (format === 'json') {
                return await this.saveKeyPairAsJson(keyPair, filename);
            } else {
                return await this.saveKeyPairAsText(keyPair, filename);
            }
        } catch (error) {
            console.error('Failed to save key pair:', error);
            throw new Error(`Failed to save key pair: ${error.message}`);
        }
    }

    // Save key pair as JSON (recommended)
    async saveKeyPairAsJson(keyPair, filename = null) {
        const keyData = {
            fileVersion: '1.0',
            exportedAt: new Date().toISOString(),
            exportedBy: 'PGP Web App',
            
            keys: {
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            },
            
            metadata: {
                keyId: keyPair.metadata?.keyId || 'Unknown',
                fingerprint: keyPair.metadata?.fingerprint || 'Unknown',
                algorithm: keyPair.metadata?.algorithm || 'Unknown',
                created: keyPair.metadata?.created ? 
                    keyPair.metadata.created.toISOString() : 
                    new Date().toISOString(),
                userIds: keyPair.metadata?.userIds || []
            },
            
            keyInfo: {
                hasPrivateKey: !!keyPair.privateKey,
                hasPublicKey: !!keyPair.publicKey,
                isComplete: !!(keyPair.privateKey && keyPair.publicKey)
            }
        };

        const jsonContent = JSON.stringify(keyData, null, 2);

        if (!filename) {
            const timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-')
                .replace('T', '_')
                .split('.')[0];
            
            const keyId = keyPair.metadata?.keyId || 'unknown';
            filename = `pgp-keypair-${keyId}-${timestamp}.json`;
        }

        if (!filename.toLowerCase().endsWith('.json')) {
            filename += '.json';
        }

        await this.downloadFile(jsonContent, filename, 'application/json');

        return {
            success: true,
            filename: filename,
            size: jsonContent.length,
            format: 'json'
        };
    }

    // Save key pair as text (legacy format)
    async saveKeyPairAsText(keyPair, filename = null) {
        const content = this.formatKeyPairForExport(keyPair);
        
        if (!filename) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const keyId = keyPair.metadata?.keyId || 'unknown';
            filename = `keypair_${keyId}_${timestamp}.txt`;
        }

        await this.downloadFile(content, filename, 'text/plain');

        return {
            success: true,
            filename: filename,
            size: content.length,
            format: 'text'
        };
    }

    // Load key from file (supports both formats)
    async loadKeyFromFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        try {
            // Validate file type
            if (!this.isValidKeyFile(file)) {
                throw new Error('Invalid file type. Supported formats: ' + this.supportedFormats.join(', '));
            }

            const content = await this.readFileAsText(file);
            
            // Try to parse as JSON first
            if (this.isJsonFile(file.name) || content.trim().startsWith('{')) {
                return await this.loadKeyPairFromJson(content, file);
            }
            
            // Otherwise, treat as armored key file
            return await this.loadArmoredKeyFromFile(content, file);

        } catch (error) {
            console.error('Failed to load key from file:', error);
            throw new Error(`Failed to load key: ${error.message}`);
        }
    }

    // Load key pair from JSON format
    async loadKeyPairFromJson(content, file) {
        try {
            const keyData = JSON.parse(content);
            
            if (!keyData.keys || (!keyData.keys.publicKey && !keyData.keys.privateKey)) {
                throw new Error('Invalid key pair JSON format');
            }

            return {
                content: keyData.keys.privateKey || keyData.keys.publicKey,
                filename: file.name,
                size: file.size,
                lastModified: new Date(file.lastModified),
                isJsonFormat: true,
                metadata: keyData.metadata,
                keyData: keyData,
                keys: keyData.keys
            };

        } catch (parseError) {
            throw new Error(`Invalid JSON key file: ${parseError.message}`);
        }
    }

    // Load armored key from file
    async loadArmoredKeyFromFile(content, file) {
        // Validate content looks like a PGP key
        if (!this.isValidPGPContent(content)) {
            throw new Error('File does not contain valid PGP key data');
        }

        return {
            content: content,
            filename: file.name,
            size: file.size,
            lastModified: new Date(file.lastModified),
            isJsonFormat: false
        };
    }

    // Save individual key to file
    async saveKeyToFile(keyContent, keyType, filename = null) {
        if (!keyContent) {
            throw new Error(`No ${keyType} key content provided`);
        }

        try {
            if (!filename) {
                const timestamp = new Date().toISOString()
                    .replace(/[:.]/g, '-')
                    .replace('T', '_')
                    .split('.')[0];
                
                filename = `pgp-${keyType}-key-${timestamp}.asc`;
            }

            if (!filename.toLowerCase().endsWith('.asc') && 
                !filename.toLowerCase().endsWith('.txt')) {
                filename += '.asc';
            }

            await this.downloadFile(keyContent, filename, 'text/plain');

            return {
                success: true,
                filename: filename,
                size: keyContent.length
            };

        } catch (error) {
            console.error(`Failed to save ${keyType} key:`, error);
            throw new Error(`Failed to save ${keyType} key: ${error.message}`);
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
            
            await this.downloadFile(content, defaultFilename, 'text/plain');
            
            return {
                success: true,
                filename: defaultFilename,
                size: content.length
            };
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

    // Format key pair for text export
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

    // Helper method to download file
    async downloadFile(content, filename, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resolve();
                }, 100);

            } catch (error) {
                reject(new Error(`Download failed: ${error.message}`));
            }
        });
    }

    // Helper method to read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    // Validation methods
    isValidKeyFile(file) {
        if (!file || !file.name) return false;
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        return this.supportedFormats.includes(extension) || file.type === 'text/plain';
    }

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

    isJsonFile(filename) {
        return filename.toLowerCase().endsWith('.json');
    }

    // Utility methods
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            isValidKeyFile: this.isValidKeyFile(file),
            formattedSize: this.formatFileSize(file.size)
        };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// For backward compatibility
if (typeof window !== 'undefined') {
    window.FileUtils = FileUtils;
}
