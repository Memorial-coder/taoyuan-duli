import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const readText = path => readFileSync(resolve(rootDir, path), 'utf8')

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const extractFunctionBody = (source, functionName) => {
  const marker = `export const ${functionName} =`
  const start = source.indexOf(marker)
  assert(start >= 0, `找不到函数 ${functionName}`)
  const nextExport = source.indexOf('\nexport const ', start + marker.length)
  const end = nextExport > start ? nextExport : source.length
  return source.slice(start, end)
}

const assertManifestRetryPolicy = ({
  source,
  loadName,
  retryName,
  resetName,
  fallbackError,
}) => {
  const loadBody = extractFunctionBody(source, loadName)
  assert(loadBody.includes('if (manifestLoaded.value) return manifest.value'), `${loadName} 必须保留成功后的缓存短路`)
  assert(loadBody.includes('if (loadPromise) return loadPromise'), `${loadName} 必须复用进行中的加载 promise`)
  assert(loadBody.includes(`manifestError.value = error instanceof Error ? error.message : '${fallbackError}'`), `${loadName} 必须记录失败原因`)
  const catchIndex = loadBody.indexOf('} catch (error) {')
  assert(catchIndex >= 0, `${loadName} 必须保留 catch 分支`)
  const finallyIndex = loadBody.indexOf('} finally {', catchIndex)
  assert(finallyIndex > catchIndex, `${loadName} 必须在 catch 后清理加载状态`)
  const catchBody = loadBody.slice(catchIndex, finallyIndex)
  assert(!catchBody.includes('manifestLoaded.value = true'), `${loadName} 失败时不得把 manifestLoaded 置为 true`)

  const retryBody = extractFunctionBody(source, retryName)
  assert(retryBody.includes('manifestLoaded.value = false'), `${retryName} 必须先允许重新加载`)
  assert(retryBody.includes(`return ${loadName}()`), `${retryName} 必须复用 ${loadName}`)

  const resetBody = extractFunctionBody(source, resetName)
  assert(resetBody.includes('manifest.value = null'), `${resetName} 必须清空 manifest`)
  assert(resetBody.includes('manifestLoaded.value = false'), `${resetName} 必须清空 loaded 标记`)
  assert(resetBody.includes('loadPromise = null'), `${resetName} 必须清空悬挂 promise`)

  assert(source.includes(retryName), `use*Manifest 返回值必须暴露 ${retryName}`)
  assert(source.includes(resetName), `use*Manifest 返回值必须暴露 ${resetName}`)
}

assertManifestRetryPolicy({
  source: readText('src/composables/useItemIconManifest.ts'),
  loadName: 'loadItemIconManifest',
  retryName: 'retryItemIconManifest',
  resetName: 'resetItemIconManifest',
  fallbackError: 'item icon manifest load failed',
})

assertManifestRetryPolicy({
  source: readText('src/composables/useNpcPortraitManifest.ts'),
  loadName: 'loadNpcPortraitManifest',
  retryName: 'retryNpcPortraitManifest',
  resetName: 'resetNpcPortraitManifest',
  fallbackError: 'npc portrait manifest load failed',
})
