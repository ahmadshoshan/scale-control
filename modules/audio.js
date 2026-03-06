// // modules/audio.js
// const fs = require('fs');
// const play = require('play-sound')();
// // const play = require('sound-play');


// let isPlaying = false;
// const delayTime = 5000;


// function playSoundAlert(nameFile, io) {
//     const filePath = `./audio/${nameFile}`;
//     if (isPlaying) return;
//     isPlaying = true;
//     fs.access(filePath, fs.constants.F_OK, (err) => {
//         if (err) {
//             console.error('audio missing', filePath);
//             isPlaying = false; return;
//         }
//         // io.emit('play-audio', `${nameFile}`);
//         // ✅ بس لو io متبعت من السيرفر
//         if (io) io.emit('play-audio', nameFile);
//         // play.play(filePath, { player: 'wmplayer' }, (err) => {

//         // play.play(filePath, { player: 'cmdmp3' }, (err) => {
//         //     if (err) console.error('play error', err.message);
//         //     setTimeout(() => { isPlaying = false; }, delayTime);
//         // });

//  try {
//             play.play(filePath, (err) => {
//                 if (err) console.error('play error', err);
//                 setTimeout(() => { isPlaying = false; }, delayTime);
//             });
//         } catch (err) {
//             console.error('Unexpected error:', err);
//             isPlaying = false;
//         }

//     });
// }


// module.exports = { playSoundAlert };
// modules/audio.js


const path = require('path');
const fs = require('fs');
const sound = require('sound-play');

let isPlaying = false;
const delayTime = 5000;

function playSoundAlert(fileName, io) {
    if (isPlaying) return;
    isPlaying = true;

    const filePath = path.join(__dirname, '../audio', fileName);

    fs.access(filePath, fs.constants.F_OK, async (err) => {
        if (err) {
            console.error('Audio file missing:', filePath);
            isPlaying = false;
            return;
        }

        // لو عايز ترسل للواجهة
        if (io) io.emit('play-audio', fileName);

        // try {
        //     await sound.play(filePath); // 🔥 بدون CMD أو PowerShell
        // } catch (err) {
        //     console.error('Audio play error:', err.message);
        // }

        setTimeout(() => { isPlaying = false; }, delayTime);
    });
}

module.exports = { playSoundAlert };