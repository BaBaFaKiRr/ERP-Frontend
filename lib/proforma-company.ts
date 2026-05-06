/**
 * Seller block on proforma invoice. Override with NEXT_PUBLIC_PI_* env vars.
 * Defaults are neutral placeholders and should be configured per deployment.
 */
export function getProformaCompany(): {
  legalName: string
  addressLines: string[]
  panCinLine: string
  telEmailLine: string
  bankLines: string[]
} {
  const name =
    process.env.NEXT_PUBLIC_PI_COMPANY_NAME ?? 'YOUR COMPANY NAME'
  const addr =
    process.env.NEXT_PUBLIC_PI_COMPANY_ADDRESS ??
    'COMPANY ADDRESS LINE 1|COMPANY ADDRESS LINE 2'
  const panCin =
    process.env.NEXT_PUBLIC_PI_PAN_CIN ??
    'PAN: ________, CIN: ________'
  const tel =
    process.env.NEXT_PUBLIC_PI_TEL_EMAIL ??
    'Tel.: ________, Email: ________'
  const bank =
    process.env.NEXT_PUBLIC_PI_BANK ??
    'Bank Name, Branch|A/C No: ________, IFSC: ________'
  return {
    legalName: name,
    addressLines: addr.split('|').map((s) => s.trim()),
    panCinLine: panCin,
    telEmailLine: tel,
    bankLines: bank.split('|').map((s) => s.trim()),
  }
}
