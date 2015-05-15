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
    let p1, stat1; //, p2, stat2;
    before(async () => {
      p1 = new PackWeb(fixtures.goodArray);
      injectNpm(p1, {
        ls: {
          pack1: [
            {name: "alice", email: "alice@foo.com"},
            {name: "pirate", email: "pirate@foo.com"}
          ]
        }
      });
      stat1 = await p1.ownerStatusForPackage("pack1");
    });
    it('should return the valid owners', async () => {
      stat1.validOwners.should.eql(["alice"]);
    });
    it('should return the invalid owners', async () => {
      stat1.invalidOwners.should.eql(["pirate"]);
    });
    it('should return not yet owners', async () => {
      stat1.notYetOwners.should.eql(["bob"]);
    });
  });

  describe('#ownerStatusForPackage (real NPM)', () => {
    it('should conect to real npm and display owners', async () => {
      let p = new PackWeb(fixtures.mochawait);
      let stat = await p.ownerStatusForPackage("mochawait");
      stat.validOwners.should.contain("jlipps");
    });
  });
});

