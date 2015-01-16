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
