const { spawn } = require('child_process');

const start = options => {
  const args = [];

  args.push('sam');
  args.push('local');
  args.push('start-lambda');

  if (options.port) {
    args.push('-p');
    args.push(options.port);
  }

  if (options.region) {
    args.push('--region');
    args.push(options.region);
  }

  const child = spawn('unbuffer', args, {
    cwd: options.path,
    env: process.env
    // Stdio: ['inherit', 'inherit', 'inherit']
  });

  if (!child.pid) {
    throw new Error('Unable to start Step Functions Local process.');
  }

  child.on('error', code => {
    throw new Error(code);
  });

  return { process: child };
};

module.exports = { start };
