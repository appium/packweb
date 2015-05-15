// transpile:mocha

import http from 'http';
import fs from 'fs';
import path from 'path';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import 'mochawait';
import { parseConfig } from '../lib/cli';

chai.should();
chai.use(chaiAsPromised);

const jsonFixture = path.resolve(__dirname, "..", "..", "test", "packweb.json");
let server;

async function startServer () {
  return new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      res.writeHead(200, {'Content-type': 'application/json'});
      let contents = await B.promisify(fs.readFile)(jsonFixture);
      res.end(contents.toString());
    }).listen(5678, '127.0.0.1', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

describe('PackWeb CLI', () => {
  describe('parseConfig', () => {
    before(async () => {
      await startServer();
    });
    after(() => {
      server.close();
    });
    it('should parse JSON', async () => {
      let res = await parseConfig('{"packages": ["foo"], "owners": ["bar"]}');
      res.should.eql({packages: ['foo'], owners: ['bar']});
    });
    it('should retrieve JSON from a file', async () => {
      let res = await parseConfig(jsonFixture);
      res.packages.group1.should.contain("pack1");
      res.owners.group1.should.eql(["bob"]);
    });
    it('should retrieve JSON from a url', async () => {
      let res = await parseConfig('http://localhost:5678');
      res.packages.group1.should.contain("pack1");
      res.owners.group1.should.eql(["bob"]);
    });
  });
});
