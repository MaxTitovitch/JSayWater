// let FCM = require('fcm-node');
// let serverKey = 'YOURSERVERKEYHERE'; // Put your server key here
// let fcm = new FCM(serverKey);

module.exports = class Service {
  static send(deviceId, code) {
    // let message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    //   to: 'registration_token',
    //   collapse_key: 'your_collapse_key',
    //
    //   notification: {
    //     title: 'JSay registration code',
    //     body: { message: code}
    //   },
    //
    // };
    //
    // fcm.send(message, function(err, response){
    //   if (err) {
    //     console.log("Something has gone wrong!");
    //   } else {
    //     console.log("Successfully sent with response: ", response);
    //   }
    // });
    console.log(deviceId, code)
  }

};