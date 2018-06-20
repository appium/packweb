/* eslint-disable promise/prefer-await-to-callbacks */


const run = function run (args, map, cb) {
  let res = map;
  for (const arg of args) {
    res = res[arg];
  }
  if (res instanceof Error) {
    cb(res);
  } else {
    cb(null, res);
  }
};

// create a mock npm library for unit tests
function injectNpm (pwObj, user, ownerResMap, infoResMap) {
  pwObj.loadNpm = (async function () {
    if (this.npm) {
      return;
    }
    this.npm = {
      commands: {
        owner (args, cb) {
          run(args, ownerResMap, cb);
        },
        info (args, silent, cb) {
          run(args, infoResMap, cb);
        },
      }
    };
  }).bind(pwObj);
  pwObj.npmUser = user;
}

export { injectNpm };
