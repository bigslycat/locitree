import { exec } from 'node:child_process'

exec(
  'attw --pack . --format json',
  {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  },
  (error, stdout, stderr) => {
    if (!error) return

    process.stdout.write(stdout)
    process.stderr.write(stderr)
    process.exitCode = typeof error.code === 'number' ? error.code : 1
  },
)
