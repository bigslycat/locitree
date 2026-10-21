# Locitree

[English](./README.md) | [Русский](./README.ru.md) |
[Українська](./README.uk.md) | [Español](./README.es.md) |
[简体中文](./README.zh-CN.md) | 日本語

[![CI](https://github.com/bigslycat/locitree/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/bigslycat/locitree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/bigslycat/locitree/graph/badge.svg)](https://app.codecov.io/gh/bigslycat/locitree)

Locitree は、関連する位置を型推論と型安全性を備えたツリーとして記述するための、小さな TypeScript
DSL です。ファイルシステムのパス、オブジェクトのキー、ルート、名前空間付きの識別子をさまざまな場所で組み立てる場合に役立ちます。文字列の連結を繰り返す代わりに、構造を把握しやすい統一された API を利用できます。

Locitree は文字列を組み立てるだけです。ファイルシステムへのアクセス、ディレクトリの作成、位置の存在確認は行いません。

## インストール

```sh
npm install locitree
```

## ファイルシステムのパス

`locitree/node` から `defineLocation` をインポートすると、Node.js の `path.join`
でセグメントを結合できます。生成されるパスには、実行環境のプラットフォームに応じた区切り文字と正規化規則が適用されます。

以下のファイルシステムの例では、POSIX の区切り文字（`/`）を使用しています。Windows では、`path.join`
はそのプラットフォーム固有の区切り文字を使用します。

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

コールバックには、現在のノード配下の位置を作成するファクトリ関数が渡されます。その文脈に合わせて
`inRoot`、`inSource`
などと名付けることで、各セグメントがどの親を基準にするかが明確になります。静的なプロパティは直ちに作成され、`byName`
のような関数は呼び出し時に動的な位置を作成します。

## ビルダーの引数

位置ビルダーは任意の数の引数を受け取れます。型注釈のない引数には、文脈に応じて
`string`
型が付けられます。明示的な型注釈は、推論されるツリーの API に保持されます。

```ts
import { defineLocation } from 'locitree/node'

const locations = defineLocation('data', (inData) => ({
  reports: inData('reports', (inReports) => ({
    // year と month はどちらも string と推論されます
    monthly: (year, month) => inReports(`${year}-${month}.csv`),
  })),
  snapshots: inData('snapshots', (inSnapshots) => ({
    // 明示的な型で、この位置が受け取る値を表現できます。
    at: (createdAt: Date, shard: number) =>
      inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
  })),
}))

// data/reports/2026-08.csv
locations.reports.monthly('2026', '08').toString()

// data/snapshots/2026-08-14-3.json
locations.snapshots.at(new Date('2026-08-14'), 3).toString()
```

上のビルダーは、どちらも複数の引数を受け取ります。 `year` に数値を渡したり、`at`
が `Date` または `number`
を期待する箇所に文字列を渡したりすると、TypeScript はエラーにします。

相対位置を作成する `inLocation`
ファクトリ関数自体は、文字列のセグメントと、省略可能な子ノード定義用のコールバックを受け取ります。ドメイン固有の引数は名前付きビルダーで受け取り、`inLocation`
でセグメントに変換してください。上の `monthly` と `at`
は、この方法を使っています。

## その他の位置形式

コアモジュールがエクスポートする `withJoin`
を使うと、同じツリー API を任意の文字列の階層構造に適用できます。例えば、テレメトリーの名前にはファイルシステムの区切り文字の代わりにドットを使えます。

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

同じ方法は、URL パス、オブジェクトストレージのキー、キャッシュのキーなど、セグメントを一貫した規則で結合する値にも利用できます。

## セグメントの安全性

Locitree はセグメントの検証やエスケープを行いません。信頼できない入力は、ビルダーに渡す前に検証してください。
`..`
によってファイルシステムのルートを越える可能性があり、区切り文字によって階層構造が変わる場合もあります。また、URL のセグメントは自動的にはエンコードされません。

## API

### `defineLocation(rootPath, defineChildren?)`

`locitree/node`
から利用できます。ファイルシステムのルート位置を作成し、入れ子のセグメントを
`node:path.join` で結合します。返されるルート自体も位置ノードなので、その
`toString()` は `rootPath` を返します。

### `withJoin(join)`

`locitree`
から利用できます。指定された文字列結合関数を使う位置ファクトリ関数を作成します。返されるファクトリ関数のシグネチャは
`defineLocation` と同じです。

### 位置ノード

各位置ノードには、次の特徴があります。

- 定義コールバックが返した子ノードとビルダーを公開します。
- `toString()` は完全に解決された文字列を返します。
- 浅く凍結されているため、自身のプロパティを追加、削除、再代入することはできません。

定義コールバックは、ノードの作成時に実行されます。`toString`
はノードのメソッド用に予約されています。

Locitree は I/O を行いません。解決済みの位置を受け取るファイルシステム、ネットワーク、SDK の API には、`node.toString()`
を渡してください。

## 互換性

- Node.js `^14.18.0` または `>=16.0.0`。
- ESM と CommonJS のビルドが含まれます。
- `locitree` は Node.js の API を使用しません。`locitree/node` は `node:path`
  を使用し、Node.js 専用です。
- TypeScript は必須ではありません。JavaScript でも同じランタイム API を利用できますが、型推論による型安全性は提供されません。

## プロジェクト

- [リポジトリ](https://github.com/bigslycat/locitree)
- [課題・不具合の報告](https://github.com/bigslycat/locitree/issues)
- [MIT ライセンス](./LICENSE)
