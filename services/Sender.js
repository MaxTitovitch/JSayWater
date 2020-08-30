let FCM = require('fcm-node');
//put your server key here
let serverKey = 'AAAA0Lugnvw:APA91bHFrle_ozxFQT9S83tg3__4K90oAbdJyxFlhVa-PUiGK6ymhwk54014VGqJVRE83_HAtIw_KdbxIe6TiN1yJ-Gtif4HtEamegMhTl3X60BhJ4mXNtzKgipIE5zMO7OtfFCGg8M-';
let fcm = new FCM(serverKey);
var firebase = require("firebase/app");

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
        console.log("Something has gone wrong!", err);
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });
  }

  static sendSMSCode () {
    import * as Twilio from 'twilio';

// getting ready
    const twilioNumber = 'your-twilio-number';
    const accountSid = 'AC-something';
    const authToken = 'something-something';

    const client = new Twilio(accountSid, authToken);

// start sending message

    function sendText(){
      const phoneNumbers = [ '+375333038199']

      phoneNumbers.map(phoneNumber => {
        console.log(phoneNumber);

        if ( !validE164(phoneNumber) ) {
          throw new Error('number must be E164 format!')
        }

        const textContent = {
          body: `You have a new sms from Dale Nguyen :)`,
          to: phoneNumber,
          from: twilioNumber
        }

        client.messages.create(textContent)
            .then((message) => console.log(message.to))
      })
    }

// Validate E164 format
    function validE164(num) {
      return /^\+?[1-9]\d{1,14}$/.test(num)
    }
  }

};