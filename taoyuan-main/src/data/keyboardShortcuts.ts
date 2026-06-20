export type KeyboardShortcutCategory = 'system' | 'navigation' | 'tool' | 'ui' | 'uiInteraction' | 'miningCombat' | 'movement'
export type KeyboardShortcutScope = 'global' | 'context' | 'modal' | 'miningCombat' | 'movement'

export type KeyboardShortcutBinding = {
  code: string
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
}

export type KeyboardShortcutActionId =
  | 'systemSettings'
  | 'systemRecordCenter'
  | 'systemSaveManager'
  | 'navFarm'
  | 'navInventory'
  | 'navQuest'
  | 'navRegionMap'
  | 'navCharInfo'
  | 'navSkills'
  | 'navPotential'
  | 'navGoals'
  | 'navAnimal'
  | 'navHome'
  | 'navBreeding'
  | 'navShop'
  | 'navWorkshop'
  | 'navUpgrade'
  | 'navFishPond'
  | 'navQuarry'
  | 'navCottage'
  | 'navDecoration'
  | 'navForage'
  | 'navFishing'
  | 'navMining'
  | 'navCooking'
  | 'navWallet'
  | 'navMail'
  | 'navAchievement'
  | 'navGlossary'
  | 'navMuseum'
  | 'navGuild'
  | 'navHanhai'
  | 'toolVoidChest'
  | 'uiPrevSection'
  | 'uiNextSection'
  | 'uiConfirm'
  | 'uiCancel'
  | 'uiFocusPrimary'
  | 'systemSleepPrompt'
  | 'uiFocusSearch'
  | 'uiPageUp'
  | 'uiPageDown'
  | 'uiQtyDecrease'
  | 'uiQtyIncrease'
  | 'miningAttack'
  | 'miningDefend'
  | 'miningFlee'
  | 'miningItems'
  | 'miningPresets'
  | 'miningDescend'
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'

export type KeyboardShortcutDefinition = {
  id: KeyboardShortcutActionId
  category: KeyboardShortcutCategory
  scope: KeyboardShortcutScope
  label: string
  description: string
  defaultBinding: KeyboardShortcutBinding | null
}

export type KeyboardShortcutBindingMap = Record<KeyboardShortcutActionId, KeyboardShortcutBinding | null>

export const KEYBOARD_SHORTCUT_SAVE_VERSION = 1

export const KEYBOARD_SHORTCUT_CATEGORY_LABELS: Record<KeyboardShortcutCategory, string> = {
  system: '系统',
  navigation: '导航',
  tool: '工具',
  ui: '界面',
  uiInteraction: '通用交互',
  miningCombat: '矿洞战斗',
  movement: '移动'
}

const binding = (code: string, key: string, modifiers: Partial<Omit<KeyboardShortcutBinding, 'code' | 'key'>> = {}): KeyboardShortcutBinding => ({
  code,
  key,
  ...modifiers
})

