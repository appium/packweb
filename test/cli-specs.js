// transpile:mocha

import http from 'http';
import { fs } from 'appium-support';
import path from 'path';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import { parseConfig } from '../lib/cli';


chai.should();
chai.use(chaiAsPromised);

const jsonFixture = path.resolve(__dirname, "..", "..", "test", "packweb.json");
let server;

async function startServer () {
  return await new B((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      res.writeHead(200, {'Content-type': 'application/json'});
      let contents = await fs.readFile(jsonFixture);
      res.end(contents.toString());
    }).listen(5678, '127.0.0.1', (err) => { // eslint-disable-line promise/prefer-await-to-callbacks
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

describe('PackWeb CLI', function () {
  describe('parseConfig', function () {
    before(async function () {
      await startServer();
    });
    after(function () {
      server.close();
    });
    it('should parse JSON', async function () {
      let res = await parseConfig('{"packages": ["foo"], "owners": ["bar"]}');
      res.should.eql({packages: ['foo'], owners: ['bar']});
    });
    it('should retrieve JSON from a file', async function () {
      let res = await parseConfig(jsonFixture);
      res.packages.group1.should.contain("pack1");
      res.owners.group1.should.eql(["bob"]);
    });
    it('should retrieve JSON from a url', async function () {
      let res = await parseConfig('http://localhost:5678');
      res.packages.group1.should.contain("pack1");
      res.owners.group1.should.eql(["bob"]);
    });
  });
});
