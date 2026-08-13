import { describe, expect, rs, test } from '@rstest/core'

import { withJoin } from './index'

describe('withJoin', () => {
  test('resolves nested locations with the supplied join function', () => {
    const join = rs.fn((...parts: string[]) => parts.join('.'))
    const defineMetric = withJoin(join)

    const metrics = defineMetric('checkout', (inCheckout) => ({
      payment: inCheckout('payment', (inPayment) => ({
        failed: inPayment('failed'),
      })),
    }))

    expect(metrics.toString()).toBe('checkout')
    expect(metrics.payment.toString()).toBe('checkout.payment')
    expect(metrics.payment.failed.toString()).toBe('checkout.payment.failed')
    expect(join).toHaveBeenCalledTimes(2)
    expect(join).toHaveBeenNthCalledWith(1, 'checkout', 'payment')
    expect(join).toHaveBeenNthCalledWith(2, 'checkout.payment', 'failed')
  })

  test('creates dynamic locations from builder arguments', () => {
    const defineLocation = withJoin((...parts) => parts.join('/'))
    const locations = defineLocation('data', (inData) => ({
      reports: inData('reports', (inReports) => ({
        monthly: (year, month) => inReports(`${year}-${month}.csv`),
      })),
      snapshots: inData('snapshots', (inSnapshots) => ({
        at: (createdAt: Date, shard: number) =>
          inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
      })),
    }))

    expect(locations.reports.monthly('2026', '08').toString()).toBe('data/reports/2026-08.csv')
    expect(locations.snapshots.at(new Date('2026-08-14'), 3).toString()).toBe(
      'data/snapshots/2026-08-14-3.json',
    )
  })

  test('freezes each node and keeps toString reserved', () => {
    const defineLocation = withJoin((...parts) => parts.join('/'))
    const locations = defineLocation('root', (inRoot) => ({
      child: inRoot('child'),
      toString: () => inRoot('shadow'),
    }))

    expect(locations.toString()).toBe('root')
    expect(Object.isFrozen(locations)).toBe(true)
    expect(Object.isFrozen(locations.child)).toBe(true)
    expect(() => Object.assign(locations, { extra: 'value' })).toThrow(TypeError)
  })
})
