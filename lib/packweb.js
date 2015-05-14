import _ from 'lodash';

class PackWeb {
  constructor (packConfig) {
    this.groups = this.validateConfig(packConfig);
    this.config = packConfig;
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
      if (isArray) {
        groupNames[key] = ['all'];
      } else if (isObj) {
        groupNames[key] = [];
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
}

export default PackWeb;
