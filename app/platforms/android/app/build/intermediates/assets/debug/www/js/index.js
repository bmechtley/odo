// Max/MSP server.
var ip = '192.168.1.5';
var port = 2020;

// Parameters.
var sensor_speed = 100;             // time between sensor readings (ms)
var ble_speed = 100;                // time between bluetooth scans (ms)
var points = {                      // beacon coordinates
  'iStage1': [0,  0,  1],
  'iStage2': [0,  1,  1],
  'iStage3': [1,  1,  1],
  'iStage4': [1,  0,  1],
  'iStage5': [0,  0.5,0],
  'iStage6': [0.5,0,  0],
  'iStage7': [1,  0.5,0],
  'iStage8': [0.5,1,  0],
  'iStage9': [0.5,0.5,1],
  'iStage10': [0.5,0.5,1]
};
var calpoints = [[0,0,0],[1,1,0]];  // calibration points
var stagedim = [676,584,330];       // cm
var calibration_count = 32;

// Global variables.
var distances = {};                 // position of phone from each beacon
var filters = {};                   // beacon => filter (kalman, median)
var rssis = {};                     // beacon => rssi dictionary.
var osc;                            // OSC server.
var uuid;                           // UUID of phone.

beacons = Object.keys(points);      // names of beacons
var speech_result = '';             // results from "speak to Odo"
var position = [];                  // phone position in normalize coordinates

// Median filter.
const median = arr => {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b);
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};

class MedianFilter {
  constructor(width) {
    this.history = [];
    this.width = width;
  }

  filter(value) {
    this.history.push(value)
    if (this.history.length > this.width)
      this.history.splice(0, 1);

    return median(this.history);
  }
};

// Sensor data.
var sensors = {
  values: [[0,0,0],[0,0,0],0],  // sensor values.
  update: (index, value) => {   // Update list of values with new reading.
    sensors.values[index] = value;
    var args = [uuid];

    for (var i = 0; i < sensors.values.length; i++) {
      args.push.apply(args, sensors.values[i]);
    }

    osc.send({
      remoteAddress: ip,
      remotePort: port,
      address: '/sensors',
      arguments: args
    });
  }
}

