
module.exports = class Service {
  static getUser() {
    return {
      name: '',
      phone: '',
      code: null,
      date_of_preregistration_end: '',
      photo: null,
      token: null,
      sound: false,
      notification: false,
      notification_time: null,
      date_of_next_send: null,
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

}