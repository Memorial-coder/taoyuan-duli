import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const mailboxStore = await readFile(path.join(projectRoot, 'src', 'stores', 'useMailboxStore.ts'), 'utf8')
const authView = await readFile(path.join(projectRoot, 'src', 'views', 'AuthView.vue'), 'utf8')
const mainMenu = await readFile(path.join(projectRoot, 'src', 'views', 'MainMenu.vue'), 'utf8')

for (const marker of [
  'const resetForAccountChange = () =>',
  'mails.value = []',
  'unreadCount.value = 0',
  'detailMap.value = {}',
  'arrivalDigest.value = createEmptyArrivalDigest()',
  'lastSeenMailIds = new Set<string>()',
]) {
  assert(mailboxStore.includes(marker), `mailbox reset is missing marker: ${marker}`)
}

assert(mailboxStore.includes('isProtectedApiError(error) && error.status === 401'), 'mailbox refresh should reset visible state on confirmed 401')
assert(authView.includes('mailboxStore.resetForAccountChange()'), 'AuthView must reset mailbox state after login/logout account changes')
assert(mainMenu.includes('mailboxStore.resetForAccountChange()'), 'MainMenu must reset mailbox state after account scope reload')

console.log('[qa-mailbox-account-reset] OK')
