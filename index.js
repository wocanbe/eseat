const chalk = require('chalk');
const program = require('commander');
const version = require('../package.json').version;

program.version(version);

program
  .command('dev [input...]')
  .description('starts a eseat server in dev mode')
  .option(
    '--hmr-port <port>',
    'set the port to serve HMR websockets, defaults to random',
    parseInt
  )
  .option('--no-hmr', 'disable hot module replacement')
  .option('--no-source-maps', 'disable sourcemaps')
  .option('-V, --version', 'output the version number')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .action(eseat);

program
  .command('build [input...]')
  .description('bundles for production')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .action(eseat);

program
  .command('serve')
  .description('starts a eseat server')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .action(eseat);

program
  .command('help [command]')
  .description('display help information for a command')
  .action(function(command) {
    let cmd = program.commands.find(c => c.name() === command) || program;
    cmd.help();
  });

program.on('--help', function() {
  console.log('');
  console.log(
    '  Run `' +
      chalk.bold('eseat help <command>') +
      '` for more information on specific commands'
  );
  console.log('');
});

// Make serve the default command except for --help
var args = process.argv;
if (args[2] === '--help' || args[2] === '-h') args[2] = 'help';
if (!args[2] || !program.commands.some(c => c.name() === args[2])) {
  args.splice(2, 0, 'serve');
}

program.parse(args);

async function eseat(main, command) {
  // Require Eseat here so the help command is fast
  const eseat = options.https ? require('./server/https') : require('./server/http')

  if (command.name() === 'dev') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  } else {
    command.production = true;
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }

  const config = require('../../config/')
  await eseat(config[command.name()])
}
