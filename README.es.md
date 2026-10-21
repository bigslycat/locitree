# Locitree

[English](./README.md) | [Русский](./README.ru.md) |
[Українська](./README.uk.md) | Español | [简体中文](./README.zh-CN.md) |
[日本語](./README.ja.md)

[![CI](https://github.com/bigslycat/locitree/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/bigslycat/locitree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/bigslycat/locitree/graph/badge.svg)](https://app.codecov.io/gh/bigslycat/locitree)

Locitree es un pequeño DSL de TypeScript para describir ubicaciones relacionadas
como un árbol con inferencia de tipos y seguridad de tipos. Resulta útil cuando
las rutas del sistema de archivos, las claves de objetos, las rutas o los
identificadores con espacios de nombres se construyen en muchos lugares y se
necesita una única API fácil de explorar en lugar de concatenar cadenas una y
otra vez.

Locitree solo construye cadenas. No accede al sistema de archivos, no crea
directorios ni comprueba si una ubicación existe.

## Instalación

```sh
npm install locitree
```

## Rutas del sistema de archivos

Importa `defineLocation` desde `locitree/node` para unir segmentos con
`path.join` de Node.js. Así, las rutas usan los separadores y las reglas de
normalización de la plataforma actual.

Los resultados de los ejemplos siguientes usan separadores POSIX (`/`). En
Windows, `path.join` usa los separadores nativos de la plataforma.

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

La función de callback recibe una fábrica de ubicaciones bajo el nodo actual.
Darle un nombre acorde con ese contexto (`inRoot`, `inSource`, etc.) ayuda a que
cada segmento sea relativo al padre correcto. Las propiedades estáticas se crean
de inmediato; las funciones como `byName` crean ubicaciones dinámicas al
invocarlas.

## Argumentos de las funciones constructoras

Una función constructora de ubicaciones puede aceptar cualquier número de
argumentos. Los argumentos sin anotaciones reciben el tipo contextual `string`;
las anotaciones explícitas se conservan en los tipos inferidos de la API del
árbol.

```ts
import { defineLocation } from 'locitree/node'

const locations = defineLocation('data', (inData) => ({
  reports: inData('reports', (inReports) => ({
    // Los tipos de year y month se infieren como string
    monthly: (year, month) => inReports(`${year}-${month}.csv`),
  })),
  snapshots: inData('snapshots', (inSnapshots) => ({
    // Los tipos explícitos modelan los valores que acepta esta ubicación.
    at: (createdAt: Date, shard: number) =>
      inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
  })),
}))

// data/reports/2026-08.csv
locations.reports.monthly('2026', '08').toString()

// data/snapshots/2026-08-14-3.json
locations.snapshots.at(new Date('2026-08-14'), 3).toString()
```

Ambas funciones constructoras anteriores aceptan varios argumentos. TypeScript
rechaza un número pasado como `year`, o una cadena donde `at` espera un `Date` o
un `number`.

La propia fábrica de ubicaciones relativas `inLocation` acepta un segmento de
cadena y, opcionalmente, otro callback para definir los nodos hijos. Recibe los
argumentos del dominio en una función constructora con nombre y conviértelos en
un segmento con `inLocation`, como hacen `monthly` y `at` en el ejemplo
anterior.

## Otros formatos de ubicación

La función `withJoin`, exportada por el módulo principal, aplica la misma API de
árbol a cualquier jerarquía de cadenas. Por ejemplo, los nombres de telemetría
pueden usar puntos en lugar de separadores del sistema de archivos:

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

El mismo enfoque sirve para rutas de URL, claves de almacenamiento de objetos,
claves de caché y otros valores cuyos segmentos siguen una regla de unión
uniforme.

## Seguridad de los segmentos

Locitree no valida ni escapa los segmentos. Valida las entradas no confiables
antes de pasarlas a una función constructora: `..` puede salir del directorio
raíz, los separadores pueden cambiar la jerarquía y los segmentos de URL no se
codifican automáticamente.

## API

### `defineLocation(rootPath, defineChildren?)`

Disponible desde `locitree/node`. Crea una ubicación raíz del sistema de
archivos y une los segmentos anidados con `node:path.join`. La raíz devuelta
también es un nodo de ubicación, por lo que su método `toString()` devuelve
`rootPath`.

### `withJoin(join)`

Disponible desde `locitree`. Crea una fábrica de ubicaciones con la función de
unión de cadenas proporcionada. La fábrica devuelta tiene la misma firma que
`defineLocation`.

### Nodos de ubicación

Cada nodo de ubicación:

- expone los nodos hijos y las funciones constructoras devueltos por su callback
  de definición;
- devuelve su cadena completamente resuelta mediante `toString()`;
- está congelado de forma superficial, por lo que no se pueden añadir, eliminar
  ni reasignar sus propiedades propias.

El callback de definición se ejecuta cuando se crea su nodo. `toString` está
reservado para el método del nodo.

Locitree no realiza operaciones de entrada/salida. Pasa `node.toString()` a las
API del sistema de archivos, de red o de SDK que acepten la ubicación resuelta.

## Compatibilidad

- Node.js `^14.18.0` o `>=16.0.0`.
- Se incluyen compilaciones ESM y CommonJS.
- `locitree` no usa API de Node.js; `locitree/node` usa `node:path` y solo
  funciona en Node.js.
- TypeScript es opcional. JavaScript ofrece la misma API en tiempo de ejecución,
  pero sin la seguridad de tipos que proporciona la inferencia.

## Proyecto

- [Repositorio](https://github.com/bigslycat/locitree)
- [Problemas y propuestas](https://github.com/bigslycat/locitree/issues)
- [Licencia MIT](./LICENSE)
