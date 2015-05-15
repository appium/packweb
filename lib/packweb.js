import _ from 'lodash';
import B from 'bluebird';
import npm from 'npm';

class PackWeb {
  constructor (packConfig) {
    this.groups = this.validateConfig(packConfig);
    this.config = packConfig;
    this.npm = null;
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
    for (let [key, val] of _.pairs(configTypes)) {
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
        for (let [group, groupPackages] of _.pairs(val)) {
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
    return this.groups.filter(g => _.contains(this.config[k][g], v));
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
    if (this.npm) return;
    this.npm = await B.promisify(npm.load)({});
  }

  async ownerStatusForPackage (p) {
    await this.loadNpm();
    let res = await B.promisify(this.npm.commands.owner)(['ls', p]);
    let curOwners = res.map(o => o.name);
    let desiredOwners = this.ownersForPackage(p);
    return {
      validOwners: _.intersection(curOwners, desiredOwners),
      invalidOwners: _.difference(curOwners, desiredOwners),
      notYetOwners: _.difference(desiredOwners, curOwners)
    };
  }

  async ownerStatusForPackages () {
    let statuses = {};
    for (let p of this.packages) {
      statuses[p] = await this.ownerStatusForPackage(p);
    }
    return statuses;
  }
}

export default PackWeb;
