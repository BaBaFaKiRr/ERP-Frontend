import { getProformaCompany } from '@/lib/proforma-company'
import { inrRupeesToWords } from '@/lib/inr-words'

const GST_RATE = 0.18
const GST_PCT = '18.0%'

export type ProformaLine = {
  sku: string
  name: string
  hsn: string | null
  uom: string | null
  quantity: number
  unit_price: number | null
  line_total: number | null
}

type Props = {
  /** Shown as "Quo No." — equals sales order number */
  salesOrderNumber: string
  /** PI date (typically today when generating) */
  documentDate: Date
  /** Default: document date + 15 days */
  validUntil: Date
  customerName: string
  billingAddress: string | null
  gstNumber: string | null
  phone: string | null
  lines: ProformaLine[]
}

function formatPiDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ProformaInvoiceDocument({
  salesOrderNumber,
  documentDate,
  validUntil,
  customerName,
  billingAddress,
  gstNumber,
  phone,
  lines,
}: Props) {
  const company = getProformaCompany()

  const subtotal = lines.reduce((s, l) => s + (Number(l.line_total) || 0), 0)
  const igstTotal = Math.round(subtotal * GST_RATE * 100) / 100
  const grandTotal = Math.round((subtotal + igstTotal) * 100) / 100
  const roundedTotal = Math.round(grandTotal)

  const hsnBreakup = new Map<string, number>()
  for (const l of lines) {
    const key = l.hsn?.trim() || '—'
    hsnBreakup.set(key, (hsnBreakup.get(key) ?? 0) + (Number(l.line_total) || 0))
  }

  const totalQty = lines.reduce((s, l) => s + Number(l.quantity || 0), 0)
  const uoms = new Set(lines.map((l) => (l.uom?.trim() ? l.uom.trim() : 'Pcs.')))
  const uniqueUom = uoms.size === 1 ? [...uoms][0] : null

  return (
    <div className="proforma-doc text-black bg-white text-[11px] leading-snug w-full px-3 pt-5 pb-10 font-sans box-border">
      <div className="text-center border-b border-black pb-2 mb-3">
        <h1 className="text-sm font-bold tracking-wide">PROFORMA INVOICE</h1>
        <p className="font-bold text-[13px] mt-1">{company.legalName}</p>
        {company.addressLines.map((line, i) => (
          <p key={i} className="text-[10px]">
            {line}
          </p>
        ))}
        <p className="text-[10px] mt-0.5">{company.panCinLine}</p>
        <p className="text-[10px]">{company.telEmailLine}</p>
      </div>

      <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-0 sm:divide-x sm:divide-black text-left border border-black">
        <div className="px-2 py-2 sm:pr-4">
          <p className="font-semibold text-[10px] mb-1">Party Details:</p>
          <p className="font-medium">{customerName}</p>
          {billingAddress && (
            <p className="whitespace-pre-wrap text-[10px] mt-0.5">{billingAddress}</p>
          )}
          <div className="mt-1 text-[10px] space-y-0.5">
            {gstNumber && <p>GSTIN: {gstNumber}</p>}
            {phone && <p>Mobile No.: {phone}</p>}
          </div>
        </div>
        <div className="px-2 py-2 sm:pl-4 border-t border-black sm:border-t-0 space-y-1.5 text-[10px]">
          <p>
            <span className="font-semibold">Quo No.: </span>
            <span className="font-mono">{salesOrderNumber}</span>
          </p>
          <p>
            <span className="font-semibold">Date: </span>
            {formatPiDate(documentDate)}
          </p>
          <p>
            <span className="font-semibold">Valid Till: </span>
            {formatPiDate(validUntil)}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[9px] mb-2">
        <thead>
          <tr className="bg-white">
            <th className="border border-black px-0.5 py-1 text-left font-semibold">Item Code</th>
            <th className="border border-black px-0.5 py-1 text-left font-semibold">Item Name</th>
            <th className="border border-black px-0.5 py-1 font-semibold">HSN Code</th>
            <th className="border border-black px-0.5 py-1 font-semibold">GST Rate</th>
            <th className="border border-black px-0.5 py-1 text-right font-semibold">Qty</th>
            <th className="border border-black px-0.5 py-1 text-left font-semibold">Unit</th>
            <th className="border border-black px-0.5 py-1 text-right font-semibold">Price</th>
            <th className="border border-black px-0.5 py-1 text-right font-semibold">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx}>
              <td className="border border-black px-0.5 py-0.5 font-mono align-top">{line.sku}</td>
              <td className="border border-black px-0.5 py-0.5 align-top">{line.name}</td>
              <td className="border border-black px-0.5 py-0.5 font-mono align-top text-center">
                {line.hsn ?? '—'}
              </td>
              <td className="border border-black px-0.5 py-0.5 text-center align-top">{GST_PCT}</td>
              <td className="border border-black px-0.5 py-0.5 text-right align-top tabular-nums">
                {Number(line.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
              <td className="border border-black px-0.5 py-0.5 align-top capitalize">
                {line.uom ?? 'Pcs.'}
              </td>
              <td className="border border-black px-0.5 py-0.5 text-right align-top tabular-nums">
                ₹{Number(line.unit_price ?? 0).toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-0.5 text-right align-top tabular-nums font-medium">
                ₹{Number(line.line_total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[10px] mb-2">
        <p>
          <span className="font-semibold">Total Quantity: </span>
          {totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          {uniqueUom != null ? ` ${uniqueUom}` : ''}
          {uniqueUom == null && lines.length > 0 && (
            <span className="text-gray-600"> (units vary per line)</span>
          )}
        </p>
      </div>

      <div className="text-[10px] space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Total:</span>
          <span className="tabular-nums font-medium">
            ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>IGST @ {GST_PCT}:</span>
          <span className="tabular-nums">₹ {igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 font-semibold">
          <span>Grand Total:</span>
          <span className="tabular-nums">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="border border-black mb-3 w-full max-w-[50%]">
        <p className="font-semibold text-[10px] px-1 py-0.5 bg-white border-b border-black">GST Breakup:</p>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="bg-white">
              <th className="border border-gray-300 px-1 py-0.5 text-left">HSN/SAC</th>
              <th className="border border-gray-300 px-1 py-0.5 text-right">Taxable Amount</th>
              <th className="border border-gray-300 px-1 py-0.5 text-right">IGST</th>
            </tr>
          </thead>
          <tbody>
            {[...hsnBreakup.entries()].map(([hsn, taxable]) => {
              const ig = Math.round(taxable * GST_RATE * 100) / 100
              return (
                <tr key={hsn}>
                  <td className="border border-gray-300 px-1 py-0.5 font-mono">{hsn}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right tabular-nums">
                    ₹ {taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({GST_PCT})
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right tabular-nums">
                    ₹ {ig.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Rounded Total:</span>
          <span className="tabular-nums font-semibold">
            ₹ {roundedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[9px] leading-tight pt-1">{inrRupeesToWords(roundedTotal)}</p>
      </div>

      <div className="text-[9px] border-t border-gray-400 pt-2 space-y-1">
        <p className="font-semibold">Bank Details:</p>
        {company.bankLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <div className="pt-4 text-right">
          <p className="font-medium">For {company.legalName}</p>
          <div className="h-14 print:h-16" aria-hidden />
          <p className="text-[9px] text-black">Authorized Signatory</p>
        </div>
      </div>
    </div>
  )
}
