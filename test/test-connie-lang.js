var assert = require('assert');
var ConnieLang = require('../');

describe('ConnieLang', function() {
  describe('getEntries', function() {
    it('should return entries for nested objects', function() {
      var entries = ConnieLang.getEntries({
        foo: 'bar',
        bar: {
          baz: {
            a: {
              b: 'c',
              c: 'd',
              d: ['e', 'f', 'g']
            }
          }
        }
      });

      assert.deepEqual(entries, [
        {key: ['foo'], value: 'bar'},
        {key: ['bar', 'baz', 'a', 'b'], value: 'c'},
        {key: ['bar', 'baz', 'a', 'c'], value: 'd'},
        {key: ['bar', 'baz', 'a', 'd', 0], value: 'e'},
        {key: ['bar', 'baz', 'a', 'd', 1], value: 'f'},
        {key: ['bar', 'baz', 'a', 'd', 2], value: 'g'}
      ]);
    });

    it('should return entries for an array', function() {
      var entries = ConnieLang.getEntries([
        'foo',
        {bar: 'baz'}
      ]);

      assert.deepEqual(entries, [
        {key: [0], value: 'foo'},
        {key: [1, 'bar'], value: 'baz'}
      ]);
    });
  });

  describe('firstInnermostInterpreterFromValue', function() {
    it('should return null when no interpreters are found', function() {
      var interpreter = ConnieLang.firstInnermostInterpreterFromValue('foobar');
      assert.equal(interpreter, null);
    });

    it('should handle complex values', function() {
      var value = '#{parseInt(${PORT})} @{foo.bar}';

      var interpreter = ConnieLang.firstInnermostInterpreterFromValue(value);
      assert.deepEqual(interpreter, {
        type: '$',
        match: '${PORT}',
        value: 'PORT',
        start: 11,
        end: 18
      });

      value = value.slice(0, interpreter.start) + value.slice(interpreter.end);
      // '#{parseInt()} @{foo.bar}'
      interpreter = ConnieLang.firstInnermostInterpreterFromValue(value);
      assert.deepEqual(interpreter, {
        type: '#',
        match: '#{parseInt()}',
        value: 'parseInt()',
        start: 0,
        end: 13
      });

      value = value.slice(0, interpreter.start) + value.slice(interpreter.end);
      // ' @{foo.bar}'
      interpreter = ConnieLang.firstInnermostInterpreterFromValue(value);
      assert.deepEqual(interpreter, {
        type: '@',
        match: '@{foo.bar}',
        value: 'foo.bar',
        start: 1,
        end: 11
      });
    });
  });

  describe('parse', function() {
    it('should parse environment variables correctly', function() {
      var config = ConnieLang.parse({
        a: 'PORT',
        b: {
          c: {
            d: 'e',
            e: '${@{a}}'
          }
        },
        p: '#{parseInt(${PORT})}'
      }, {
        PORT: '3000'
      });

      assert.deepEqual(config, {
        a: 'PORT',
        b: {
          c: {
            d: 'e',
            e: '3000'
          }
        },
        p: 3000
      });
    });

    it('should report errors on invalid execution', function() {
      var fn = function() {
        ConnieLang.parse({
          foo: '#{parseInt(FOOBAR || 4)}'
        });
      };

      assert.throws(fn, Error);
    });

    it('should parse inside of arrays', function() {
      var config = ConnieLang.parse({
        bar: 'hey',
        arr: [
          {foo: '@{bar}'},
          {bar: '#{parseInt(${FOOBAR} || 4)}'},
          '${PORT}'
        ]
      }, {
        PORT: '3000'
      });

      assert.deepEqual(config, {
        bar: 'hey',
        arr: [
          {foo: 'hey'},
          {bar: 4},
          '3000'
        ]
      });
    });

    it('should parse env inside of execution', function() {
      var config = ConnieLang.parse({
        a: '#{5 + parseInt(${ITERATIONS})}',
        b: '#{"hello ${NAME}"}'
      }, {
        ITERATIONS: 8,
        NAME: 'Matt'
      });

      assert.deepEqual(config, {
        a: 13,
        b: 'hello Matt'
      });
    });

    it('should parse execution inside of env', function() {
      var config = ConnieLang.parse({
        a: '${FOO_#{"BAR"}}',
        b: '${FOO_#{"BAZ"}}'
      }, {
        FOO_BAR: 'hello',
        FOO_BAZ: 'world'
      });

      assert.deepEqual(config, {
        a: 'hello',
        b: 'world'
      });
    });

    it('should ignore null and undefined values', function() {
      var config = ConnieLang.parse({
        a: {
          b: [
            'foo',
            null,
            4
          ]
        },
        b: undefined
      });

      assert.deepEqual(config, {
        a: {
          b: [
            'foo',
            null,
            4
          ]
        },
        b: undefined
      });
    });
  });
});
