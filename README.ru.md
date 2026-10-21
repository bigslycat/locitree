# Locitree

[English](./README.md) | Русский | [Українська](./README.uk.md) |
[Español](./README.es.md) | [简体中文](./README.zh-CN.md) |
[日本語](./README.ja.md)

[![CI](https://github.com/bigslycat/locitree/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/bigslycat/locitree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/bigslycat/locitree/graph/badge.svg)](https://app.codecov.io/gh/bigslycat/locitree)

Locitree — небольшой DSL на TypeScript для описания связанных расположений в
виде дерева с выводом типов и проверкой типобезопасности. Он полезен, когда пути
файловой системы, ключи объектов, маршруты или идентификаторы с пространствами
имён собираются в разных местах: вместо повторяющейся конкатенации строк можно
использовать единый API, структуру которого легко изучить.

Locitree только формирует строки. Он не обращается к файловой системе, не
создаёт каталоги и не проверяет, существует ли указанное расположение.

## Установка

```sh
npm install locitree
```

## Пути файловой системы

Импортируйте `defineLocation` из `locitree/node`, чтобы соединять сегменты с
помощью `path.join` из Node.js. При этом используются разделители и правила
нормализации путей текущей платформы.

В примерах ниже пути используют разделители POSIX (`/`). В Windows `path.join`
использует разделители этой платформы.

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

Функция обратного вызова получает фабрику расположений внутри текущего узла.
Названия, отражающие этот контекст (`inRoot`, `inSource` и так далее), помогают
задавать каждый сегмент относительно нужного родителя. Статические свойства
создаются сразу, а функции вроде `byName` создают динамические расположения при
вызове.

## Аргументы функций построения

Функция построения расположения может принимать любое количество аргументов.
Аргументы без аннотаций получают контекстный тип `string`; явно заданные типы
сохраняются в автоматически выводимых типах API дерева.

```ts
import { defineLocation } from 'locitree/node'

const locations = defineLocation('data', (inData) => ({
  reports: inData('reports', (inReports) => ({
    // Для year и month выводится тип string
    monthly: (year, month) => inReports(`${year}-${month}.csv`),
  })),
  snapshots: inData('snapshots', (inSnapshots) => ({
    // Явные типы описывают значения, допустимые для этого расположения.
    at: (createdAt: Date, shard: number) =>
      inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
  })),
}))

// data/reports/2026-08.csv
locations.reports.monthly('2026', '08').toString()

// data/snapshots/2026-08-14-3.json
locations.snapshots.at(new Date('2026-08-14'), 3).toString()
```

Обе функции выше принимают несколько аргументов. TypeScript отклонит число,
переданное в качестве `year`, или строку там, где `at` ожидает `Date` или
`number`.

Сама фабрика относительных расположений `inLocation` принимает строковый сегмент
и необязательную функцию обратного вызова для определения дочерних узлов.
Аргументы предметной области следует принимать в именованной функции построения,
а затем преобразовывать их в сегмент с помощью `inLocation`, как это делают
`monthly` и `at` выше.

## Другие форматы расположений

Экспортируемая из основного модуля функция `withJoin` позволяет применять тот же
API дерева к любой строковой иерархии. Например, имена метрик могут использовать
точки вместо разделителей файловой системы:

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

Этот подход также применим к путям URL, ключам объектных хранилищ, ключам кеша и
другим значениям, сегменты которых соединяются по единому правилу.

## Безопасность сегментов

Locitree не проверяет и не экранирует сегменты. Проверяйте недоверенные входные
данные до передачи в функцию построения: `..` может вывести путь за пределы
корневого каталога, разделители могут изменить иерархию, а сегменты URL не
кодируются автоматически.

## API

### `defineLocation(rootPath, defineChildren?)`

Доступна из `locitree/node`. Создаёт корневое расположение в файловой системе и
соединяет вложенные сегменты с помощью `node:path.join`. Возвращаемый корень
тоже является узлом расположения, поэтому его метод `toString()` возвращает
`rootPath`.

### `withJoin(join)`

Доступна из `locitree`. Создаёт фабрику расположений с переданной функцией
соединения строк. Возвращаемая фабрика имеет ту же сигнатуру, что и
`defineLocation`.

### Узлы расположений

Каждый узел расположения:

- предоставляет дочерние узлы и функции построения, возвращённые определяющей
  его функцией обратного вызова;
- возвращает полную результирующую строку при вызове `toString()`;
- поверхностно заморожен: его собственные свойства нельзя добавлять, удалять или
  переназначать.

Определяющая узел функция обратного вызова выполняется при его создании. Имя
`toString` зарезервировано для метода узла.

Locitree не выполняет операций ввода-вывода. Передавайте `node.toString()` в API
файловой системы, сети или SDK, которые принимают результирующее расположение.

## Совместимость

- Node.js `^14.18.0` или `>=16.0.0`.
- Включены сборки ESM и CommonJS.
- `locitree` не использует API Node.js; `locitree/node` использует `node:path` и
  работает только в Node.js.
- TypeScript необязателен. В JavaScript доступен тот же API времени выполнения,
  но без проверки типобезопасности на основе выведенных типов.

## Проект

- [Репозиторий](https://github.com/bigslycat/locitree)
- [Задачи и обсуждение ошибок](https://github.com/bigslycat/locitree/issues)
- [Лицензия MIT](./LICENSE)
