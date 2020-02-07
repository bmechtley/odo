if (!Array.prototype.add) {
  Object.defineProperty(Array.prototype, 'add', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(b) {
      'use strict';
      if (this && Array.isArray(b)) {
        for (var i = 0; i < this.length; i++) {
          this[i] += b[i];
        }
      } else if (this && (typeof b === 'number')) {
        for (var i = 0; i < this.length; i++) {
          this[i] += b;
        }
      } else {
        throw new TypeError();
      }

      return this;
    }
  });
}

if (!Array.prototype.multiply) {
    Object.defineProperty(Array.prototype, 'multiply', {
    enumerable: false,
    configurable: true,
    writable: true,
      value: function(b) {
        'use strict';
        if (this && Array.isArray(b)) {
          for (var i = 0; i < this.length; i++) {
            this[i] *= b[i];
          }
        } else if (this && (typeof b === 'number')) {
          for (var i = 0; i < this.length; i++) {
            this[i] *= b;
          }
        } else {
          throw new TypeError();
        }

        return this;
      }
  });
}

if (!Array.prototype.max) {
  Object.defineProperty(Array.prototype, 'max', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function() {
      return Math.max.apply(null, this);
    }
  })
}

if (!Array.prototype.min) {
  Object.defineProperty(Array.prototype, 'min', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function() {
      return Math.min.apply(null, this);
    }
  });
}

if (!Array.prototype.sum) {
  Object.defineProperty(Array.prototype, 'sum', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function() {
      return this.reduce(function(a, b) {return a + b}, 0);
    }
  });
}

if (!Array.prototype.toPrecision) {
  Object.defineProperty(Array.prototype, 'toPrecision', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(p) {
      return '[' + this.map(a => a.toPrecision(p)).join(', ') + ']';
    }
  });
}

Array.fill = function(value, len) {
  if (len == 0) return [];
  var a = [value];
  while (a.length * 2 <= len) a = a.concat(a);
  if (a.length < len) a = a.concat(a.slice(0, len - a.length));
  return a;
};

function arr_distance(p1, p2) {
	var d1 = p1[0]-p2[0];
	var d2 = p1[1]-p2[1];

	return Math.sqrt(d1*d1+d2*d2);
}

function arr_subtract(a, b) {
  if (Array.isArray(b))
    return a.map(function(ai, i) { return ai - b[i] });
  else
    return a.map(function(ai, i) { return ai - b });
}

function find_position(points, distances, alpha=2, iter=2000, ratio=0.99) {
	var res = [0, 0];
	var inv_len = 1.0 / points.length;

	for (var i = 0; i < iter; i++) {
		var delta = [0, 0];

		for (var p = 0; p < points.length; p++) {
			var diff = arr_subtract(points[p], res);
			var d = diff.reduce((tot, a)=>tot+a*a, 0);
			diff.multiply(alpha * (d-distances[p]) / Math.max(distances[p], d));
			delta.add(diff);
		}

		delta.multiply(inv_len);
		alpha *= ratio;
		res.add(delta);
	}

	return res;
}
/*
var p = [[0,0], [0,1], [1, 1], [1, 0]];
var distance_tests = [.1, Math.sqrt(.5), .5, 1, 10];
for (var i in distance_tests) {
  var distance = distance_tests[i];
  var distances = Array.fill(distance, 4);
  var dstr = distance.toPrecision(2);
  var position = find_position(p, distances);
  var sum = distances.sum();
  var distances_scaled = distances.map(d => d / sum);
  var position_scaled = find_position(p, distances_scaled);

  console.log(
    distances.toPrecision(2) + '',
    position.toPrecision(2) + '\t',
    distances_scaled.toPrecision(2) + '',
    position_scaled.toPrecision(2)
  );
}
*/
