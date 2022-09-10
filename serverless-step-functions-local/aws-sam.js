const ora = require('ora');

const {start} = require('./starter.js');

class AWSSam {
  constructor({quiet = false} = {}, path = './') {
    this.quiet = quiet;
    this.path = path;
  }

  start(options = {}) {
    let spinner;

    if (!this.quiet) {
      spinner = ora('Starting AWS SAM Lambda Local...').start();
    }

    this.instance = start({...options, path: this.path});

    this.instance.process.on('close', code => {
      if (code !== null && code !== 0 && !this.quiet) {
        console.log('AWS SAM Lambda Local failed to start with code', code);
      }
    });

    if (!this.quiet) {
      spinner.succeed(`AWS SAM Lambda Local started: http://localhost:${options.port}`);
    }

    return this.instance.process.stdout;
  }

  stop() {
    if (!this.instance) {
      throw new Error('AWS SAM Lambda Local instance not running');
    }

    let spinner;

    if (!this.quiet) {
      spinner = ora('Stopping AWS SAM Lambda Local...').start();
    }

    this.instance.process.kill('SIGKILL');
    this.instance = undefined;

    if (!this.quiet) {
      spinner.succeed('AWS SAM Lambda Local stopped.');
    }
  }
}

module.exports = AWSSam;