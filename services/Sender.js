let FCM = require('fcm-node');
//put your server key here
let serverKey = 'AAAA0Lugnvw:APA91bHFrle_ozxFQT9S83tg3__4K90oAbdJyxFlhVa-PUiGK6ymhwk54014VGqJVRE83_HAtIw_KdbxIe6TiN1yJ-Gtif4HtEamegMhTl3X60BhJ4mXNtzKgipIE5zMO7OtfFCGg8M-';
let fcm = new FCM(serverKey);

module.exports = class Service {
  static send(deviceId, code) {
    
    let message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: deviceId,

      notification: {
        title: 'JSay',
        body: `Code: ${code}`
      },
    };

    fcm.send(message, function (err, response) {
      if (err) {
        console.log("Something has gone wrong!");
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });
  }
  
};