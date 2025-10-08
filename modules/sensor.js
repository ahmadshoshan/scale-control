// // modules/sensor.js
// let match1 = '';
// let lastMessage = '';
// let NE = '00';
// let type_id = '';
// let customer_id = '';


// function toArabicNumbers(input) {
//     input = input.toString().trim();
//     if (input.includes('/')) return input.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
//     let onlyNumbers = input.replace(/[^0-9]/g, '');
//     return onlyNumbers.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
// }


// function handleSensorLine(line, io, playSoundAlert) {
//     const currentMessage = line.trim();
//     if (currentMessage !== lastMessage) {
//         console.log('rec ::', currentMessage);
//         if (currentMessage.slice(-2).toUpperCase() === 'NE') {
//             NE = currentMessage;
//             console.log('ne ::', NE);
//         }
//         lastMessage = currentMessage;
//     }


//     io.emit('response', line.trim());
//     let cleanedWeight = line.replace(/[^0-9.-]/g, '');
//     const weight = parseFloat(cleanedWeight.trim());


//     if (!isNaN(weight) && weight < -10) playSoundAlert('yagib_tasfier_almezan.mp3');
//     if (!isNaN(weight) && weight > 300) playSoundAlert('yogad_sayara_almezan1.mp3');


//     function startsWithGross(message) { return message.startsWith('GROSS{'); }
//     function startsWithDate(date) { return date.startsWith('DATE{'); }


//     if (startsWithGross(currentMessage) && match === '') {
//         match = currentMessage.match(/^GROSS\{(.*)\}$/);
//     }
//     if (startsWithDate(currentMessage) && match1 === '') {
//         match1 = currentMessage.match(/^DATE\{(.*)\}$/);
//         const query = 'INSERT INTO sensor_data (data_value,date,number,type,customer) VALUES (?,?,?,?,?)';
//         pool.query(query, [match[1], match1[1], NE, type_id, customer_id], (err) => {
//             if (err) console.error('err db:', err.message);
//             else console.log('save in db.');
//             type_id = '';
//             customer_id = '';
//             match = '';
//             match1 = '';
//             NE = '';
//             io.emit('responseID', '');
//         });
//     }
// }


// function setPendingTypeCustomer(t, c) { type_id = t || ''; customer_id = c || ''; }


// module.exports = { handleSensorLine, setPendingTypeCustomer, toArabicNumbers };