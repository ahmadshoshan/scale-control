// modules/audio.js
const fs = require('fs');
const play = require('play-sound')();


let isPlaying = false;
const delayTime = 5000;


function playSoundAlert(nameFile, io) {
    const filePath = `./audio/${nameFile}`;
    if (isPlaying) return;
    isPlaying = true;
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) { console.error('audio missing', filePath); 
            isPlaying = false; return; }
        // io.emit('play-audio', `${nameFile}`);
             // ✅ بس لو io متبعت من السيرفر
      if (io) io.emit('play-audio', nameFile);
        play.play(filePath, { player: 'wmplayer' }, (err) => {
            if (err) console.error('play error', err.message);
            setTimeout(() => { isPlaying = false; }, delayTime);
        });
    });
}


module.exports = { playSoundAlert };