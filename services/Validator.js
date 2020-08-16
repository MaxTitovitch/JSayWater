
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

  static validateBool (value, name) {
    return value === true || value === false || value === 'false' || value === 'true' ? true : {[name.toLowerCase()]: `${name} isn't boolean`};;
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