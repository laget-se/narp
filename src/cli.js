import yargs from 'yargs';
import * as api from './index';

const args = yargs
                .command('pull', 'Get stuff')
                .command('push', 'Push stuff')
                .help('help')
                .alias('help', 'h')
                .argv;

if (args._[0] === 'pull') {
  api.pull();
}

if (args._[0] === 'push') {
  api.push();
}
