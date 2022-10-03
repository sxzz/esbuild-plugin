import type { OnLoadArgs, OnLoadOptions } from 'esbuild'

export function filterOnTransform(options: OnLoadOptions, args: OnLoadArgs) {
  const matchNamespace =
    typeof options.namespace !== 'undefined'
      ? options.namespace === args.namespace
      : true
  return options.filter.test(args.path) && matchNamespace
}

export async function asyncFlatten<T>(arr: T[]): Promise<T[]> {
  do {
    arr = (await Promise.all(arr)).flat(Number.POSITIVE_INFINITY) as any
  } while (arr.some((v: any) => v?.then))
  return arr
}
