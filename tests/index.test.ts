import path from 'node:path'
import { test } from 'vitest'
import { build } from 'esbuild'
import { PluginManager } from '../src'
import type { PPlugin } from '../src'

const fixtures = path.resolve(__dirname, 'fixtures')

test('basic', async () => {
  const plugin1: PPlugin = {
    name: 'test',
    setup(build) {
      build.onTransform &&
        build.onTransform({ filter: /.*/ }, (args) => {
          return {
            ...args,
            contents: (args.contents as string).replace("'foo'", "'bar'"),
          }
        })
    },
  }
  await build({
    entryPoints: [path.resolve(fixtures, 'index.ts')],
    bundle: true,
    plugins: [
      PluginManager({
        plugins: [plugin1],
      }),
    ],
  })
})