export const KEYBOARD_SHORTCUT_DEFINITIONS: KeyboardShortcutDefinition[] = [
  { id: 'systemSettings', category: 'system', scope: 'global', label: '打开/关闭设置', description: '游戏内设置弹窗', defaultBinding: binding('KeyO', 'O') },
  { id: 'systemRecordCenter', category: 'system', scope: 'global', label: '打开记录中心', description: '日志与每日记录', defaultBinding: binding('KeyL', 'L') },
  { id: 'systemSaveManager', category: 'system', scope: 'global', label: '打开存档管理', description: '管理、保存或导入存档', defaultBinding: binding('F9', 'F9') },
  { id: 'navFarm', category: 'navigation', scope: 'global', label: '前往农场', description: '返回主生产页', defaultBinding: binding('KeyF', 'F') },
  { id: 'navInventory', category: 'navigation', scope: 'global', label: '打开背包', description: '查看物品与装备', defaultBinding: binding('KeyI', 'I') },
  { id: 'navQuest', category: 'navigation', scope: 'global', label: '打开任务板', description: '查看任务和委托', defaultBinding: binding('KeyJ', 'J') },
  { id: 'navRegionMap', category: 'navigation', scope: 'global', label: '打开行旅图', description: '查看行旅路线', defaultBinding: binding('KeyM', 'M') },
  { id: 'navCharInfo', category: 'navigation', scope: 'global', label: '打开角色', description: '查看角色属性', defaultBinding: binding('KeyC', 'C') },
  { id: 'navSkills', category: 'navigation', scope: 'global', label: '打开技能', description: '查看技能和精研', defaultBinding: binding('KeyK', 'K') },
  { id: 'navPotential', category: 'navigation', scope: 'global', label: '打开潜能', description: '查看潜能节点', defaultBinding: binding('KeyP', 'P') },
  { id: 'navGoals', category: 'navigation', scope: 'global', label: '打开目标', description: '查看今日与长期目标', defaultBinding: binding('KeyG', 'G') },
  { id: 'navAnimal', category: 'navigation', scope: 'global', label: '打开牧场', description: '查看动物与畜养', defaultBinding: binding('KeyN', 'N') },
  { id: 'navHome', category: 'navigation', scope: 'global', label: '打开设施', description: '查看家园设施与房间', defaultBinding: binding('KeyH', 'H') },
  { id: 'navBreeding', category: 'navigation', scope: 'global', label: '打开育种', description: '查看育种台与图鉴', defaultBinding: binding('KeyB', 'B') },
  { id: 'navShop', category: 'navigation', scope: 'global', label: '打开商圈', description: '查看商店与经济板', defaultBinding: binding('KeyR', 'R') },
  { id: 'navWorkshop', category: 'navigation', scope: 'global', label: '打开工坊', description: '查看加工与制作', defaultBinding: binding('KeyT', 'T') },
  { id: 'navUpgrade', category: 'navigation', scope: 'global', label: '打开升级', description: '查看铁匠、工具和升级', defaultBinding: binding('KeyU', 'U') },
  { id: 'navFishPond', category: 'navigation', scope: 'global', label: '打开鱼塘', description: '查看鱼塘和繁殖', defaultBinding: binding('KeyY', 'Y') },
  { id: 'navQuarry', category: 'navigation', scope: 'global', label: '打开采石场', description: '查看旧采石场', defaultBinding: binding('KeyQ', 'Q') },
  { id: 'navCottage', category: 'navigation', scope: 'global', label: '打开小屋', description: '查看居家日程与旅居', defaultBinding: null },
  { id: 'navDecoration', category: 'navigation', scope: 'global', label: '打开装饰', description: '查看家具与装饰', defaultBinding: null },
  { id: 'navForage', category: 'navigation', scope: 'global', label: '打开竹林', description: '查看采集与山野资源', defaultBinding: null },
  { id: 'navFishing', category: 'navigation', scope: 'global', label: '打开清溪', description: '查看钓鱼与水域', defaultBinding: null },
  { id: 'navMining', category: 'navigation', scope: 'global', label: '打开矿洞', description: '查看矿洞和耐战情况', defaultBinding: null },
  { id: 'navCooking', category: 'navigation', scope: 'global', label: '打开灶台', description: '查看烹饪与料理', defaultBinding: null },
  { id: 'navWallet', category: 'navigation', scope: 'global', label: '打开钱包', description: '查看票券、研究券与库存', defaultBinding: null },
  { id: 'navMail', category: 'navigation', scope: 'global', label: '打开邮箱', description: '查看书信与纪念册', defaultBinding: null },
  { id: 'navAchievement', category: 'navigation', scope: 'global', label: '打开收藏与资料', description: '查看成就、大奖章与祠堂', defaultBinding: null },
  { id: 'navGlossary', category: 'navigation', scope: 'global', label: '打开百科', description: '直接查询机制与资料', defaultBinding: null },
  { id: 'navMuseum', category: 'navigation', scope: 'global', label: '打开博物馆', description: '查看捐赠与展陈', defaultBinding: null },
  { id: 'navGuild', category: 'navigation', scope: 'global', label: '打开公会', description: '查看公会目标、捐献和商店', defaultBinding: null },
  { id: 'navHanhai', category: 'navigation', scope: 'global', label: '打开瀚海', description: '查看文物、店铺和赌场', defaultBinding: null },
  { id: 'toolVoidChest', category: 'tool', scope: 'global', label: '打开虚空箱', description: '远程查看虚空箱', defaultBinding: binding('KeyV', 'V') },
  { id: 'uiPrevSection', category: 'ui', scope: 'context', label: '上一分组/标签', description: '切换到当前界面的上一分组或标签', defaultBinding: binding('BracketLeft', '[') },
  { id: 'uiNextSection', category: 'ui', scope: 'context', label: '下一分组/标签', description: '切换到当前界面的下一分组或标签', defaultBinding: binding('BracketRight', ']') },
  { id: 'uiConfirm', category: 'ui', scope: 'context', label: '确认/主动作', description: '执行当前界面的主操作', defaultBinding: binding('Enter', 'Enter') },
  { id: 'uiCancel', category: 'uiInteraction', scope: 'modal', label: '取消/关闭', description: '关闭最上层弹窗或取消录入', defaultBinding: binding('Escape', 'Escape') },
  { id: 'uiFocusPrimary', category: 'uiInteraction', scope: 'modal', label: '聚焦主按钮', description: '聚焦当前弹窗或面板的主按钮', defaultBinding: null },
  { id: 'systemSleepPrompt', category: 'system', scope: 'global', label: '打开睡觉确认', description: '仅打开睡觉确认弹窗', defaultBinding: binding('F8', 'F8') },
  { id: 'uiFocusSearch', category: 'ui', scope: 'context', label: '聚焦搜索', description: '聚焦到当前界面的搜索框', defaultBinding: binding('Slash', '/') },
  { id: 'uiPageUp', category: 'ui', scope: 'context', label: '向上翻页', description: '当前页面或列表向上翻一屏', defaultBinding: binding('PageUp', 'PageUp') },
  { id: 'uiPageDown', category: 'ui', scope: 'context', label: '向下翻页', description: '当前页面或列表向下翻一屏', defaultBinding: binding('PageDown', 'PageDown') },
  { id: 'uiQtyDecrease', category: 'uiInteraction', scope: 'modal', label: '数量减少', description: '在数量选择弹窗中减少数量', defaultBinding: null },
  { id: 'uiQtyIncrease', category: 'uiInteraction', scope: 'modal', label: '数量增加', description: '在数量选择弹窗中增加数量', defaultBinding: null },
  { id: 'miningAttack', category: 'miningCombat', scope: 'miningCombat', label: '攻击', description: '矿洞战斗中攻击怪物', defaultBinding: binding('Digit1', '1') },
  { id: 'miningDefend', category: 'miningCombat', scope: 'miningCombat', label: '防御', description: '矿洞战斗中举盾防御', defaultBinding: binding('Digit2', '2') },
  { id: 'miningFlee', category: 'miningCombat', scope: 'miningCombat', label: '逃跑', description: '普通战斗中撤离', defaultBinding: binding('Digit3', '3') },
  { id: 'miningItems', category: 'miningCombat', scope: 'miningCombat', label: '使用战斗道具', description: '打开可用战斗道具列表', defaultBinding: binding('Digit4', '4') },
  { id: 'miningPresets', category: 'miningCombat', scope: 'miningCombat', label: '切换装备方案', description: '打开装备方案列表', defaultBinding: binding('Digit5', '5') },
  { id: 'miningDescend', category: 'miningCombat', scope: 'miningCombat', label: '下一层', description: '矿洞中前往下一层', defaultBinding: binding('KeyE', 'E') },
  { id: 'moveUp', category: 'movement', scope: 'movement', label: '向上移动', description: '矿洞或行旅图中向上移动', defaultBinding: binding('ArrowUp', '\u2191') },
  { id: 'moveDown', category: 'movement', scope: 'movement', label: '向下移动', description: '矿洞或行旅图中向下移动', defaultBinding: binding('ArrowDown', '\u2193') },
  { id: 'moveLeft', category: 'movement', scope: 'movement', label: '向左移动', description: '矿洞或行旅图中向左移动', defaultBinding: binding('ArrowLeft', '\u2190') },
  { id: 'moveRight', category: 'movement', scope: 'movement', label: '向右移动', description: '矿洞或行旅图中向右移动', defaultBinding: binding('ArrowRight', '\u2192') }
]

