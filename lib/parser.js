const ArgumentParser = require('argparse').ArgumentParser;

const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'Display published package information for Appium dependencies',
});
parser.addArgument(['--config', '-c'], {
  required: false,
  defaultValue: ['https://raw.githubusercontent.com/appium/appium/master/packweb.json'],
  help: 'Packweb config file. Defaults to Appium base config',
  nargs: 1,
  dest: 'configPath',
});
parser.addArgument(['--verbose-npm'], {
  required: false,
  defaultValue: false,
  help: 'Print everything npm prints',
  nargs: 0,
  dest: 'verboseNpm',
});
parser.addArgument(['--show', '-s'], {
  required: false,
  defaultValue: false,
  help: 'Show the owner status for packages in config',
  nargs: 0,
  dest: 'show',
});
parser.addArgument(['--update', '-u'], {
  required: false,
  defaultValue: false,
  help: 'Update the owner status for packages in config',
  nargs: 1,
  dest: 'update',
});
parser.addArgument(['--repos', '-r'], {
  required: false,
  defaultValue: false,
  help: 'Show the repositories for packages in config',
  nargs: 0,
  dest: 'repos',
});
parser.addArgument(['--version-count', '--versionCount'], {
  required: false,
  defaultValue: false,
  help: 'Show the number of versions for packages in config',
  nargs: 0,
  dest: 'versionCount',
});
parser.addArgument(['--publish', '--publish-status', '-p'], {
  required: false,
  defaultValue: false,
  help: 'Show the publish status for packages in config',
  nargs: 0,
  dest: 'publishStatus',
});

// options for `publish` task
parser.addArgument(['--display-published-repos'], {
  required: false,
  defaultValue: false,
  help: 'Publish option: Display published repos in addition to those that need publishing',
  nargs: 0,
  dest: 'showPublishedRepos',
});
parser.addArgument(['--github-token'], {
  required: false,
  defaultValue: process.env.GITHUB_ACCESS_TOKEN,
  help: 'Publish option: Github access token (see https://github.com/settings/tokens). Can also be specified with `GITHUB_ACCESS_TOKEN` environment variable',
  nargs: 1,
  dest: 'githubToken',
});
parser.addArgument(['--commit-depth'], {
  required: false,
  defaultValue: 2,
  help: 'Publish option: The number of commits to be retrieved (defaults to 2)',
  nargs: 1,
  dest: 'commitDepth',
});

export default parser;
