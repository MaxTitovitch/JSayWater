
module.exports = class Validator {
  static validateString (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => value.length <= 0 || value.length > 255 );
  }

  static validatePhone (value, name) {
    return Validator.validateTemplate(value, name, 'string', () => !/^((8|\\+7)[\- ]?)?(\(?\d{3}\)?[\- ]?)?[\d\- ]{7,10}$/.test(value));
  }

  static validateTemplate(value, name, type, isNotCorrect) {
    if(typeof (value) !== type) {
      return {[name.toLowerCase()]: `${name} is required`};
    }
    if(isNotCorrect()) {
      return {[name.toLowerCase()]: `${name} isn't correct`};
    }
    return true;
  }
}