export const KEYBOARD_SHORTCUT_DEFINITION_BY_ID = Object.fromEntries(
  KEYBOARD_SHORTCUT_DEFINITIONS.map(definition => [definition.id, definition])
) as Record<KeyboardShortcutActionId, KeyboardShortcutDefinition>

const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'])
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta'])
const RESERVED_PLAIN_CODES = new Set(['F5', 'F11', 'F12', 'Tab', 'Backspace', 'Delete'])
const RESERVED_CTRL_CODES = new Set(['KeyR', 'KeyL', 'KeyW', 'KeyT', 'KeyN', 'KeyP', 'KeyS', 'Digit0', 'Minus', 'Equal'])

export const createDefaultKeyboardShortcutBindings = (): KeyboardShortcutBindingMap => {
  const result = {} as KeyboardShortcutBindingMap
  for (const definition of KEYBOARD_SHORTCUT_DEFINITIONS) {
    result[definition.id] = definition.defaultBinding ? { ...definition.defaultBinding } : null
  }
  return result
}

export const getKeyboardShortcutBindingKey = (bindingValue: KeyboardShortcutBinding): string => [
  bindingValue.ctrlKey ? 'Ctrl' : '',
  bindingValue.altKey ? 'Alt' : '',
  bindingValue.shiftKey ? 'Shift' : '',
  bindingValue.metaKey ? 'Meta' : '',
  bindingValue.code
].filter(Boolean).join('+')

