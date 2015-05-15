// transpile:mocha

import { PackWeb } from '..';
import { default as fixtures } from './fixtures';
import { injectNpm } from './npm';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';

const should = chai.should();
chai.use(chaiAsPromised);

describe('PackWeb', () => {
  describe('config files', () => {
    it('should load config with arrays', () => {
      new PackWeb(fixtures.goodArray);
    });
    it('should load config with objects', () => {
      new PackWeb(fixtures.goodObject);
    });
    it('should not load an empty config', () => {
      should.throw(() => {
        new PackWeb();
      }, /pass in a config object/);
    });
    it('should not load config of the wrong type', () => {
      const bads = [fixtures.badTopLevel1, fixtures.badTopLevel2,
                    fixtures.badTopLevel3, fixtures.badTopLevel4];
      for (let bad of bads) {
        should.throw(() => {
          new PackWeb(bad);
        }, /(needs to have)|(needs to be an)/);
      }
    });
    it('should not load packages of the wrong type', () => {
      should.throw(() => {
        new PackWeb(fixtures.badPackages1);
      }, /needs to be an array of strings/);
    });
    it('should not load empty package lists', () => {
      should.throw(() => {
        new PackWeb(fixtures.badPackages2);
      }, /needs to be an array of strings/);
    });
    it('should not load packages with bad group values', () => {
      should.throw(() => {
        new PackWeb(fixtures.badPackages3);
      }, /'packages'.+group.+must be an array/);
    });
    it('should not load packages with empty group values', () => {
      should.throw(() => {
        new PackWeb(fixtures.badPackages4);
      }, /'packages'.+group.+must be an array/);
    });
    it('should not load owners of the wrong type', () => {
      should.throw(() => {
        new PackWeb(fixtures.badOwners1);
      }, /needs to be an array of strings/);
    });
    it('should not load empty owner lists', () => {
      should.throw(() => {
        new PackWeb(fixtures.badOwners2);
      }, /'owners'.+group.+must be an array/);
    });
    it('should not load mismatched groups', () => {
      for (let bad of [fixtures.badGroups1, fixtures.badGroups2]) {
        should.throw(() => {
          new PackWeb(bad);
        }, /Packages and owners must have the same groups/);
      }
    });
  });

  describe('#packages', () => {
    it('should return packages for array-based configs', () => {
      let p = new PackWeb(fixtures.goodArray);
      p.packages.should.eql(["pack1", "pack2", "pack3"]);
    });
    it('should return packages for group-based configs', () => {
      let p = new PackWeb(fixtures.goodObject);
      p.packages.should.eql(["pack1", "pack2", "pack3"]);
    });
  });

  describe('#owners', () => {
    it('should return owners for array-based configs', () => {
      let p = new PackWeb(fixtures.goodArray);
      p.owners.should.eql(["alice", "bob"]);
    });
    it('should return owners for group-based configs', () => {
      let p = new PackWeb(fixtures.goodObject);
      p.owners.should.eql(["alice", "bob", "charles"]);
    });
  });

  describe('#ownersForPackage', () => {
    it('should return all owners when there are no groups', () => {
      let p = new PackWeb(fixtures.goodArray);
      p.ownersForPackage("pack1").should.eql(["alice", "bob"]);
    });
    it('should return owners in any group the package is in', () => {
      let p = new PackWeb(fixtures.goodObject);
      p.ownersForPackage("pack1").should.eql(["alice", "bob"]);
      p.ownersForPackage("pack2").should.eql(["alice", "bob", "charles"]);
      p.ownersForPackage("pack3").should.eql(["alice", "charles"]);
    });
  });

  describe('#ownerStatusForPackage', () => {
    let p, stat;
    before(async () => {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, {
        ls: {
          pack1: [
            {name: "alice", email: "alice@foo.com"},
            {name: "pirate", email: "pirate@foo.com"}
          ],
          pack2: ["foo"],
          pack3: [{email: "alice@foo.com"}]
        }
      });
      stat = await p.ownerStatusForPackage("pack1");
    });
    it('should return the valid owners', async () => {
      stat.validOwners.should.eql(["alice"]);
    });
    it('should return the invalid owners', async () => {
      stat.invalidOwners.should.eql(["pirate"]);
    });
    it('should return not yet owners', async () => {
      stat.notYetOwners.should.eql(["bob"]);
    });
    it('should throw an error if npm sends us something weird', async () => {
      await p.ownerStatusForPackage("pack2").should.eventually.be
                .rejectedWith(/Did not get a valid owner list/);
      await p.ownerStatusForPackage("pack3").should.eventually.be
                .rejectedWith(/Did not get a valid owner list/);
    });
  });

  describe('#ownerStatusForPackages', () => {
    let p, stats;
    before(async () => {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, {
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
      stats = await p.ownerStatusForPackages();
    });
    it('should return data for all packages', async () => {
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

  describe('#ownerStatusForPackage (real NPM)', () => {
    it('should conect to real npm and display owners', async () => {
      let p = new PackWeb(fixtures.mochawait);
      let stat = await p.ownerStatusForPackage("mochawait");
      stat.validOwners.should.contain("jlipps");
    });
  });

  describe('#updateOwnersForPackage', () => {
    let p;
    let npmSpec = {
      ls: {
        pack1: [
          {name: "alice", email: "alice@foo.com"},
          {name: "pirate", email: "pirate@foo.com"}
        ],
        pack2: ["foo"],
        pack3: [{email: "alice@foo.com"}]
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

    before(async () => {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, npmSpec);
    });

    it('should add and remove owners based on status', async () => {
      let res = await p.updateOwnersForPackage("pack1");
      res.added.should.eql(["bob"]);
      res.removed.should.eql(["pirate"]);
    });
    it('should throw an error if we cannot get status before updating', async () => {
      await p.updateOwnersForPackage("pack2").should.eventually.be
                .rejectedWith(/Did not get a valid/);
    });
    it('should throw an error if npm add/remove fails', async () => {
      npmSpec.add.bob.pack1.success = false;
      injectNpm(p, npmSpec);
      await p.updateOwnersForPackage("pack1").should.eventually.be
                .rejectedWith(/Problem adding bob/);
      npmSpec.add.bob.pack1.success = true;
      npmSpec.remove.pirate.pack1 = null;
      await p.updateOwnersForPackage("pack1").should.eventually.be
                .rejectedWith(/Problem removing pirate/);
    });
  });

  describe('#updateOwnersForPackages', () => {
    let p;
    let npmSpec = {
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

    before(async () => {
      p = new PackWeb(fixtures.goodArray);
      injectNpm(p, npmSpec);
    });

    it('should add and remove owners for all packages', async () => {
      let res = await p.updateOwnersForPackages();
      res.pack1.added.should.eql(["bob"]);
      res.pack1.removed.should.eql(["pirate"]);
      res.pack2.added.should.eql([]);
      res.pack2.removed.should.eql([]);
      res.pack3.removed.should.eql(["pirate"]);
    });
  });
});

