export type PageContext = {
  pathname: string
  entityType?: string
  entityId?: string
  documentNumber?: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteRule = {
  pattern: RegExp
  entityType: string
  idGroup?: number
}

const RULES: RouteRule[] = [
  { pattern: /^\/dashboard\/manufacturing\/work-orders\/([^/]+)$/, entityType: 'work_order', idGroup: 1 },
  { pattern: /^\/dashboard\/purchase\/orders\/([^/]+)$/, entityType: 'purchase_order', idGroup: 1 },
  { pattern: /^\/dashboard\/purchase\/receipts\/([^/]+)$/, entityType: 'purchase_receipt', idGroup: 1 },
  { pattern: /^\/dashboard\/finance\/sales-invoices\/([^/]+)$/, entityType: 'sales_invoice', idGroup: 1 },
  { pattern: /^\/dashboard\/sales\/customers\/([^/]+)$/, entityType: 'customer', idGroup: 1 },
  { pattern: /^\/dashboard\/purchase\/suppliers\/([^/]+)$/, entityType: 'supplier', idGroup: 1 },
]

const SALES_RESERVED = new Set(['orders', 'customers', 'create'])

export function resolvePageContext(pathname: string): PageContext {
  const ctx: PageContext = { pathname }

  const salesDetail = pathname.match(/^\/dashboard\/sales\/([^/]+)$/)
  if (salesDetail && !SALES_RESERVED.has(salesDetail[1])) {
    ctx.entityType = 'sales_order'
    const segment = salesDetail[1]
    if (UUID_RE.test(segment)) ctx.entityId = segment
    else ctx.documentNumber = segment
    return ctx
  }

  for (const rule of RULES) {
    const m = pathname.match(rule.pattern)
    if (!m) continue
    ctx.entityType = rule.entityType
    const segment = m[rule.idGroup ?? 1]
    if (UUID_RE.test(segment)) {
      ctx.entityId = segment
    } else {
      ctx.documentNumber = segment
    }
    break
  }

  return ctx
}

export function getSuggestedPrompts(page: PageContext): string[] {
  const base = [
    'Give me a dashboard summary of pending work',
    'What material shortages should I know about?',
    'List sales orders pending approval',
  ]

  if (page.entityType === 'sales_order') {
    return [
      'Explain this sales order status and next steps',
      'Show related work orders for this order',
      'What is blocking completion of this order?',
    ]
  }
  if (page.entityType === 'work_order') {
    return [
      'Why is this work order still in manufacturing?',
      'Summarize production progress on this WO',
      'What materials does this work order need?',
    ]
  }
  if (page.entityType === 'purchase_order') {
    return [
      'Summarize this purchase order and receipt status',
      'Are there shortages related to items on this PO?',
    ]
  }
  if (pathnameIncludes(page.pathname, '/dashboard/finance')) {
    return [
      'Summarize overdue receivables and payables',
      'What payment reminders are due?',
      ...base.slice(0, 2),
    ]
  }
  if (pathnameIncludes(page.pathname, '/dashboard/inventory')) {
    return [
      'Show items below reorder level',
      'What are the top material shortages?',
      ...base.slice(0, 2),
    ]
  }

  return base
}

function pathnameIncludes(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
