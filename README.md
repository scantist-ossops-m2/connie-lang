# connie-lang

Configuration language for [connie](https://github.com/mattinsler/connie).

## Installation

```bash
$ npm install --save connie-lang
```

## Usage

```javascript
var ConnieLang = require('connie-lang');

var config = ConnieLang.parse({
  common: {
    domain: 'mattinsler.com'
  },
  endpoints: {
    api: 'api.@{common.domain}'
  },
  server: {
    port: '#{${PORT} || 3000}'
  }
}, process.env);

```

## Language Reference

**${ENV_VAR}** Environment Variable Replacement

**#{code}** Inline Code Execution

**@{ref}** Self-Reference Replacement

## Examples

##### original config object
```json
{
  "common": {
    "domain": "kimonolabs.com"
  },
  "endpoints": {
    "api": "api.@{common.domain}"
  },
  "server": {
    "port": "#{${PORT} || 3000}"
  }
}
```

When this configuration is executed with an empty environment, the result is:

##### parsed config object
```json
{
  "common": {
    "domain": "kimonolabs.com"
  },
  "endpoints": {
    "api": "api.kimonolabs.com"
  },
  "server": {
    "port": 3000
  }
}
```

However, if the PORT environment variable is set to 4000, then this would change to:

##### parsed config object
```json
{
  "common": {
    "domain": "kimonolabs.com"
  },
  "endpoints": {
    "api": "api.kimonolabs.com"
  },
  "server": {
    "port": 4000
  }
}
```
