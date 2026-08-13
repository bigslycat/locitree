import { defineConfig } from '@rslib/core'

const SYNTAX = [
  'node >= 14.18 and node < 15',
  'node >= 16.0.0',
  '>0.17%',
  'last 5 versions',
  'not dead',
]

export default defineConfig({
  source: {
    entry: {
      index: ['./src', '!**/*.test.ts'],
    },

    tsconfigPath: './tsconfig.build.json',
  },

  output: {
    cleanDistPath: true,
    minify: true,

    sourceMap: {
      js: 'source-map',
    },
  },

  lib: [
    {
      format: 'esm',
      bundle: false,
      syntax: SYNTAX,

      dts: {
        autoExtension: true,
      },

      redirect: {
        dts: {
          extension: true,
        },
      },

      output: {
        distPath: './dist/esm',
        module: true,
      },
    },
    {
      format: 'cjs',
      bundle: false,
      syntax: SYNTAX,

      dts: {
        autoExtension: true,
      },

      redirect: {
        dts: {
          extension: true,
        },
      },

      output: {
        distPath: './dist/cjs',
        module: false,
      },
    },
  ],
})
