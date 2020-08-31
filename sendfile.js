const Sender = require("./services/Sender");
let user = {
    fcmtoken: '+375333038199',
    code: '330022'
};


Sender.sendSMS(user.fcmtoken,  user.code);