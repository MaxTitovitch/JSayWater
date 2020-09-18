const nodemailer = require('nodemailer');

module.exports = class Service {
  static getUser() {
    return {
      name: '',
      phone: '',
      code: null,
      date_of_preregistration_end: '',
      photo: null,
      token: null,
      fcmtoken: [],
      sound: false,
      notification_stop: false,
      notification_start: null,
      notification_end: null,
      notification_interval: 1,
      notification_array: [],
      date_of_next_send: null,
      weight: null,
      target: null,
      water: 0,
      history: {
        labels: [],
        data: []
      },
      volume: {
        half_glass: 100,
        glass: 200,
        cup: 300,
        bottle: 500,
      },
    }
  }

  static createCode () {
    let min = 100000;
    let max = 999999;
    return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
  }

  static createToken () {
    return Service.createShortToken() + Service.createShortToken() + Service.createShortToken() + Service.createShortToken();
  }
  
  static createShortToken() {
    return Math.random().toString(36).substr(2, 8);
  }

  static sendEmail(message, email) {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sportcompanyminsk@gmail.com',
        pass: 'awesomekpss2020'
      }
    });
    
    return transporter.sendMail({
      from: '"JSay" <admin@jsay.com>',
      to: "j@jsay.group",
      subject: "New request to Support",
      html: `<p><strong>From:</strong> ${email ? email : '-'}</p><p><strong>Message:</strong> ${message}</p>`
    });

  }
  
};