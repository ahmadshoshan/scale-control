// core/CameraService.js
const fs = require('fs');
const DigestFetch = require('digest-fetch').default;

class CameraService {
    constructor(username = 'admin', password = 'admin100') {
        this.client = new DigestFetch(username, password);
        this.urls = [
            'http://192.168.1.2/ISAPI/Streaming/channels/201/picture',
            'http://192.168.1.2/ISAPI/Streaming/channels/401/picture',
            'http://192.168.1.2/ISAPI/Streaming/channels/701/picture'
        ];
    }

    async captureImage(imageId, path) {
        try {
            const promises = this.urls.map(async (url, index) => {
                try {
                    const response = await this.client.fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const buffer = await response.arrayBuffer();
                    const fileName = `public/images/${path}/${imageId}_cam${index + 1}.jpg`;
                    
                    // التأكد من وجود المجلد
                    const dir = `public/images/${path}`;
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    
                    fs.writeFileSync(fileName, Buffer.from(buffer));
                    console.log(`📷 cam ${index + 1} saved`);
                    return fileName;
                } catch (error) {
                    console.error(`❌ cam ${index + 1}:`, error.message || error);
                    return null;
                }
            });

            const savedFiles = await Promise.all(promises);
            const successful = savedFiles.filter(f => f !== null).length;
            console.log(`✅ Saved ${successful}/${this.urls.length} camera images`);
            
            return savedFiles;
        } catch (error) {
            console.error('❌ Error capturing images:', error.message || error);
            return [null, null, null];
        }
    }
}

module.exports = CameraService;