import _ from 'lodash';
import yargs from 'yargs';
import clc from 'cli-color';
import { default as PackWeb } from './packweb';

async function parseConfig (c) {
  let config = null;
  try {
    config = JSON.parse(c);
    return config;
  } catch (e) { }
  throw new Error("Could not parse config");
}

async function cli () {
  let configPath = yargs.argv.config || yargs.argv.c;
  if (!configPath) {
    throw new Error("You must specify a packweb config with --config or -c");
  }
  let pw = new PackWeb(await parseConfig(configPath));
  if (yargs.argv.show) {
    let stats = await pw.ownerStatusForPackages();
    for (let [pack, stat] of _.pairs(stats)) {
      let str = ' - ';
      if (stat.invalidOwners.length === 0 && stat.notYetOwners.length === 0) {
        str += clc.green(`${pack} ownership OK`);
      } else {
        str += clc.yellow(`${pack} needs ownership update`);
        for (let o of stat.invalidOwners) {
          str += `\n    - ${clc.red(o)} is an owner but shouldn't be`;
        }
        for (let o of stat.notYetOwners) {
          str += `\n    - ${clc.yellow(o)} is not yet an owner but should be`;
        }
      }
      console.log(str);
    }
  }
}

export default cli;
