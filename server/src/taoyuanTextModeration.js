const DEFAULT_BANNED_TERMS = Object.freeze([
  '傻逼',
  '煞笔',
  '妈的',
  '操你',
  '去死',
  '死全家',
  '法轮功',
  '台独',
  '港独',
  '藏独',
  '恐怖袭击',
  '炸弹制作',
  '枪支代购',
  '黄色网站',
  '约炮',
  '卖淫',
  '嫖娼',
  '赌博网站',
  '洗钱',
  '毒品交易',
  '冰毒',
  '海洛因',
]);

const DEFAULT_SOFT_BLOCK_TERMS = Object.freeze([
  '加微信',
  'vx',
  'vx:',
  'qq群',
  'q群',
  '代练',
  '刷金',
  '外挂',
  '开挂',
  '脚本',
  '黑产',
  '私服',
]);

function sanitizeText(value, maxLength = 2000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeForMatch(value) {
  return sanitizeText(value, 4000)
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '');
}

function countLineBreaks(value) {
  return (String(value || '').match(/\n/g) || []).length;
}

function buildViolationResult(reason, hitTerm, options = {}) {
  const error = new Error(reason);
  error.status = Number(options.status) || 400;
  error.code = options.code || 'TEXT_MODERATION_REJECTED';
  error.moderation = {
    ok: false,
    hit_term: hitTerm || '',
    code: error.code,
    field: options.field || '',
    scene: options.scene || '',
  };
  throw error;
}

function checkCommonShape(text, options = {}) {
  const maxLength = Number(options.maxLength) || 0;
  const minLength = Number(options.minLength) || 0;
  const maxLineBreaks = Number(options.maxLineBreaks) || 0;
  const label = options.label || '文本';

  if (minLength > 0 && Array.from(text).length < minLength) {
    buildViolationResult(`${label}至少需要 ${minLength} 个字`, '', {
      code: 'TEXT_TOO_SHORT',
      field: options.field,
      scene: options.scene,
    });
  }
  if (maxLength > 0 && Array.from(text).length > maxLength) {
    buildViolationResult(`${label}最多支持 ${maxLength} 个字`, '', {
      code: 'TEXT_TOO_LONG',
      field: options.field,
      scene: options.scene,
    });
  }
  if (maxLineBreaks > 0 && countLineBreaks(text) > maxLineBreaks) {
    buildViolationResult(`${label}换行过多，请精简后再提交`, '', {
      code: 'TEXT_TOO_MANY_LINES',
      field: options.field,
      scene: options.scene,
    });
  }
}

function checkTerms(text, options = {}) {
  const normalized = normalizeForMatch(text);
  for (const term of DEFAULT_BANNED_TERMS) {
    const candidate = normalizeForMatch(term);
    if (candidate && normalized.includes(candidate)) {
      buildViolationResult(`${options.label || '文本'}包含不允许发布的内容`, term, {
        code: 'TEXT_BANNED_TERM',
        field: options.field,
        scene: options.scene,
      });
    }
  }
  for (const term of DEFAULT_SOFT_BLOCK_TERMS) {
    const candidate = normalizeForMatch(term);
    if (candidate && normalized.includes(candidate)) {
      buildViolationResult(`${options.label || '文本'}包含疑似广告或外挂引流内容`, term, {
        code: 'TEXT_SUSPICIOUS_PROMOTION',
        field: options.field,
        scene: options.scene,
      });
    }
  }
}

function moderateText(rawValue, options = {}) {
  const text = sanitizeText(rawValue, Number(options.storageMaxLength) || Number(options.maxLength) || 2000);
  checkCommonShape(text, options);
  if (text) checkTerms(text, options);
  return text;
}

function moderateCompositeText(fields = [], scene = '') {
  for (const field of fields) {
    moderateText(field?.value, {
      ...field,
      scene: field?.scene || scene,
    });
  }
}

module.exports = {
  moderateText,
  moderateCompositeText,
};
