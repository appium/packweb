import _ from 'lodash';
import clc from 'cli-color';
import { fs } from 'appium-support';
import request from 'request-promise';
import { default as PackWeb } from './packweb';
import log from 'fancy-log';
import semver from 'semver';
import parser from './parser';


const COMMIT_MESSAGE_LENGTH = 25;

async function parseConfig (c) {
  let contents;
  try {
    return JSON.parse(c);
  } catch (ign) {}

  try {
    if (c.indexOf('http') === 0) {
      contents = await request(c);
    } else {
      contents = await fs.readFile(c);
    }
    return JSON.parse(contents.toString());
  } catch (err) {
    throw new Error(`Could not parse config. Must be JSON data, file, or URL: ${err.message}`);
  }
}

async function doShow (pw) {
  const stats = await pw.ownerStatusForPackages();
  for (const [pack, stat] of _.toPairs(stats)) {
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

async function doUpdate (pw) {
  const results = await pw.updateOwnersForPackages();
  for (const [pack, res] of _.toPairs(results)) {
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

async function doRepos (pw) {
  const repos = await pw.reposForPackages();
  log(repos.join(','));
}

async function doVersionCount (pw) {
  const versions = await pw.numVersionsForPackages();
  log(versions);
}

async function doPublishStatus (pw, opts) {
  for (let {repo, pkg, commits} of await pw.publishStatusForPackages(opts)) {
    // `npm version` produces a commit that is the version
    if (!semver.valid((commits[0] || {}).message)) {
      // if it needs to be published, colorize
      repo = clc.bgMagentaBright(repo);
    } else {
      if (!opts.showPublishedRepos) {
        continue;
      }
    }

    log(`${repo} (npm: ${pkg})`);
    for (const commit of commits) {
      if (_.isString(commit)) {
        // if we caught an error above, this is just the error message
        log.warn(`  error: ${commit}`);
        continue;
      }
      log(`  commit: '${_.truncate(commit.message, {length: COMMIT_MESSAGE_LENGTH})}' ` +
          `(${commit.sha.substring(0, 7)}, by ${commit.author}/${commit.committer})`);
    }
  }
}

async function cli () {
  const args = parser.parseArgs();

  const pw = new PackWeb(await parseConfig(args.configPath[0]), !args.verboseNpm);
  if (args.show) {
    await doShow(pw);
  }

  if (args.update) {
    await doUpdate(pw);
  }

  if (args.repos) {
    await doRepos(pw);
  }

  if (args.versionCount) {
    await doVersionCount(pw);
  }

  if (args.publishStatus) {
    await doPublishStatus(pw, {
      githubToken: args.githubToken,
      showPublishedRepos: args.showPublishedRepos,
      commitDepth: args.commitDepth,
    });
  }
}

export { parseConfig };
export default cli;
