#!/usr/bin/env node

const asyncify = require('asyncbox').asyncify;
const cli = require('../build/lib/cli').default;

asyncify(cli);
