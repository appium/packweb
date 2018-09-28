// transpile:mocha

import { PackWeb } from '..';
import { default as fixtures } from './fixtures';
import { injectNpm } from './npm';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';


const should = chai.should();
chai.use(chaiAsPromised);

describe('PackWeb', function () {
  describe('config files', function () {
    it('should load config with arrays', function () {
      new PackWeb(fixtures.goodArray);
    });
    it('should load config with objects', function () {
      new PackWeb(fixtures.goodObject);
    });
    it('should not load an empty config', function () {
      should.throw(() => {
        new PackWeb();
      }, /pass in a config object/);
    });
    it('should not load config of the wrong type', function () {
      const bads = [
        fixtures.badTopLevel1, fixtures.badTopLevel2,
        fixtures.badTopLevel3, fixtures.badTopLevel4,
      ];
      for (let bad of bads) {
        should.throw(() => {
          new PackWeb(bad);
        }, /(needs to have)|(needs to be an)/);
      }
    });
    it('should not load packages of the wrong type', function () {
      should.throw(() => {
        new PackWeb(fixtures.badPackages1);
      }, /needs to be an array of strings/);
    });
    it('should not load empty package lists', function () {
      should.throw(() => {
        new PackWeb(fixtures.badPackages2);
      }, /needs to be an array of strings/);
    });
    it('should not load packages with bad group values', function () {
      should.throw(() => {
        new PackWeb(fixtures.badPackages3);
      }, /'packages'.+group.+must be an array/);
    });
    it('should not load packages with empty group values', function () {
      should.throw(() => {
        new PackWeb(fixtures.badPackages4);
      }, /'packages'.+group.+must be an array/);
    });
    it('should not load owners of the wrong type', function () {
      should.throw(() => {
        new PackWeb(fixtures.badOwners1);
      }, /needs to be an array of strings/);
    });
    it('should not load empty owner lists', function () {
      should.throw(() => {
        new PackWeb(fixtures.badOwners2);
      }, /'owners'.+group.+must be an array/);
    });
    it('should not load mismatched groups', function () {
      for (let bad of [fixtures.badGroups1, fixtures.badGroups2]) {
        should.throw(() => {
          new PackWeb(bad);
        }, /Packages and owners must have the same groups/);
      }
    });
  });

  describe('#packages', function () {
    it('should return packages for array-based configs', function () {
      let p = new PackWeb(fixtures.goodArray);
      p.packages.should.eql(["pack1", "pack2", "pack3"]);
    });
    it('should return packages for group-based configs', function () {
      let p = new PackWeb(fixtures.goodObject);
      p.packages.should.eql(["pack1", "pack2", "pack3"]);
    });
  });

  describe('#owners', function () {
    it('should return owners for array-based configs', function () {
      let p = new PackWeb(fixtures.goodArray);
      p.owners.should.eql(["alice", "bob"]);
    });
    it('should return owners for group-based configs', function () {
      let p = new PackWeb(fixtures.goodObject);
      p.owners.should.eql(["alice", "bob", "charles"]);
    });
  });

  describe('#ownersForPackage', function () {
    it('should return all owners when there are no groups', function () {
      let p = new PackWeb(fixtures.goodArray);
      p.ownersForPackage("pack1").should.eql(["alice", "bob"]);
    });
    it('should return owners in any group the package is in', function () {
      let p = new PackWeb(fixtures.goodObject);
      p.ownersForPackage("pack1").should.eql(["alice", "bob"]);
      p.ownersForPackage("pack2").should.eql(["alice", "bob", "charles"]);
      p.ownersForPackage("pack3").should.eql(["alice", "charles"]);
    });
  });

  describe('#ownerStatusForPackage', function () {
    let p, stat;
    before(async function () {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, 'alice', {
        ls: {
          pack1: [
            {name: "alice", email: "alice@foo.com"},
            {name: "pirate", email: "pirate@foo.com"}
          ],
          pack2: [{email: "alice@foo.com"}],
          pack3: new Error("404")
        }
      });
      stat = await p.ownerStatusForPackage("pack1");
    });
    it('should return the valid owners', function () {
      stat.validOwners.should.eql(["alice"]);
    });
    it('should return the invalid owners', function () {
      stat.invalidOwners.should.eql(["pirate"]);
    });
    it('should return not yet owners', function () {
      stat.notYetOwners.should.eql(["bob"]);
    });
    it('should throw an error if npm sends us something weird', async function () {
      await p.ownerStatusForPackage("pack2").should.eventually.be
                .rejectedWith(/Did not get a valid owner list/);
    });
    it('should not error but ignore a package if its not published', async function () {
      let res = await p.ownerStatusForPackage("pack3");
      res.validOwners.should.eql([]);
      res.invalidOwners.should.eql([]);
      res.notYetOwners.should.eql([]);
    });
  });

  describe('#ownerStatusForPackages', function () {
    let p, stats;
    before(function () {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, 'alice', {
        ls: {
          pack1: [
            {name: "alice", email: "alice@foo.com"},
            {name: "pirate", email: "pirate@foo.com"}
          ],
          pack2: [
            {name: "alice", email: "alice@foo.com"},
            {name: "bob", email: "bob@foo.com"}
          ],
          pack3: [
            {name: "alice", email: "alice@foo.com"},
            {name: "bob", email: "bob@foo.com"},
            {name: "pirate", email: "pirate@foo.com"}
          ]
        }
      });
    });
    it('should return data for all packages', async function () {
      stats = await p.ownerStatusForPackages();

      stats.pack1.validOwners.should.eql(["alice"]);
      stats.pack1.invalidOwners.should.eql(["pirate"]);
      stats.pack1.notYetOwners.should.eql(["bob"]);
      stats.pack2.validOwners.should.eql(["alice", "bob"]);
      stats.pack2.invalidOwners.should.eql([]);
      stats.pack2.notYetOwners.should.eql([]);
      stats.pack3.validOwners.should.eql(["alice", "bob"]);
      stats.pack3.invalidOwners.should.eql(["pirate"]);
      stats.pack3.notYetOwners.should.eql([]);
    });
  });

  describe('#ownerStatusForPackage (real NPM)', function () {
    // this test requires you to be logged in
    before(function () {
      if (process.env.CI) {
        return this.skip();
      }
    });
    it('should connect to real npm and display owners', async function () {
      let p = new PackWeb(fixtures.mochawait);
      let stat = await p.ownerStatusForPackage("mochawait");
      stat.validOwners.should.contain("jlipps");
    });
  });

  describe('#updateOwnersForPackage', function () {
    let p;
    const npmSpec = {
      ls: {
        pack1: [
          {name: "alice", email: "alice@foo.com"},
          {name: "pirate", email: "pirate@foo.com"}
        ],
        pack2: ["foo"],
        pack3: new Error("404"),
        pack4: [{name: "bob", email: "bob@foo.com"}]
      },
      add: {
        bob: {
          pack1: {success: true}
        }
      },
      remove: {
        pirate: {
          pack1: {success: true}
        }
      }
    };

    before(function () {
      p = new PackWeb(fixtures.goodArray2);
      injectNpm(p, 'alice', npmSpec);
    });

    it('should add and remove owners based on status', async function () {
      let res = await p.updateOwnersForPackage("pack1");
      res.added.should.eql(["bob"]);
      res.removed.should.eql(["pirate"]);
      res.verified.should.eql(["alice"]);
      res.denied.should.eql(false);
    });
    it('should throw an error if we cannot get status before updating', async function () {
      await p.updateOwnersForPackage("pack2").should.eventually.be
                .rejectedWith(/Did not get a valid/);
    });
    it('should throw an error if npm add/remove fails', async function () {
      npmSpec.add.bob.pack1.success = false;
      injectNpm(p, 'alice', npmSpec);
      await p.updateOwnersForPackage("pack1").should.eventually.be
                .rejectedWith(/Problem adding bob/);
      npmSpec.add.bob.pack1.success = true;
      npmSpec.remove.pirate.pack1 = null;
      await p.updateOwnersForPackage("pack1").should.eventually.be
                .rejectedWith(/Problem removing pirate/);
    });
    it('should say if active user isnt a current owner', async function () {
      let res = await p.updateOwnersForPackage("pack4");
      res.added.should.eql([]);
      res.removed.should.eql([]);
      res.verified.should.eql(["bob"]);
      res.denied.should.equal(true);
    });
    it('should not throw an error if the package to be updated doesnt exist', async function () {
      let res = await p.updateOwnersForPackage("pack3");
      res.added.should.eql([]);
      res.removed.should.eql([]);
      res.verified.should.eql([]);
      res.denied.should.equal(false);
    });
  });

  describe('#updateOwnersForPackages', function () {
    let p;
    const npmSpec = {
      ls: {
        pack1: [
          {name: "alice", email: "alice@foo.com"},
          {name: "pirate", email: "pirate@foo.com"}
        ],
        pack2: [
          {name: "alice", email: "alice@foo.com"},
          {name: "bob", email: "bob@foo.com"}
        ],
        pack3: [
          {name: "alice", email: "alice@foo.com"},
          {name: "bob", email: "bob@foo.com"},
          {name: "pirate", email: "pirate@foo.com"}
        ]
      },
      add: {
        bob: {
          pack1: {success: true},
        }
      },
      remove: {
        pirate: {
          pack1: {success: true},
          pack3: {success: true}
        }
      }
    };

    before(function () {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, 'alice', npmSpec);
    });

    it('should add and remove owners for all packages', async function () {
      let res = await p.updateOwnersForPackages();
      res.pack1.added.should.eql(["bob"]);
      res.pack1.removed.should.eql(["pirate"]);
      res.pack2.added.should.eql([]);
      res.pack2.removed.should.eql([]);
      res.pack3.removed.should.eql(["pirate"]);
    });
  });

  describe('#publishStatusForPackages', function () {
    const p = new PackWeb(fixtures.goodArray);
    before(function () {
      injectNpm(p, 'alice', {}, {
        pack1: {
          '1.8.1': {
            repository: {
              url: 'https://github.com/appium/pack1.git',
            }
          },
        },
        pack2: {
          '0.0.1': {
            repository: {
              url: 'https://github.com/something/pack2.git',
            }
          }
        },
        pack3: {
          '42.42.42': {
            repository: {
              url: 'https://github.com/appium/pack3.git',
            }
          }
        },
      });

      p.octokit = {
        authenticate () {},
        repos: {
          getCommits (opts) {
            const res = {
              pack1: {
                data: [{
                  sha: '12345678901234567890',
                  commit: {
                    message: '1.8.1',
                  },
                  author: {
                    login: 'imurchie',
                  },
                  committer: {
                    login: 'imurchie',
                  },
                }, {
                  sha: '012345678901234567890',
                  commit: {
                    message: 'Merge something in there',
                  },
                  author: {
                    login: 'imurchie',
                  },
                  committer: {
                    login: 'imurchie',
                  },
                }],
              },
              pack2: {
                data: [{
                  sha: '12345678901234567890',
                  commit: {
                    message: 'Update pack1 to 1.8.1',
                  },
                  author: {
                    login: 'imurchie',
                  },
                  committer: {
                    login: 'imurchie',
                  },
                }],
              },
              pack3: {
                data: [],
              },
            }[opts.repo];
            return B.resolve(res);
          }
        },
      };
    });
    it('should get publish status', async function () {
      const res = await p.publishStatusForPackages({});

      res[0].repo.should.eql('appium/pack1');
      res[0].pkg.should.eql('pack1');
      res[0].commits.length.should.eql(2);
      res[0].commits[0].message.should.eql('1.8.1');

      res[1].repo.should.eql('something/pack2');
      res[1].pkg.should.eql('pack2');
      res[1].commits.length.should.eql(1);

      res[2].repo.should.eql('appium/pack3');
      res[2].pkg.should.eql('pack3');
      res[2].commits.length.should.eql(0);
    });
  });
});
