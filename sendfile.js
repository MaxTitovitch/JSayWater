const Sender = require("./services/Sender");
let user = {
    fcmtoken: '+375333038199',
    code: 'Name: Иван Иванов'
};


Sender.sendSMS(user.fcmtoken,  user.code);


// let s = '10:30'
// let e = '20:20'
// let inter = 1;
//
// let sHours = Number.parseInt(s.substr(0,2));
// let eHours = Number.parseInt(e.substr(0,2));
// let sMinutes = Number.parseInt(s.substr(3,2));
// let eMinutes = Number.parseInt(e.substr(3,2));
// let arrayTimes = [];
//
// for (let i = sHours; i <= eHours; i += inter) {
//     if(i === eHours && sMinutes > eMinutes){
//         break;
//     }
//     arrayTimes.push(i + ':' +s.substr(3, 2));
// }
// console.log(arrayTimes);

