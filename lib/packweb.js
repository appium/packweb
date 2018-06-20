import _ from 'lodash';
import B from 'bluebird';
import npm from 'npm';
import log from 'fancy-log';
const octokit = require('@octokit/rest')();


class PackWeb {
  constructor (packConfig, silenceNpm = true) {
    this.groups = this.validateConfig(packConfig);
    this.config = packConfig;
    this.silenceNpm = silenceNpm;
    this.npm = null;
    this.npmUser = null;
    this.octokit = octokit;
  }

  validateConfig (config) {
    if (!config) {
      throw new Error("Please pass in a config object");
    }
    if (typeof config !== 'object') {
      throw new Error("PackWeb config needs to be an object");
    }
    let configTypes = {packages: config.packages, owners: config.owners};
    let groupNames = {};
    for (let [key, val] of _.toPairs(configTypes)) {
      if (!val) {
        throw new Error(`PackWeb config needs to have '${key}' key`);
      }
      let isArray = val instanceof Array && val.length > 0;
      let isObj = !isArray && typeof val === 'object' && _.size(val) > 0;
      if (!(isArray || isObj)) {
        throw new Error(`${key} needs to be an array of strings or hash ` +
                        `of groups`);
      }
      groupNames[key] = [];
      if (isObj) {
        for (let [group, groupPackages] of _.toPairs(val)) {
          if (!(groupPackages instanceof Array) || groupPackages.length < 1) {
            throw new Error(`'${key}' group '${group}' must be an array`);
          }
          groupNames[key].push(group);
        }
      }
    }
    if (_.difference(groupNames.packages, groupNames.owners).length) {
      throw new Error(`Packages and owners must have the same groups. ` +
                      `Your packages were ` +
                      `${JSON.stringify(groupNames.packages)} and owners ` +
                      `were ${JSON.stringify(groupNames.owners)}`);
    }
    return groupNames.packages;
  }

  _configObjects (objectType) {
    if (this.groups.length === 0) {
      return this.config[objectType];
    }
    return _(this.config[objectType]).values().flatten().uniq().value();
  }

  get packages () {
    return this._configObjects('packages');
  }

  get owners () {
    return this._configObjects('owners');
  }

  _groupsForObject (k, v) {
    return this.groups.filter(g => _.includes(this.config[k][g], v));
  }

  groupsForPackage (p) {
    return this._groupsForObject('packages', p);
  }

  ownersForPackage (p) {
    if (this.groups.length === 0) {
      return this.config.owners;
    }
    let groups = this.groupsForPackage(p);
    return _(groups.map(g => this.config.owners[g])).flatten().uniq().value();
  }

  async loadNpm () {
    if (this.npm) {
      return;
    }
    this.npm = await B.promisify(npm.load)({});
    this.npmUser = await B.promisify(this.npm.commands.whoami)([], this.silenceNpm);
  }

  async ownerCmd (cmd, args) {
    await this.loadNpm();
    if (!(args instanceof Array)) {
      args = [args];
    }

    // `npm owner` outputs to the console no matter what
    // so manually silence if necessary
    /* eslint-disable no-console */
    const cLog = console.log;
    if (this.silenceNpm) {
      console.log = _.noop;
    }

    try {
      return await B.promisify(this.npm.commands.owner)([cmd, ...args]);
    } finally {
      // re-enable console logging
      console.log = cLog;
    }
    /* eslint-enable no-console */
  }

  async infoCmd (pkg) {
    await this.loadNpm();
    try {
      return await B.promisify(this.npm.commands.info)([pkg], this.silenceNpm);
    } catch (err) {
      log.error(`Package '${pkg}' could not be accessed: ${err.message}`);
    }
  }

  async infoForPackage (p) {
    let info = await this.infoCmd(p);
    if (!info) {
      return null;
    }
    info = info[_.keys(info)[0]];
    return info;
  }

