export const Formatting = {
    // Format fingerprint with spaces for readability
    formatFingerprint(fingerprint) {
        if (!fingerprint) return '';
        return fingerprint.replace(/(.{4})/g, '$1 ').trim().toUpperCase();
    },

    // Format date for display
    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format key algorithm for display
    formatAlgorithm(algorithm) {
        if (!algorithm) return 'Unknown';
        
        switch(algorithm.toLowerCase()) {
            case 'ecc':
                return 'ECC (Curve25519)';
            case 'rsa2048':
                return 'RSA 2048-bit';
            case 'rsa4096':
                return 'RSA 4096-bit';
            case 'rsa':
                return 'RSA';
            default:
                return algorithm.toUpperCase();
        }
    },

    // Format expiration time for display
    formatExpiration(seconds) {
        if (!seconds || seconds === 0) {
            return 'Never expires';
        }
        
        const years = Math.round(seconds / 31536000);
        return `${years} year${years !== 1 ? 's' : ''}`;
    },

    // Format key usage for display
    formatUsage(usage) {
        if (!usage) return 'None';
        
        const usages = [];
        if (usage.sign) usages.push('Sign');
        if (usage.encrypt) usages.push('Encrypt');
        if (usage.certify) usages.push('Certify');
        
        return usages.join(', ') || 'None selected';
    },

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Truncate text for display
    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // Format PGP message for display (truncated)
    formatPGPMessagePreview(message, maxLines = 5) {
        if (!message) return '';
        
        const lines = message.split('\n');
        if (lines.length <= maxLines) return message;
        
        return lines.slice(0, maxLines).join('\n') + '\n... (truncated)';
    },

    // Clean filename for download
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9.-]/gi, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
    },

    // Generate filename for key backup
    generateKeyBackupFilename(name, email) {
        const timestamp = Date.now();
        const safeName = this.sanitizeFilename(name || 'user');
        return `pgp-keys-${safeName}-${timestamp}.json`;
    }
};