export const areKeyboardShortcutBindingsEqual = (left: KeyboardShortcutBinding | null | undefined, right: KeyboardShortcutBinding | null | undefined) => {
  if (!left || !right) return !left && !right
  return getKeyboardShortcutBindingKey(left) === getKeyboardShortcutBindingKey(right)
}

const getCodeDisplayKey = (code: string) => {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit\d$/.test(code)) return code.slice(5)
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`
  if (code === 'ArrowUp') return '\u2191'
  if (code === 'ArrowDown') return '\u2193'
  if (code === 'ArrowLeft') return '\u2190'
  if (code === 'ArrowRight') return '\u2192'
  return code
}

export const normalizeKeyboardShortcutDisplayKey = (key: string | undefined, code: string) => {
  if (!key || key === 'Unidentified') return getCodeDisplayKey(code)
  if (code.startsWith('Arrow')) return getCodeDisplayKey(code)
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  return key
}

export const normalizeKeyboardShortcutBinding = (value: unknown): KeyboardShortcutBinding | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<KeyboardShortcutBinding>
  if (typeof raw.code !== 'string' || !raw.code.trim() || MODIFIER_CODES.has(raw.code)) return null
  const code = raw.code.trim()
  return {
    code,
    key: normalizeKeyboardShortcutDisplayKey(typeof raw.key === 'string' ? raw.key : undefined, code),
    ctrlKey: raw.ctrlKey === true,
    altKey: raw.altKey === true,
    shiftKey: raw.shiftKey === true,
    metaKey: raw.metaKey === true
  }
}

export const normalizeKeyboardShortcutBindings = (value: unknown): KeyboardShortcutBindingMap => {
  const result = createDefaultKeyboardShortcutBindings()
  if (!value || typeof value !== 'object') return result

  const rawMap = value as Partial<Record<KeyboardShortcutActionId, unknown>>
  for (const definition of KEYBOARD_SHORTCUT_DEFINITIONS) {
    if (!Object.prototype.hasOwnProperty.call(rawMap, definition.id)) continue
    const rawBinding = rawMap[definition.id]
    if (rawBinding === null) {
      result[definition.id] = null
      continue
    }
    const normalized = normalizeKeyboardShortcutBinding(rawBinding)
    if (normalized) result[definition.id] = normalized
  }
  return result
}

export const getKeyboardEventBinding = (event: KeyboardEvent): KeyboardShortcutBinding | null => {
  if (event.isComposing || !event.code || MODIFIER_CODES.has(event.code) || MODIFIER_KEYS.has(event.key)) return null
  return {
    code: event.code,
    key: normalizeKeyboardShortcutDisplayKey(event.key, event.code),
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey
  }
}

export const isReservedKeyboardShortcutBinding = (bindingValue: KeyboardShortcutBinding): boolean => {
  if (bindingValue.metaKey) return true
  if (bindingValue.altKey && bindingValue.code === 'F4') return true
  if (!bindingValue.ctrlKey && !bindingValue.altKey && !bindingValue.shiftKey && RESERVED_PLAIN_CODES.has(bindingValue.code)) return true
  if (bindingValue.ctrlKey && RESERVED_CTRL_CODES.has(bindingValue.code)) return true
  if (bindingValue.altKey && (bindingValue.code === 'ArrowLeft' || bindingValue.code === 'ArrowRight')) return true
  return false
}

export const formatKeyboardShortcutBinding = (bindingValue: KeyboardShortcutBinding | null | undefined): string => {
  if (!bindingValue) return '未绑定'
  return [
    bindingValue.ctrlKey ? 'Ctrl' : '',
    bindingValue.altKey ? 'Alt' : '',
    bindingValue.shiftKey ? 'Shift' : '',
    bindingValue.metaKey ? 'Meta' : '',
    bindingValue.key || getCodeDisplayKey(bindingValue.code)
  ].filter(Boolean).join(' + ')
}
