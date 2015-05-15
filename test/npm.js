
// create a mock npm library for unit tests
function injectNpm (pwObj, resMap) {
  pwObj.loadNpm = (async function () {
    if (this.npm) return;
    this.npm = {
      commands: {
        owner: function (args, cb) {
          let res = resMap;
          for (let arg of args) {
            res = res[arg];
          }
          cb(null, res);
        }
      }
    };
  }).bind(pwObj);
}

export { injectNpm };
