
module.exports = class Validator {
  static validateString (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => value.length <= 0 || value.length > 255 );
  }

  static validateText (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => value.length <= 0 || value.length > 1000 );
  }

  static validatePhone (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => !/^\+[\d]{10,13}$/.test(value));
  }

  static validateCode (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => value.length !== 6);
  }

  static validateNumber (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => {
      try {
        Number.parseInt(value);
        return false;
      } catch (e) {
        return true;
      }
    });
  }

  static validateBool (value, name) {
    return value === true || value === false || value === 'false' || value === 'true' ? true : {[name.toLowerCase()]: `${name} isn't boolean`};;
  }

  static validateTime (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value));
  }

  static validateEmail (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => !/^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$/.test(value), false);
  }

  static validateTemplate(value, name, type, isNotCorrect, required = true) {
    if(typeof (value) !== type) {
      if(!required && value === undefined) {
        return true;
      }
      return {[name.toLowerCase().split(' ').join('_')]: `${name} is required`};
    }
    if(isNotCorrect()) {
      return {[name.toLowerCase().split(' ').join('_')]: `${name} isn't correct`};
    }
    return true;
  }
}