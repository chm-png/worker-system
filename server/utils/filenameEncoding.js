/**
 * 浏览器 multipart 里中文文件名常见两种问题：
 * 1) UTF-8 字节被按 Latin-1 逐字节读成字符串（典型 mojibake）
 * 2) 老环境按 GBK 编码
 */
const iconv = require('iconv-lite')

function hasCJK(str) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(str)
}

/**
 * 将「UTF-8 字节被误当成 Latin-1」得到的乱码串还原为正确 UTF-8 字符串
 */
function recoverUtf8FromLatin1Mojibake(str) {
  if (!str || typeof str !== 'string') return ''
  try {
    const buf = Buffer.from(str, 'latin1')
    const out = buf.toString('utf8')
    if (out.includes('\ufffd')) return ''
    return out
  } catch {
    return ''
  }
}

/**
 * 尝试从 GBK 字节理解字符串（部分 Windows 客户端）
 */
function tryGbk(str) {
  try {
    const buf = Buffer.from(str, 'latin1')
    return iconv.decode(buf, 'gbk')
  } catch {
    return ''
  }
}

/**
 * 统一解码上传/提交的原始文件名，供 API 返回与入库使用
 */
function decodeOriginalFilename(raw) {
  if (raw == null) return ''
  let s = String(raw).trim()
  if (!s) return ''

  // 已是正常 Unicode（含中文），直接采用
  if (hasCJK(s)) {
    return s
  }

  // 1) 最常见：UTF-8 → 误读为 Latin-1
  const recovered = recoverUtf8FromLatin1Mojibake(s)
  if (recovered && hasCJK(recovered)) {
    return recovered
  }

  // 2) GBK
  const gbk = tryGbk(s)
  if (gbk && hasCJK(gbk) && !/Ã|Â/.test(gbk)) {
    return gbk.trim()
  }

  // 3) 若恢复后无中文但变短且无替换符，仍可能修正了纯英文乱码
  if (recovered && recovered.length && !recovered.includes('\ufffd')) {
    return recovered
  }

  return s
}

module.exports = {
  decodeOriginalFilename,
  hasCJK
}
