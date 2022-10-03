import { readFile } from 'node:fs/promises'
import { asyncFlatten, filterOnTransform } from './utils'
import type {
  OnLoadArgs,
  OnLoadOptions,
  OnLoadResult,
  Plugin,
  PluginBuild,
} from 'esbuild'

export interface PPluginBuild extends PluginBuild {
  meta?: {
    pplugin?: {
      subPlugins: PPlugin[]
    }
  }
  onTransform?: (
    options: OnLoadOptions,
    callback: (
      args: OnLoadResult
    ) =>
      | OnLoadResult
      | null
      | undefined
      | Promise<OnLoadResult | null | undefined>
  ) => void
}
export type PPlugin = Omit<Plugin, 'setup'> & {
  setup: (build: PPluginBuild) => void | Promise<void>
}

export type PluginOption =
  | PPlugin
  | false
  | null
  | undefined
  | PluginOption[]
  | Promise<PPlugin | false | null | undefined | PluginOption[]>

export interface Options {
  plugins?: PluginOption[]
}

const resolveOptions = async (
  options: Options
): Promise<{
  plugins: PPlugin[]
}> => {
  return {
    plugins: (await asyncFlatten(options.plugins || [])).filter(
      (p) => !!p
    ) as PPlugin[],
  }
}

export const PluginManager = (options: Options = {}): Plugin => {
  const onLoads: Parameters<PPluginBuild['onLoad']>[] = []
  const onTransforms: Parameters<NonNullable<PPluginBuild['onTransform']>>[] =
    []
  const registerOnLoad: PPluginBuild['onLoad'] = (...args) => {
    onLoads.push(args)
  }
  const registerOnTransform: PPluginBuild['onTransform'] = (...args) => {
    onTransforms.push(args)
  }

  const callOnTransform = async (args: OnLoadArgs, result: OnLoadResult) => {
    let newResult = result
    for (const onTransform of onTransforms) {
      if (!filterOnTransform(onTransform[0], args)) continue
      const _result = await onTransform[1](result)
      if (!_result) continue
      newResult = _result
    }
    return newResult
  }

  return {
    name: 'esbuild-plugin',
    async setup(build) {
      const { plugins } = await resolveOptions(options)
      for (const plugin of plugins) {
        await plugin.setup({
          ...build,
          onLoad: registerOnLoad,
          onTransform: registerOnTransform,
          meta: {
            pplugin: {
              subPlugins: plugins,
            },
          },
        })
      }

      for (const [options, cb] of onLoads) {
        build.onLoad(options, async (args) => {
          const result: OnLoadResult | null | undefined = await cb(args)
          if (!result) return result
          return callOnTransform(args, result)
        })
      }

      // fallback file
      build.onLoad({ filter: /.*/, namespace: 'file' }, async (args) => {
        const contents = await readFile(args.path, 'utf-8')
        const result: OnLoadResult = {
          pluginData: args.pluginData,
          contents,
        }
        return callOnTransform(args, result)
      })
    },
  }
}
