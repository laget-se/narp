import yargs from 'yargs';
import read from 'read';

import { getConfig } from './confighelpers.js';
import { Vendors } from './constants.js';
import * as api from './index.js';

// Adds a password option to the yargs object
const sharedOptions = yargsObj =>
  yargsObj
    .option('password', {
      alias: 'p',
      type: 'string',
      description: '[Transifex] Password',
    })
    .option('token', {
      alias: 't',
      type: 'string',
      description: '[POEditor] API token',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'More verbose output',
    });

// Construct the CLI
const args = yargs
  .command('pull', 'Get stuff', sharedOptions)
  .command('push', 'Push stuff', sharedOptions)
  .help('help')
  .alias('help', 'h')
  .argv;

const configs = getConfig();

const buildOptions = (credentials, verbose) => ({
  vendor: { credentials },
  verbose,
});

const askForPassword = (fn) => {
  read({ prompt: 'Password: ', silent: true }, (er, password) => {
    fn(password);
  });
};

const askForToken = (fn) => {
  read({ prompt: 'API Token: ', silent: true }, (er, token) => {
    fn(token);
  });
};

if (args._[0] === 'pull') {
  if (configs.vendor.name === Vendors.TRANSIFEX && !configs.vendor.credentials.password && !args.password) {
    askForPassword(password => {
      api.pull(buildOptions({ password }, args.verbose));
    });
  }
  else if (configs.vendor.name === Vendors.POEDITOR && !configs.vendor.credentials.token && !args.token) {
    askForToken(token => {
      api.pull(buildOptions({ token }, args.verbose));
    });
  }
  else {
    api.pull(buildOptions(
      {
        password: args.password || configs.vendor.credentials.password,
        token: args.token || configs.vendor.credentials.token,
      },
      args.verbose
    ));
  }
}

if (args._[0] === 'push') {
  if (configs.vendor.name === Vendors.TRANSIFEX && !configs.vendor.credentials.password && !args.password) {
    askForPassword(password => {
      api.pull(buildOptions({ password }, args.verbose));
    });
  }
  else if (configs.vendor.name === Vendors.POEDITOR && !configs.vendor.credentials.token && !args.token) {
    askForToken(token => {
      api.push(buildOptions({ token }, args.verbose));
    });
  }
  else {
    api.push(buildOptions(
      {
        password: args.password || configs.vendor.credentials.password,
        token: args.token || configs.vendor.credentials.token,
      },
      args.verbose
    ));
  }
}

if (args._[0] === 'extract') {
  api.extract(buildOptions(null, args.verbose), args._[1]);
}
