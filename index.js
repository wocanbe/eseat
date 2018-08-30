const chalk = require('chalk');
const program = require('commander');
const version = require('./package.json').version;

program.version(version);

program
  .command('dev')
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
  .command('build')
  .description('bundles for production')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .action(eseat);

program
  .command('server')
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
  args.splice(2, 0, 'dev');
}

program.parse(args);

async function eseat(options) {
  const cmdType = options.name()
  if (cmdType === 'dev') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  } else {
    options.production = true;
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }
  const config = require('../../config/index')[cmdType]
  const eseat = config.isHttps ? require('./server/https') : require('./server/http')
  const result = await eseat(config)
  if (result) {
    console.log('eseat ready')
  } else {
    eseat.bundle()
  }
}
