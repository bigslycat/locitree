import { join } from 'node:path'

import { describe, expect, rs, test } from '@rstest/core'

import { defineLocation } from './index'

rs.mock('node:path', () => ({
  join: rs.fn((...paths: string[]) => paths.join('::')),
}))

describe('defineLocation', () => {
  test('uses node:path.join for nested locations', () => {
    const locations = defineLocation('workspace', (inProject) => ({
      source: inProject('src', (inSource) => ({
        entry: inSource('index.ts'),
      })),
    }))

    expect(locations.source.entry.toString()).toBe('workspace::src::index.ts')
    expect(join).toHaveBeenNthCalledWith(1, 'workspace', 'src')
    expect(join).toHaveBeenNthCalledWith(2, 'workspace::src', 'index.ts')
  })
})
