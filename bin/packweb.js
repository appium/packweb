#!/usr/bin/env node

var asyncify = require('asyncbox').asyncify
  , cli = require('../build/lib/cli').default;

asyncify(cli);
