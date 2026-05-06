const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  return TENS[t] + (u ? ' ' + ONES[u] : '')
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n)
  const h = Math.floor(n / 100)
  const r = n % 100
  return ONES[h] + ' Hundred' + (r ? ' ' + belowHundred(r) : '')
}

/** Indian numbering: Crore → Lakh → Thousand → rest (for amounts in rupees, integer). */
export function inrRupeesToWords(amount: number): string {
  let n = Math.round(Math.abs(amount))
  if (n === 0) return 'Zero'

  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000

  if (crore) parts.push(belowThousand(crore) + ' Crore')
  if (lakh) parts.push(belowThousand(lakh) + ' Lakh')
  if (thousand) parts.push(belowThousand(thousand) + ' Thousand')
  if (n) parts.push(belowThousand(n))

  return 'INR ' + parts.join(' ') + ' only.'
}
