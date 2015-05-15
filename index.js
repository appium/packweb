// transpile:main

import { asyncify } from 'asyncbox';
import { default as PackWeb } from './lib/packweb';
import { default as cli } from './lib/cli';

if (module === require.main) {
  asyncify(cli);
}

export { PackWeb };
