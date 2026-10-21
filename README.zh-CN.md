# Locitree

[English](./README.md) | [Русский](./README.ru.md) |
[Українська](./README.uk.md) | [Español](./README.es.md) | 简体中文 |
[日本語](./README.ja.md)

[![CI](https://github.com/bigslycat/locitree/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/bigslycat/locitree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/bigslycat/locitree/graph/badge.svg)](https://app.codecov.io/gh/bigslycat/locitree)

Locitree 是一个小巧的 TypeScript
DSL，用于将相关位置描述为支持类型推断且类型安全的树。如果文件系统路径、对象键、路由或带命名空间的标识符需要在多个地方拼接，它可以提供一个结构清晰、便于探索的统一 API，避免反复拼接字符串。

Locitree 只构造字符串，不访问文件系统、不创建目录，也不检查位置是否存在。

## 安装

```sh
npm install locitree
```

## 文件系统路径

从 `locitree/node` 导入 `defineLocation`，即可使用 Node.js 的 `path.join`
连接路径段。生成的路径遵循当前平台的分隔符和规范化规则。

以下示例中的文件系统路径使用 POSIX 分隔符（`/`）。在 Windows 上，`path.join`
使用该平台原生的分隔符。

```ts
import { mkdir, readFile } from 'node:fs/promises'
import { defineLocation } from 'locitree/node'

const locations = defineLocation(process.cwd(), (inRoot) => ({
  source: inRoot('src', (inSource) => ({
    entry: inSource('index.ts'),
    features: inSource('features', (inFeatures) => ({
      byName: (name) => inFeatures(name),
    })),
  })),
  output: inRoot('dist'),
}))

await readFile(locations.source.entry.toString(), 'utf8')
await mkdir(locations.output.toString(), { recursive: true })

const billingDirectory = locations.source.features.byName('billing').toString()
```

回调函数接收一个工厂函数，用于创建当前节点下的位置。根据上下文为它命名（例如
`inRoot`、`inSource`）有助于让每个路径段都相对于正确的父节点。静态属性会立即创建；`byName`
这样的函数则在调用时创建动态位置。

## 构建函数的参数

位置构建函数可以接受任意数量的参数。没有类型注解的参数会通过上下文获得 `string`
类型；显式指定的类型注解会保留在推断出的树形 API 中。

```ts
import { defineLocation } from 'locitree/node'

const locations = defineLocation('data', (inData) => ({
  reports: inData('reports', (inReports) => ({
    // year 和 month 均推断为 string
    monthly: (year, month) => inReports(`${year}-${month}.csv`),
  })),
  snapshots: inData('snapshots', (inSnapshots) => ({
    // 显式类型可以描述此位置接受的值。
    at: (createdAt: Date, shard: number) =>
      inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
  })),
}))

// data/reports/2026-08.csv
locations.reports.monthly('2026', '08').toString()

// data/snapshots/2026-08-14-3.json
locations.snapshots.at(new Date('2026-08-14'), 3).toString()
```

以上两个构建函数都接受多个参数。如果将数字作为 `year` 传入，或在 `at` 要求
`Date` 或 `number` 的位置传入字符串，TypeScript 会报错。

用于创建相对位置的 `inLocation`
工厂函数本身接受一个字符串片段，还可以接受一个用于定义子节点的回调函数。请在具名构建函数中接收业务参数，再通过
`inLocation` 将其转换为片段，就像上面的 `monthly` 和 `at` 一样。

## 其他位置格式

核心模块导出的 `withJoin`
可以将同一套树形 API 用于任何字符串层级结构。例如，遥测指标名称可以使用点号代替文件系统分隔符：

```ts
import { withJoin } from 'locitree'

const defineMetric = withJoin((...parts) => parts.join('.'))

const metrics = defineMetric('checkout', (inCheckout) => ({
  payment: inCheckout('payment', (inPayment) => ({
    failed: inPayment('failed'),
  })),
}))

metrics.payment.failed.toString() // checkout.payment.failed
```

同样的方法也适用于 URL 路径、对象存储键、缓存键，以及其他各片段采用一致连接规则的值。

## 片段安全性

Locitree 不会验证或转义片段。将不可信输入传给构建函数前，请先进行验证： `..`
可能使路径越出文件系统根目录，分隔符可能改变层级结构，而 URL 片段也不会自动编码。

## API

### `defineLocation(rootPath, defineChildren?)`

由 `locitree/node` 提供。创建文件系统的根位置，并使用 `node:path.join`
连接嵌套片段。返回的根本身也是一个位置节点，因此它的 `toString()` 返回
`rootPath`。

### `withJoin(join)`

由 `locitree`
提供。使用传入的字符串连接函数创建位置工厂函数。返回的工厂函数具有与
`defineLocation` 相同的签名。

### 位置节点

每个位置节点：

- 暴露其定义回调函数返回的子节点和构建函数；
- 通过 `toString()` 返回完整解析后的字符串；
- 进行浅冻结，因此不能添加、删除或重新赋值其自身属性。

定义回调函数会在节点创建时执行。`toString` 是保留给节点方法的名称。

Locitree 不执行任何 I/O 操作。请将 `node.toString()`
传给需要解析后位置的文件系统、网络或 SDK API。

## 兼容性

- Node.js `^14.18.0` 或 `>=16.0.0`。
- 包含 ESM 和 CommonJS 构建产物。
- `locitree` 不使用任何 Node.js API；`locitree/node` 使用
  `node:path`，仅支持 Node.js。
- TypeScript 是可选的。在 JavaScript 中可以使用相同的运行时 API，但不具备类型推断带来的类型安全检查。

## 项目

- [代码仓库](https://github.com/bigslycat/locitree)
- [问题反馈](https://github.com/bigslycat/locitree/issues)
- [MIT 许可证](./LICENSE)
