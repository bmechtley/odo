package edu.asu.ame.plugin;

import java.util.List;
import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;
import android.content.Context;
import android.hardware.*;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import java.util.ArrayList;

public class OdoSensors extends CordovaPlugin implements SensorEventListener {
    long accelerometer_time;
    long gyroscope_time;
    long orientation_time;
    long pressure_time;

    private SensorManager sensorManager;
    JSONArray accelerometer;
    JSONArray gyroscope;
    JSONArray orientation;
    JSONArray pressure;

    private CallbackContext callbackContext;

    public OdoSensors() {
      this.accelerometer = new JSONArray();
      this.gyroscope = new JSONArray();
      this.orientation = new JSONArray();
      this.pressure = new JSONArray();

      this.accelerometer_time = 0;
      this.gyroscope_time = 0;
      this.orientation_time = 0;
      this.pressure_time = 0;
    }

    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
      super.initialize(cordova, webView);
      this.sensorManager = (SensorManager) cordova.getActivity().getSystemService(Context.SENSOR_SERVICE);
    }

    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
      if (action.equals("start")) {
        this.start();
      } else if (action.equals("stop")) {
        this.stop();
      } else if (action.equals("getAccelerometer")) {
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, getAccelerometer()));
      } else if (action.equals("getGyroscope")) {
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, getGyroscope()));
      } else if (action.equals("getOrientation")) {
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, getOrientation()));
      } else if (action.equals("getPressure")) {
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, getPressure()));
      } else {
        return false;
      }

      return true;
    }

    public void onDestroy() {
      this.stop();
    }

    public void onReset() {
      this.stop();
    }

    public void start() {
      this.sensorManager.registerListener(this, this.sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER), this.sensorManager.SENSOR_DELAY_NORMAL);
      this.sensorManager.registerListener(this, this.sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE), this.sensorManager.SENSOR_DELAY_NORMAL);
      this.sensorManager.registerListener(this, this.sensorManager.getDefaultSensor(Sensor.TYPE_ORIENTATION), this.sensorManager.SENSOR_DELAY_NORMAL);
      this.sensorManager.registerListener(this, this.sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE), this.sensorManager.SENSOR_DELAY_NORMAL);
    }

    public void stop() {
      this.sensorManager.unregisterListener(this);

      this.accelerometer = new JSONArray();
      this.gyroscope = new JSONArray();
      this.orientation = new JSONArray();
      this.pressure = new JSONArray();
    }

    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    public void onSensorChanged(SensorEvent event) {
        try {
          Sensor sensor = event.sensor;
          JSONArray value = new JSONArray();

          for (int i = 0; i < event.values.length; i++)
            value.put(Float.parseFloat(event.values[i] + ""));

          long timestamp = System.currentTimeMillis();

          if (sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            this.accelerometer = value;
            this.accelerometer_time = timestamp;
          } else if (sensor.getType() == Sensor.TYPE_PRESSURE) {
            this.pressure = value;
            this.pressure_time = timestamp;
          } else if (sensor.getType() == Sensor.TYPE_GYROSCOPE) {
            this.gyroscope = value;
            this.gyroscope_time = timestamp;
          } else if (sensor.getType() == Sensor.TYPE_ORIENTATION) {
            this.orientation = value;
            this.orientation_time = timestamp;
          }
        } catch (JSONException e) {
          e.printStackTrace();
        }
    }

    public JSONArray getAccelerometer() {
      return this.accelerometer;
    }

    public JSONArray getPressure() {
      return this.pressure;
    }

    public JSONArray getOrientation() {
      return this.orientation;
    }

    public JSONArray getGyroscope() {
      return this.gyroscope;
    }
}
