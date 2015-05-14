// transpile:mocha

import { PackWeb } from '..';
import { default as fixtures } from './fixtures';
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
});

