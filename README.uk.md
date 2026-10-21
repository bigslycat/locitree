# Locitree

[English](./README.md) | [Русский](./README.ru.md) | Українська |
[Español](./README.es.md) | [简体中文](./README.zh-CN.md) |
[日本語](./README.ja.md)

[![CI](https://github.com/bigslycat/locitree/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/bigslycat/locitree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/bigslycat/locitree/graph/badge.svg)](https://app.codecov.io/gh/bigslycat/locitree)

Locitree — невелика DSL на TypeScript для опису пов’язаних розташувань у вигляді
типобезпечного дерева з автоматичним виведенням типів. Вона корисна, коли шляхи
файлової системи, ключі об’єктів, маршрути або ідентифікатори з просторами імен
формуються в багатьох місцях: замість повторюваного з’єднання рядків можна
використовувати єдиний API, структуру якого легко дослідити.

Locitree лише формує рядки. Вона не звертається до файлової системи, не створює
каталоги й не перевіряє, чи існує вказане розташування.

## Встановлення

```sh
npm install locitree
```

## Шляхи файлової системи

Імпортуйте `defineLocation` з `locitree/node`, щоб з’єднувати сегменти за
допомогою `path.join` з Node.js. При цьому використовуються роздільники та
правила нормалізації шляхів поточної платформи.

У наведених нижче прикладах шляхи використовують роздільники POSIX (`/`). У
Windows `path.join` використовує роздільники цієї платформи.

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

Функція зворотного виклику отримує фабрику розташувань усередині поточного
вузла. Назва, що відображає цей контекст (`inRoot`, `inSource` тощо), допомагає
задавати кожен сегмент відносно потрібного батьківського вузла. Статичні
властивості створюються одразу; функції на кшталт `byName` створюють динамічні
розташування під час виклику.

## Аргументи функцій побудови

Функція побудови розташування може приймати довільну кількість аргументів.
Аргументи без анотацій отримують контекстний тип `string`; явно задані анотації
зберігаються в автоматично виведених типах API дерева.

```ts
import { defineLocation } from 'locitree/node'

const locations = defineLocation('data', (inData) => ({
  reports: inData('reports', (inReports) => ({
    // Для year і month виводиться тип string
    monthly: (year, month) => inReports(`${year}-${month}.csv`),
  })),
  snapshots: inData('snapshots', (inSnapshots) => ({
    // Явні типи описують значення, допустимі для цього розташування.
    at: (createdAt: Date, shard: number) =>
      inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
  })),
}))

// data/reports/2026-08.csv
locations.reports.monthly('2026', '08').toString()

// data/snapshots/2026-08-14-3.json
locations.snapshots.at(new Date('2026-08-14'), 3).toString()
```

Обидві наведені вище функції побудови приймають кілька аргументів. TypeScript
відхилить число, передане як `year`, або рядок там, де `at` очікує `Date` чи
`number`.

Сама фабрика відносних розташувань `inLocation` приймає рядковий сегмент і,
необов’язково, ще одну функцію зворотного виклику для визначення дочірніх
вузлів. Аргументи предметної області слід приймати в іменованій функції
побудови, а потім перетворювати їх на сегмент за допомогою `inLocation`, як це
роблять `monthly` і `at` вище.

## Інші формати розташувань

Функція `withJoin`, яку експортує основний модуль, застосовує той самий API
дерева до будь-якої рядкової ієрархії. Наприклад, назви телеметричних показників
можуть використовувати крапки замість роздільників файлової системи:

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

Цей підхід також застосовний до шляхів URL, ключів об’єктних сховищ, ключів кешу
та інших значень, сегменти яких з’єднуються за єдиним правилом.

## Безпека сегментів

Locitree не перевіряє й не екранує сегменти. Перевіряйте недовірені вхідні дані
перед передаванням у функцію побудови: `..` може вивести шлях за межі кореневого
каталогу, роздільники можуть змінити ієрархію, а сегменти URL не кодуються
автоматично.

## API

### `defineLocation(rootPath, defineChildren?)`

Доступна з `locitree/node`. Створює кореневе розташування у файловій системі та
з’єднує вкладені сегменти за допомогою `node:path.join`. Повернений корінь також
є вузлом розташування, тому його метод `toString()` повертає `rootPath`.

### `withJoin(join)`

Доступна з `locitree`. Створює фабрику розташувань із переданою функцією
з’єднання рядків. Повернена фабрика має ту саму сигнатуру, що й
`defineLocation`.

### Вузли розташувань

Кожен вузол розташування:

- надає доступ до дочірніх вузлів і функцій побудови, повернених функцією
  зворотного виклику, що його визначає;
- повертає повністю сформований рядок під час виклику `toString()`;
- поверхнево заморожений: його власні властивості не можна додавати, видаляти чи
  перепризначати.

Функція зворотного виклику, що визначає вузол, виконується під час його
створення. Ім’я `toString` зарезервовано для методу вузла.

Locitree не виконує операцій введення-виведення. Передавайте `node.toString()` в
API файлової системи, мережі або SDK, які приймають сформоване розташування.

## Сумісність

- Node.js `^14.18.0` або `>=16.0.0`.
- Містить збірки ESM і CommonJS.
- `locitree` не використовує API Node.js; `locitree/node` використовує
  `node:path` і працює лише в Node.js.
- TypeScript необов’язковий. У JavaScript доступний той самий API під час
  виконання, але без перевірки типобезпечності на основі виведених типів.

## Проєкт

- [Репозиторій](https://github.com/bigslycat/locitree)
- [Проблеми та пропозиції](https://github.com/bigslycat/locitree/issues)
- [Ліцензія MIT](./LICENSE)
