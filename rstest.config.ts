import { withRslibConfig } from '@rstest/adapter-rslib'
import { defineConfig } from '@rstest/core'

export default defineConfig({
  extends: withRslibConfig(),

  coverage: {
    provider: 'istanbul',
    include: ['src/**/*.ts'],
    reporters: ['text', 'json-summary', 'lcovonly', 'cobertura'],
    reportOnFailure: true,
  },
})
