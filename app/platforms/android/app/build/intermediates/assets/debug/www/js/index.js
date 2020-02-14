// Max/MSP server.
var ip = '10.0.1.30';
var port = 2020;

// Parameters.
var sensor_speed = 100;             // time between sensor readings (ms)
var points = [[0,0,1], [0,1,1], [1,0,1], [1,1,1], [0.5,0.5,1]];
var locations = [
  {point: 0, beacons: ['iStage1_37']},//, 'iStage1_38', 'iStage1_39']},
  {point: 1, beacons: ['iStage2_37']},//, 'iStage2_38', 'iStage2_39']},
  {point: 2, beacons: ['iStage3_37']},// 'iStage3_38', 'iStage3_39']},
  {point: 3, beacons: ['iStage4_37']},// 'iStage4_38', 'iStage4_39']},
  {point: 4, beacons: ['iStage5_37']}//, 'iStage5_38', 'iStage5_39']}
];
var beacon_points = {};
var beacon_indices = {};
var beacons = [];
for (var i = 0; i < locations.length; i++) {
  for (var j = 0; j < locations[i].beacons.length; j++) {
    var b = locations[i].beacons[j];

    beacons.push(b);
    beacon_points[b] = locations[i].point;
    beacon_indices[b] = i;
  }
}

var calpoints = [[0,0,0],[.5,.5,0.333]];  // calibration points
var stagedim = [676,584,330];           // cm
var calibration_count = 128;             // number of calibration measurements to collect.

// Global variables.
var tds = {};                           // DOM elements for data display.
var osc;                                // OSC server.
var uuid;                               // UUID of phone.

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
  values: [0,[0,0,0],0],  // sensor values.
  update: (index, value) => {   // Update list of values with new reading.
    sensors.values[index] = value;
    var args = [uuid];

    for (var i = 0; i < sensors.values.length; i++) {
      if (Array.isArray(sensors.values[i]))
        args.push.apply(args, sensors.values[i]);
      else
        args.push(sensors.values[index]);
    }

    osc.send({
      remoteAddress: ip,
      remotePort: port,
      address: '/sensors',
      arguments: args
    });
  }
}

