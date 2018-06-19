import _ from 'lodash';
import yargs from 'yargs';
import clc from 'cli-color';
import { fs } from 'appium-support';
import request from 'request-promise';
import { default as PackWeb } from './packweb';
import log from 'fancy-log';


async function parseConfig (c) {
  let contents;
  try {
    return JSON.parse(c);
  } catch (e) { }

  try {
    if (c.indexOf('http') === 0) {
      contents = await request(c);
    } else {
      contents = await fs.readFile(c);
    }
    return JSON.parse(contents.toString());
  } catch (e) {
    throw new Error("Could not parse config. Must be JSON data, file, or URL");
  }
}

async function cli () {
  let configPath = yargs.argv.config || yargs.argv.c;
  if (!configPath) {
    throw new Error("You must specify a packweb config with --config or -c");
  }
  let pw = new PackWeb(await parseConfig(configPath));
  if (yargs.argv.show) {
    let stats = await pw.ownerStatusForPackages();
    for (let [pack, stat] of _.toPairs(stats)) {
      let str = ' - ';
      if (stat.invalidOwners.length === 0 && stat.notYetOwners.length === 0) {
        if (stat.validOwners.length === 0) {
          str += clc.red(`${pack} has not yet been published`);
        } else {
          str += clc.green(`${pack} ownership OK`);
        }
      } else {
        str += clc.yellow(`${pack} needs ownership update`);
        for (let o of stat.invalidOwners) {
          str += `\n    - ${clc.red(o)} is an owner but shouldn't be`;
        }
        for (let o of stat.notYetOwners) {
          str += `\n    - ${clc.yellow(o)} is not yet an owner but should be`;
        }
      }
      log(str);
    }
  }

  if (yargs.argv.update) {
    let results = await pw.updateOwnersForPackages();
    for (let [pack, res] of _.toPairs(results)) {
      let str = ' - ';
      if (res.added.length === 0 && res.removed.length === 0) {
        if (res.denied) {
          str += clc.red(`You don't have access to update ${pack}, no changes made`);
        } else {
          if (res.verified.length === 0) {
            str += clc.red(`${pack} is not published, no changes made`);
          } else {
            str += `${pack} had no changes (${res.verified.length} owners verified)`;
          }
        }
      } else {
        str += clc.yellow(`${pack} had some changes`);
        for (let o of res.added) {
          str += `\n    - ${clc.green(o)} was added`;
        }
        for (let o of res.removed) {
          str += `\n    - ${clc.red(o)} was removed`;
        }
      }
      log(str);
    }
  }

  if (yargs.argv.repos) {
    let repos = await pw.reposForPackages();
    log(repos.join(','));
  }

  if (yargs.argv.versionCount) {
    let versions = await pw.numVersionsForPackages();
    log(versions);
  }
}

export { parseConfig };
export default cli;
