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

  if (yargs.argv.update) {
    let results = await pw.updateOwnersForPackages();
    for (let [pack, res] of _.pairs(results)) {
      let str = ' - ';
      if (res.added.length === 0 && res.removed.length === 0) {
        str += `${pack} had no changes`;
      } else {
        str += clc.yellow(`${pack} had some changes`);
        for (let o of res.added) {
          str += `\n    - ${clc.green(o)} was added`;
        }
        for (let o of res.removed) {
          str += `\n    - ${clc.red(o)} was removed`;
        }
      }
      console.log(str);
    }
  }
}

export default cli;
