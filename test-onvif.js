const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const app = express();

app.use(express.static('public'));

// استخدم '0.0.0.0' عشان تسمح لأي جهاز في الشبكة يتصل
const server = app.listen(3000, '192.168.1.222', () => {
    console.log('Server started on port 3000');
    console.log('Available on:');
    console.log('  - http://localhost:3000');
    
    // اعرض الـ IPات المتاحة
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`  - http://${iface.address}:3000`);
            }
        }
    }
});

const wss = new WebSocket.Server({ server });

// استخدم رابط RTSP الصحيح من تجربتك السابقة
const rtspUrl = 'rtsp://admin:admin100@192.168.1.2:554/ISAPI/Streaming/Channels/201';

console.log('Starting FFmpeg with RTSP URL:', rtspUrl);

const ffmpeg = spawn('C:\\ffmpeg\\bin\\ffmpeg.exe', [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-r', '25',
    '-b:v', '800k',
    '-bf', '0',
    '-codec:a', 'mp2',
    '-ar', '44100',
    '-ac', '1',
    '-b:a', '128k',
    '-'
]);

ffmpeg.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('FFmpeg:', output);
    
    if (output.includes('Unauthorized') || output.includes('401')) {
        console.error('❌ خطأ: اسم المستخدم أو كلمة المرور غير صحيحة');
    } else if (output.includes('Connection refused')) {
        console.error('❌ خطأ: لا يمكن الاتصال بالكاميرا');
    } else if (output.includes('404')) {
        console.error('❌ خطأ: مسار RTSP غير صحيح');
    }
});

ffmpeg.on('error', (error) => {
    console.error('FFmpeg process error:', error);
});

ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
});

// إدارة اتصالات WebSocket
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`Client connected from ${clientIp}`);
    
    const sendVideoData = (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    };
    
    ffmpeg.stdout.on('data', sendVideoData);
    
    ws.on('close', () => {
        console.log(`Client disconnected from ${clientIp}`);
        ffmpeg.stdout.removeListener('data', sendVideoData);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

let dataCount = 0;
ffmpeg.stdout.on('data', () => {
    dataCount++;
    if (dataCount === 1) {
        console.log('✅ FFmpeg is producing video data');
    }
});