// Calibration object.
var positioning = {
  state: -1,          // ": calib. point 0, 1: calib. point 1, "done": calc. positions.
  rssi: [{}, {}],     // avg. RSSI for each beacon for each calib. point.
  log: [{}, {}],      // RSSIs for each beacon for each calib. point.
  pathloss: [{}, {}], // Pathloss eponent for each beacon for each calib. point.
  calibration_distances: [0,1].map(c => {
    var dists = {};
    beacons.map(b => {
      dists[b] = Math.sqrt([0,1,2].reduce((s, d) =>
        s + Math.pow((points[b][d] - calpoints[c][d]) * stagedim[d], 2)
      ))
    });
    return dists;
  }),

  // Return the minimum number of calibration points that have been collected
  // across beacons.
  min_calibration_complete: () => {
    return [0,1].map(state => {
      return beacons.reduce((acc, b) =>
        positioning.log[state].hasOwnProperty(b) ?
        Math.min(positioning.log[state][b].length, acc) :
        0,
        1000
      );
    });
  },

  // Collect calibration measurements for each calibration point.
  collect_calibration_measurements: device => {
    if (!positioning.log[positioning.state].hasOwnProperty(device.name))
      positioning.log[positioning.state][device.name] = [];

    positioning.log[positioning.state][device.name].push(rssis[device.name]);

    if (
      positioning.log[positioning.state][device.name].length >
      calibration_count
    )
      positioning.log[positioning.state][device.name].splice(0, 1);
  },

  compute_calibration_rssis: () => {
    beacons.map(b => {
      positioning.rssi[positioning.state][b] =
        positioning.log[positioning.state][b].reduce((a, b) => a + b) /
        positioning.log[positioning.state][b].length;
    });
  },

  // Compute the average PLE between the phone and each beacon.
  compute_pathloss: () => {
    beacons.map(b => {
      var cal_dist = [0,1].map(c => positioning.calibration_distances[c][b]);
      var cal_rssi = [0,1].map(c => positioning.rssi[c][b]);

      if (!positioning.pathloss.hasOwnProperty(b)) {
        positioning.pathloss[b] = (cal_rssi[0] - cal_rssi[1]) / (
          10 * Math.log10(cal_dist[1] / cal_dist[0])
        );
      }
    });
  },

  // If calibration is done, compute distance to the beacon.
  compute_distance: device => {
    if (positioning.state == 'done') {
      var b = device.name;

      var distcalc = [0,1].map(
        d => positioning.calibration_distances[d][b] * Math.pow(
          10, (positioning.rssi[d][b] - rssis[device.name]) / (10 * positioning.pathloss[b])
        )
      );
      distances[b] = distcalc.reduce((s, d) => s + d) / distcalc.length;
    }
  },

  // Triangulate position from distances.
  triangulate: () =>  {
    var distances_computed = beacons.reduce(
      (acc, b) => distances.hasOwnProperty(b) && acc,
      true
    );

    if (positioning.state == 'done' && distances_computed) {
      pts = beacons.map(b => points[b]);
      dists = beacons.map(b => distances[b]);

      position = find_position(pts, dists, alpha=2, iter=2000, ratio=0.99);

      return position;
    }
  },

  // Update calibration with a beacons's RSSI.
  update: device => {
    if (!filters.hasOwnProperty(device.name))
      filters[device.name] = new MedianFilter(10);//KalmanFilter({R: 0.01, Q: 3});

    rssis[device.name] = filters[device.name].filter(device.rssi);

    /*
        STATE: 0->{none, pathloss}; 1->{none, pathloss}.
          When done, if both points are calibrated, advance to pathloss state.
          Otherwise, go to "none" state and wait for user to calibrate other point.
    */
    if (positioning.state == 0 || positioning.state == 1) {
        positioning.collect_calibration_measurements(device);

        var c = positioning.min_calibration_complete();

        if (c[positioning.state] == calibration_count) {
          positioning.compute_calibration_rssis();
          navigator.notification.beep();

          positioning.state = (c[1-positioning.state] == calibration_count) ? 'pathloss' : 'none';
        }
    }

    /*
      STATE: pathloss -> done.
        Compute the PLE between the phone and each beacon.
    */
    if (positioning.state == 'pathloss') {
      positioning.compute_pathloss();
      positioning.state = 'done';
    }
  }
};


