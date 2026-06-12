import Tesseract from 'tesseract.js'

export async function scanReceipt(imageDataUrl, onProgress) {
  const result = await Tesseract.recognize(imageDataUrl, 'rus+eng', {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100))
      }
    },
  })
  const text = result.data.text
  return extractKZTAmount(text)
}

function extractKZTAmount(rawText) {
  const text = rawText.replace(/\n/g, ' ')

  // Priority patterns: labelled amount lines (Kaspi, Halyk, Forte, Jusan, etc.)
  const labeledPatterns = [
    /(?:сумма|amount|итого|total|перевод|оплата|зачислено|списано)[\w\s]*?:?\s*([\d][\d\s]{1,9}(?:[,.]\d{1,2})?)\s*(?:[₸тТ]|тг|tg|kzt)?/gi,
  ]
  for (const re of labeledPatterns) {
    const matches = [...text.matchAll(re)]
    for (const m of matches) {
      const amount = parseKZT(m[1])
      if (amount >= 100 && amount <= 9_999_999) return { amount, found: true }
    }
  }

  // Secondary: any number right before ₸ sign
  const tgPattern = /([\d][\d\s]{1,9}(?:[,.]\d{1,2})?)\s*[₸]/g
  const tgMatches = [...text.matchAll(tgPattern)]
    .map(m => parseKZT(m[1]))
    .filter(n => n >= 100 && n <= 9_999_999)
    .sort((a, b) => a - b) // pick smallest (likely the transfer, not balance)
  if (tgMatches.length > 0) return { amount: tgMatches[0], found: true }

  // Fallback: collect all 3-7 digit numbers, take smallest > 100 (likely payment, not balance)
  const nums = [...text.matchAll(/\b(\d[\d\s]{2,8})\b/g)]
    .map(m => parseKZT(m[1]))
    .filter(n => n >= 100 && n <= 9_999_999)
    .sort((a, b) => a - b)
  if (nums.length > 0) return { amount: nums[0], found: true }

  return { amount: null, found: false }
}

function parseKZT(str) {
  // Remove spaces, strip trailing decimal part (KZT is integer)
  const cleaned = str.replace(/\s/g, '').replace(/[,.']\d{1,2}$/, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}