  async numVersionsForPackages () {
    let nums = {};
    for (let p of this.packages) {
      let info = await this.infoForPackage(p);
      if (info && info.versions) {
        nums[p] = info.versions.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).length;
      } else {
        nums[p] = 0;
      }
    }
    return nums;
  }

  async repoForPackage (p) {
    let info = await this.infoForPackage(p);
    if (!info) {
      return null;
    }
    if (!info.repository) {
      return null;
    }
    let gitRe = /github\.com\/(.+)\.git/;
    if (!gitRe.test(info.repository.url)) {
      log.error(`Don't know what to do with non-github urls right now, for package ${p}`);
      return null;
    }
    let match = gitRe.exec(info.repository.url);
    return match[1];
  }

  async ownerStatusForPackage (p) {
    let res;
    try {
      res = await this.ownerCmd('ls', p);
    } catch (e) {
      if (e.message.includes('404')) {
        return {validOwners: [], invalidOwners: [], notYetOwners: []};
      }
      throw e;
    }
    for (let o of res) {
      if (!o || !o.name) {
        throw new Error(`Did not get a valid owner list from NPM for '${p}'`);
      }
    }

    let curOwners = res.map((o) => o.name);
    let desiredOwners = this.ownersForPackage(p);
    return {
      validOwners: _.intersection(curOwners, desiredOwners),
      invalidOwners: _.difference(curOwners, desiredOwners),
      notYetOwners: _.difference(desiredOwners, curOwners)
    };
  }

  async updateOwnersForPackage (p) {
    let stats = await this.ownerStatusForPackage(p);
    let ret = {added: [], removed: [], verified: stats.validOwners, denied: false};
    if (stats.validOwners.length > 0 &&
        !_.includes(stats.validOwners, this.npmUser)) {
      ret.denied = true;
      return ret;
    }
    for (let toRemove of stats.invalidOwners) {
      try {
        let res = await this.ownerCmd('remove', [toRemove, p]);
        if (!res || !res.success) {
          throw new Error('something went wrong');
        }
        ret.removed.push(toRemove);
      } catch (err) {
        throw new Error(`Problem removing ${toRemove} from ${p}: ${err.message}`);
      }
    }
    for (let toAdd of stats.notYetOwners) {
      try {
        let res = await this.ownerCmd('add', [toAdd, p]);
        if (!res || !res.success) {
          throw new Error('something went wrong');
        }
        ret.added.push(toAdd);
      } catch (err) {
        throw new Error(`Problem adding ${toAdd} to ${p}: ${err.message}`);
      }
    }
    return ret;
  }

  async reposForPackages () {
    let repos = [];
    for (let p of this.packages) {
      let repo = await this.repoForPackage(p);
      if (repo) {
        repos.push(repo);
      }
    }
    return repos;
  }

  async ownerStatusForPackages () {
    let statuses = {};
    for (let p of this.packages) {
      statuses[p] = await this.ownerStatusForPackage(p);
    }
    return statuses;
  }

  async updateOwnersForPackages () {
    let results = {};
    for (let p of this.packages) {
      let res;
      try {
        res = await this.updateOwnersForPackage(p);
      } catch (e) {
        if (e.message.includes("are not an owner")) {
          res = {denied: true};
        } else {
          throw e;
        }
      }
      results[p] = res;
    }
    return results;
  }

  async publishStatusForPackages (opts = {}) {
    const {
      commitDepth = 2,
      githubToken = process.env.GITHUB_ACCESS_TOKEN,
    } = opts;

    if (githubToken) {
      // without this, we may run into rate limiting if run more than once
      this.octokit.authenticate({
        type: 'token',
        token: githubToken,
      });
    }

    let repos = [];
    for (const pkg of this.packages) {
      let repo = await this.repoForPackage(pkg);
      let owner = 'appium';
      if (_.isNull(repo)) {
        continue;
      } else if (repo.includes('/')) {
        ([owner, repo] = repo.split('/'));
      }
      let commits = await this.octokit.repos.getCommits({
        owner,
        repo,
        per_page: commitDepth,
      }).catch((err) => {
        // the only error so far that should be skipped, it seems
        if (!err.message.includes('Git Repository is empty')) {
          return [err.message];
        }
        throw err;
      });
      commits = (commits.data || []).map(function (commit) {
        return {
          sha: commit.sha,
          message: (commit.commit.message || '').split('\n')[0],
          author: commit.author ? commit.author.login : '',
          committer: commit.committer ? commit.committer.login : '',
        };
      });
      repos.push({
        repo: `${owner}/${repo}`,
        pkg,
        commits,
      });
    }

    return repos;
  }
}

export default PackWeb;