var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener(
          'deviceready',
          this.onDeviceReady.bind(this),
          false
        );
    },

    // When Bluetooth device is discovered.
    onDeviceDiscovered: device => {
      console.log(device);
      if (
        device &&
        device.hasOwnProperty('name') &&
        points.hasOwnProperty(device.name)
      ) {
        var old_state = positioning.state;

        positioning.update(device);             // Calibration.
        positioning.compute_distance(device);   // Compute distance to beacons.

        app.update_measurement_text();
        if ((old_state == 0 || old_state == 1) && positioning.state != old_state)
          app.update_calibration_text(old_state);

        if (positioning.state == 'done') {
          position = positioning.triangulate(); // Triangulate position.

          var values = [uuid];
          values.push.apply(values, position);

          // Send over OSC to Max/MSP.
          osc.send({
            remoteAddress: ip,
            remotePort: port,
            address: '/position',
            arguments: values
          });
        }

        osc.send({
          remoteAddress: ip,
          remotePort: port,
          address: '/rssi/' + device.name,
          arguments: [device.rssi]
        });
      }
    },

    update_calibration_text: c => {
      beacons.map(b => {
        var td_rssi = document.getElementsByClassName(b + '_rssi' + c)[0]
        var td_dist = document.getElementsByClassName(b + '_d' + c)[0];
        var td_ple = document.getElementsByClassName(b + '_ple')[0];

        if (td_dist && positioning.calibration_distances[c].hasOwnProperty(b))
          td_dist.innerHTML = positioning.calibration_distances[c][b].toFixed(2);

        if (td_rssi && positioning.rssi[c].hasOwnProperty(b))
          td_rssi.innerHTML = positioning.rssi[c][b].toFixed(2);

        if (td_ple && positioning.pathloss.hasOwnProperty(b))
          td_ple.innerHTML = positioning.pathloss[b].toFixed(2);
      });
    },

    update_measurement_text: () => {
      // RSSI and Distance.
      beacons.map(b => {
        var td_rssi = document.getElementsByClassName(b + '_rssi')[0];
        var td_dist = document.getElementsByClassName(b + '_dist')[0];

        if (td_rssi && filters.hasOwnProperty(b))
          td_rssi.innerHTML = rssis[b].toFixed(2);
        if (td_dist && distances.hasOwnProperty(b))
          td_dist.innerHTML = distances[b].toFixed(2);
      });

      // Position.
      document.getElementsByClassName('position')[0].innerHTML = position;

      // How many points have been calibrated.
      var c = positioning.min_calibration_complete();
      [0,1].map(pt => {
        var text = '';
        if (c[pt] == calibration_count) text = 'Done.';
        else if (c[pt] != 0 || positioning.state == pt) text = c[pt] + '/' + calibration_count + ' points.'
        document.getElementsByClassName('calpts' + pt)[0].innerHTML = text;
      });
    },

    // When app is ready.
    onDeviceReady: () => {
        var speech_result = '';

        var WifiManager = cordova.plugins.WifiManager;
        WifiManager.onwifistatechanged = data => {
          if (data.wifiState == 'ENABLED' && speech_result.length) {
            var success = false;
            var tries = 0;
            var args = [uuid];
            args.push.apply(args, speech_result.split(' '));

            var oscint = setInterval(() => {
              osc.send(
                {
                  remoteAddress: ip,
                  remotePort: port,
                  address: '/speak',
                  arguments: args
                },
                res => clearInterval(oscint),
                err => { if (tries++ >= 100) clearInterval(oscint) }
              );
            }, 100)
          }
        };

        osc = new OSC();
        odosensors.start();
        uuid = device.uuid;

        // Update sensors.
        setInterval(() => {
          odosensors.getAccelerometer(v => sensors.update(0, v));
          odosensors.getOrientation(v => sensors.update(1, v));
          odosensors.getPressure(v => sensors.update(2, v));
        }, sensor_speed);

        ble.startScanWithOptions(
          [], {reportDuplicates: true}, app.onDeviceDiscovered
        );

        // Calibration buttons.
        [0,1].map(c => {
          document.getElementsByClassName('calibrate'+(c+1))[0].onclick = () => {
            positioning.state = c;
            positioning.pathloss = {};
            positioning.log[c] = {};
            positioning.rssi[c] = {};
          };
        });

        // Popup dialog for typed input.
        document.getElementsByClassName('speak2')[0].onclick = () => {
          navigator.notification.prompt(
            'What would you like to say to Odo?',
            res => {
              var args = [uuid];
              args.push.apply(args, res.input1.split(' '));

              osc.send({
                remoteAddress: ip,
                remotePort: port,
                address: '/speak',
                arguments: args
              });
            },
            'Speak to Odo',
            ['Ok','Cancel']
          );
        }

        document.getElementsByClassName('ip')[0].onclick = () => {
          navigator.notification.prompt(
            'Set target IP address:',
            res => {ip = res.input1},
            'IP address',
            ['OK', 'Cancel']
          )
        }

        // Speech recognition button.
        document.getElementsByClassName('speak')[0].onclick = () => {
          WifiManager.setWifiEnabled(false, (e, s) => {
            window.plugins.speechRecognition.requestPermission(() => {
              window.plugins.speechRecognition.startListening(res => {
                speech_result = res[0];

                WifiManager.setWifiEnabled(true, (e, s) =>  {
                  WifiManager.enableNetwork('forest3', true);
                });
              }, {lang: 'en-US', showPopop: true});
            });
          });
        };
    }
};

app.initialize();
