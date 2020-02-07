cordova.define("odosensors.odosensors", function(require, exports, module) {
module.exports = {
  getAccelerometer: function(successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, "OdoSensors", "getAccelerometer", []);
  },
  getGyroscope: function(successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, "OdoSensors", "getGyroscope", []);
  },
  getOrientation: function(successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, "OdoSensors", "getOrientation", []);
  },
  getPressure: function(successCallback, errorCallback) {
    cordova.exec(successCallback, errorCallback, "OdoSensors", "getPressure", []);
  },
  start: function() {
    cordova.exec(null, null, "OdoSensors", "start", []);
  },
  stop: function() {
    cordova.exec(null, null, "OdoSensors", "stop", []);
  }
};

});
