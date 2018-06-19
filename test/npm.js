/* eslint-disable promise/prefer-await-to-callbacks */

// create a mock npm library for unit tests
function injectNpm (pwObj, user, resMap) {
  pwObj.loadNpm = (async function () {
    if (this.npm) {
      return;
    }
    this.npm = {
      commands: {
        owner (args, cb) {
          let res = resMap;
          for (let arg of args) {
            res = res[arg];
          }
          if (res instanceof Error) {
            cb(res);
          } else {
            cb(null, res);
          }
        }
      }
    };
  }).bind(pwObj);
  pwObj.npmUser = user;
}

export { injectNpm };
