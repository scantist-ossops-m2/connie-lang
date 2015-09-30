var vm = require('vm');
var isPlainObject = require('lodash.isplainobject');

var getValue = function(obj, key) {
  var o = obj;
  var keys = Array.isArray(key) ? key : key.split('.');

  for (var x = 0; x < keys.length -1; ++x) {
    var k = keys[x];
    if (!o[k]) return;
    o = o[k];
  }

  return o[keys[keys.length - 1]];
};

var setValue = function(obj, key, value) {
  var o = obj;
  var keys = Array.isArray(key) ? key : key.split('.');

  for (var x = 1; x < keys.length; ++x) {
    var currentKey = keys[x];
    var lastKey = keys[x - 1];
    if (typeof(currentKey) === 'number') {
      if (!o[lastKey]) { o[lastKey] = []; }
      o = o[lastKey];
    } else if (typeof(currentKey) === 'string') {
      if (!o[lastKey]) { o[lastKey] = {}; }
      o = o[lastKey];
    } else {
      throw new Error('Oopsy, key arrays should only be strings and numbers:', keys);
    }
  }

  o[keys[keys.length - 1]] = value;
  return obj;
};


var EnvVarInterpreter = {
  type: '$',
  replace: function(value, context) {
    var m = /\$\{([^\}]+)\}/.exec(value);
    if (!m) return value;
    return value.replace(m[0], context.env[m[1]]);
  }
};

var ExecutionInterpreter = {
  type: '#',
  replace: function(value, context) {
    var m = /#\{([^\}]+)\}/.exec(value);
    if (!m) return value;

    try {
      var v = vm.runInNewContext(m[1], {});
      if (m[0] === value) return v;
      return value.replace(m[0], v);
    } catch(err) {
      throw new Error('Invalid execution [' + m[1] + ']: ' + err.message);
    }
  }
};

var ReferenceInterpreter = {
  type: '@',
  replace: function(value, context) {
    var m = /@\{([^\}]+)\}/.exec(value);
    if (!m) return value;

    var v = getValue(context.config, m[1]);
    if (m[0] === value) return v;
    return value.replace(m[0], v);
  }
};

var Interpreters = [ReferenceInterpreter, EnvVarInterpreter, ExecutionInterpreter];

var ConnieLang = {
  Interpreters: Interpreters,
  InterpretersByType: Interpreters.reduce(function(o, i) {o[i.type] = i; return o;}, {}),

  getEntries: function(config) {
    var entries = [];

    var iter = function(value, prefix) {
      if (!prefix) prefix = [];

      if (Array.isArray(value)) {
        value.forEach(function(arrValue, idx) {
          iter(arrValue, prefix.concat(idx));
        });
      } else if (isPlainObject(value)) {
        Object.keys(value).forEach(function(key) {
          iter(value[key], prefix.concat(key));
        });
      } else {
        entries.push({key: prefix, value: value});
      }
    };

    iter(config);
    return entries;
  },

  firstInnermostInterpreterFromValue: function(value) {
    if (value === null || value === undefined) { return null; }

    var start = -1;
    var interpreterTypes = Object.keys(ConnieLang.InterpretersByType);

    for (var idx = 1; idx < value.length; ++idx) {
      if (value[idx] === '{' && interpreterTypes.indexOf(value[idx - 1]) !== -1) {
        start = idx - 1;
      } else if (value[idx] === '}' && start !== -1) {
        return {
          type: value[start],
          match: value.slice(start, idx + 1),
          value: value.slice(start + 2, idx),
          start: start,
          end: idx + 1
        };
      }
    }

    return null;
  },

  parse: function(configObj, envObj) {
    var context = {
      config: configObj,
      env: envObj || process.env
    };

    var entries = ConnieLang.getEntries(context.config);

    // iterate until no updates have been made
    var digest = function() {
      var updated = false;

      entries.forEach(function(e) {
        var interpreter = ConnieLang.firstInnermostInterpreterFromValue(e.value, context);
        if (!interpreter) return;

        var newValue = ConnieLang.InterpretersByType[interpreter.type].replace(e.value, context);
        if (newValue !== e.value) {
          e.value = newValue;
          updated = true;
        }
      });

      return updated;
    };

    while(digest()) ;

    var result = {};
    entries.forEach(function(e) {
      setValue(result, e.key, e.value);
    });

    return result;
  }
};

module.exports = ConnieLang;
