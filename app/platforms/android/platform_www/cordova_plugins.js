cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
  {
    "id": "cordova-plugin-osc.OSC",
    "file": "plugins/cordova-plugin-osc/www/OSC.js",
    "pluginId": "cordova-plugin-osc",
    "clobbers": [
      "window.OSC"
    ]
  },
  {
    "id": "odosensors.odosensors",
    "file": "plugins/odosensors/www/odosensors.js",
    "pluginId": "odosensors",
    "clobbers": [
      "odosensors"
    ]
  },
  {
    "id": "cordova-plugin-device.device",
    "file": "plugins/cordova-plugin-device/www/device.js",
    "pluginId": "cordova-plugin-device",
    "clobbers": [
      "device"
    ]
  },
  {
    "id": "cordova-plugin-ble-central.ble",
    "file": "plugins/cordova-plugin-ble-central/www/ble.js",
    "pluginId": "cordova-plugin-ble-central",
    "clobbers": [
      "ble"
    ]
  },
  {
    "id": "cordova-plugin-speechrecognition.SpeechRecognition",
    "file": "plugins/cordova-plugin-speechrecognition/www/speechRecognition.js",
    "pluginId": "cordova-plugin-speechrecognition",
    "merges": [
      "window.plugins.speechRecognition"
    ]
  },
  {
    "id": "cordova-plugin-dialogs.notification",
    "file": "plugins/cordova-plugin-dialogs/www/notification.js",
    "pluginId": "cordova-plugin-dialogs",
    "merges": [
      "navigator.notification"
    ]
  },
  {
    "id": "cordova-plugin-dialogs.notification_android",
    "file": "plugins/cordova-plugin-dialogs/www/android/notification.js",
    "pluginId": "cordova-plugin-dialogs",
    "merges": [
      "navigator.notification"
    ]
  },
  {
    "id": "cordova-plugin-android-wifi-manager.WifiManager",
    "file": "plugins/cordova-plugin-android-wifi-manager/www/index.js",
    "pluginId": "cordova-plugin-android-wifi-manager",
    "clobbers": [
      "cordova.plugins.WifiManager"
    ]
  }
];
module.exports.metadata = 
// TOP OF METADATA
{
  "cordova-plugin-osc": "1.0.3",
  "odosensors": "0.7.0",
  "cordova-plugin-device": "2.0.3",
  "cordova-plugin-ble-central": "1.2.4",
  "cordova-plugin-speechrecognition": "1.1.2",
  "cordova-plugin-dialogs": "2.0.2",
  "cordova-plugin-android-wifi-manager": "1.0.0"
};
// BOTTOM OF METADATA
});