// Positioning object.
var pos = {
  state: -1,          // ": calib. point 0, 1: calib. point 1, "done": calc. positions.
  rssis: {},          // Most recent RSSI measurement for each beacon.
  distances: {},      // Distance to each beacon.
  position: [],       // Calculated position
  scaled_points: points.map(p => arr_multiply(p, stagedim)),
  calibration_rssi: [{}, {}],     // avg. RSSI for each beacon for each calib. point.
  calibration_log: [{}, {}],      // RSSIs for each beacon for each calib. point.
  calibration_pathloss: [{}, {}], // Pathloss eponent for each beacon for each calib. point.
  filters: beacons.map(b => new MedianFilter(20)),
  point_distances: points.map(l => -1),
  calibration_distances: [0,1].map(c => locations.map(l => arr_distance(arr_multiply(points[l.point], stagedim), arr_multiply(calpoints[c], stagedim)))),

  // Return the minimum number of calibration points that have been collected across beacons.
  min_calibration_complete: () => [0,1].map(state => beacons.reduce((acc, b) =>
    pos.calibration_log[state].hasOwnProperty(b) ? Math.min(pos.calibration_log[state][b].length, acc) : 0,
    9999
  )),

  // Collect calibration measurements for each calibration point.
  collect_calibration_measurements: device => {
    if (!pos.calibration_log[pos.state].hasOwnProperty(device.name))
      pos.calibration_log[pos.state][device.name] = [];

    pos.calibration_log[pos.state][device.name].push(pos.rssis[device.name]);

    if (
      pos.calibration_log[pos.state][device.name].length >
      calibration_count
    )
      pos.calibration_log[pos.state][device.name].splice(0, 1);
  },

  // Compute average RSSI across calibration window.
  compute_calibration_rssis: (c) => {
    beacons.map(b => {
      pos.calibration_rssi[c][b] = median(pos.calibration_log[pos.state][b]);
    });
  },

  // Compute the average PLE between the phone and each beacon.
  compute_pathloss: () => {
    beacons.map(b => {
      var cal_dist = [0,1].map(c => pos.calibration_distances[c][beacon_indices[b]]);
      var cal_rssi = [0,1].map(c => pos.calibration_rssi[c][b]);

      if (!pos.calibration_pathloss.hasOwnProperty(b)) {
        pos.calibration_pathloss[b] = (cal_rssi[0] - cal_rssi[1]) / (
          10 * Math.log10(cal_dist[1] / cal_dist[0])
        );
      }
    });
  },

  // If calibration is done, compute distance to the beacon.
  compute_distance: device => {
    if (pos.state == 'done') {
      var b = device.name;

      pos.distances[b] = [0,1].map(
        c => pos.calibration_distances[c][beacon_indices[b]] * Math.pow(
          10, (pos.calibration_rssi[c][b] - pos.rssis[b]) / (10 * pos.calibration_pathloss[b])
        )
      ).reduce((s, d) => s + d) / 2;

      pos.point_distances[beacon_indices[b]] = pos.filters[beacon_indices[b]].filter(pos.distances[b]);
    }
  },

  // Triangulate position from distances.
  triangulate: () => {
    if (
      pos.state == 'done' &&
      pos.point_distances.reduce((a, p) => a && (p > -1), true)
    ) {
      console.log(pos.scaled_points, pos.point_distances);
      pos.position = find_position(pos.scaled_points.slice(3), pos.point_distances.slice(3), alpha=2, iter=500, ratio=0.99);
    } else
      pos.position = [0, 0, 0];
  },

  // Update calibration with a beacons's RSSI.
  update: device => {
    pos.rssis[device.name] = device.rssi;

    /*
        STATE: 0->{none, pathloss}; 1->{none, pathloss}.
          When done, if both points are calibrated, advance to pathloss state.
          Otherwise, go to "none" state and wait for user to calibrate other point.
    */
    if (pos.state == 0 || pos.state == 1) {
        pos.collect_calibration_measurements(device);

        var c = pos.min_calibration_complete();

        if (c[pos.state] == calibration_count) {
          pos.compute_calibration_rssis(pos.state);
          navigator.notification.beep();

          pos.state = (c[1-pos.state] == calibration_count) ? 'pathloss' : 'none';
        }
    }

    /*
      STATE: pathloss -> done.
        Compute the PLE between the phone and each beacon.
    */
    if (pos.state == 'pathloss') {
      pos.compute_pathloss();
      pos.state = 'done';

      var cal_storage = {};
      cal_storage.calibration_rssi = pos.calibration_rssi;
      cal_storage.calibration_pathloss = pos.calibration_pathloss;
      window.localStorage.setItem('calibration', cal_storage);
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
      if (
        device &&
        device.hasOwnProperty('name') &&
        beacon_points.hasOwnProperty(device.name)
      ) {
        var old_state = pos.state;

        if (pos.state == 0 || pos.state == 1) {
          osc.send({
            remoteAddress: ip,
            remotePort: port,
            address: '/rssi/' + device.name,
            arguments: [pos.state, device.rssi]
          });
        }

        pos.update(device);             // Calibration.
        pos.compute_distance(device);   // Compute distance to beacons.
        app.update_measurement_text();

        if ((old_state == 0 || old_state == 1) && pos.state != old_state)
          app.update_calibration_text(old_state);

        if (pos.state == 'done') {
          pos.triangulate(); // Triangulate position.

          var values = [uuid];
          values.push.apply(values, pos.position);

          // Send over OSC to Max/MSP.
          osc.send({
            remoteAddress: ip,
            remotePort: port,
            address: '/position',
            arguments: values
          });
        }
      }
    },

    // Update calibration debug info.
    update_calibration_text: c => {
      for (var i = 0; i < beacons.length; i++) {
        var b = beacons[i];

        for (var c = 0; c < 2; c++) {
          if (pos.calibration_distances && pos.calibration_distances.length > 1 && pos.calibration_distances[c].length)
            tds[b]['d_' + c].innerHTML = pos.calibration_distances[c][beacon_indices[b]].toFixed(2);

          if (pos.calibration_rssi[c].hasOwnProperty(b))
            tds[b]['rssi_' + c].innerHTML = pos.calibration_rssi[c][b].toFixed(2);
        }

        if (pos.calibration_pathloss.hasOwnProperty(b))
            tds[b].ple.innerHTML = pos.calibration_pathloss[b].toFixed(2);
      }
    },

    // Update measurement debug info.
    update_measurement_text: () => {
      for (var i = 0; i < beacons.length; i++) {
        var b = beacons[i];

        if (pos.rssis.hasOwnProperty(b)) tds[b].rssi.innerHTML = pos.rssis[b].toFixed(2);

        if (pos.state == 'done') {
          tds[b].dist.innerHTML = pos.point_distances[beacon_indices[b]].toFixed(2);
        } else if (pos.distances.hasOwnProperty(b))
          tds[b].dist.innerHTML = pos.distances[b].toFixed(2);
      }

      // Position.
      document.getElementById('position').innerHTML = pos.position.map((p, pi) => (p / stagedim[pi]).toFixed(2)).join(', ');

      // How many points have been calibrated.
      var c = pos.min_calibration_complete();
      [0,1].map(pt => {
        var text = '';
        if (c[pt] == calibration_count) text = 'Done.';
        else if (c[pt] != 0 || pos.state == pt) text = c[pt] + '/' + calibration_count + ' points.'
        document.getElementById('calpts' + pt).innerHTML = text;
      });
    },

    // When app is ready.
    onDeviceReady: () => {
        // Populate the data readout table.
        var table = document.getElementById('calculations');

        for (var i = 0; i < beacons.length; i++) {
          var b = beacons[i];
          var tr = document.createElement('tr');
          tds[b] = {};
          ['name', 'ple', 'rssi_0', 'rssi_1', 'd_0', 'd_1', 'rssi', 'dist'].map(tdname => {
            tds[b][tdname] = document.createElement('td');
            tr.appendChild(tds[b][tdname]);
          });

          tds[b].name.innerHTML = b;

          table.appendChild(tr);
        }

        [0,1].map(c => app.update_calibration_text(c));
        /*
        var cal_storage = window.localStorage.getItem('calibration');
        if (cal_storage != null) {
          console.log('Updating calibration from local storage.')
          pos.calibration_rssi = cal_storage.calibration_rssi;
          pos.calibration_pathloss = cal_storage.calibration_pathloss;
          pos.state = 'done';
        }
        */
        // OSC.
        osc = new OSC();
        odosensors.start();
        uuid = device.uuid;

        // Update sensors.
        setInterval(() => {
          odosensors.getAccelerometer(v => sensors.update(0, Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])));
          odosensors.getOrientation(v => sensors.update(1, v));
          odosensors.getPressure(v => sensors.update(2, v));
        }, sensor_speed);

        // Bluetooth scanning.
        ble.startScanWithOptions([], {reportDuplicates: true}, app.onDeviceDiscovered, () => {console.log("BLE scan error!")});

        // Calibration buttons.
        [0,1].map(c => {
          document.getElementById('calibrate'+(c+1)).onclick = () => {
            pos.state = c;
            pos.calibration_pathloss = {};
            pos.calibration_log[c] = {};
            pos.calibration_rssi[c] = {};
          };
        });

        // Set target IP for OSC packets.
        document.getElementById('ip').onclick = () => {
          navigator.notification.prompt(
            'Set target IP address:',
            res => {ip = res.input1},
            'IP address',
            ['OK', 'Cancel']
          )
        }

        // When WiFi turns back on, send out the speech
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

        // Speech recognition button.
        document.getElementById('speak').onclick = () => {
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

        // Popup dialog for typed input.
        document.getElementById('speak2').onclick = () => {
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
    }
};

app.initialize();
