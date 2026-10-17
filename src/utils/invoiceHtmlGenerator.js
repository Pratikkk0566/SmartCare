/**
 * Generates self-contained, fully-styled, XHTML-compliant XML/HTML for an Invoice.
 * Preserves the exact user DOM structure, CSS styling, and client-side rendering/mapping functions.
 * Strictly compliant with Java Flying Saucer / OpenHTMLtoPDF (XHTML 1.0 Transitional) to prevent SAXParse 500 errors.
 *
 * LAYOUT NOTE:
 * Flying Saucer / OpenHTMLtoPDF does NOT reliably support CSS flexbox (display:flex,
 * justify-content, align-items, flex-direction:column, etc). Depending on content length
 * it computes flex sizing inconsistently, which is what causes text to visibly "jump"
 * or shift position between renders/records. All layout in this template now uses only
 * `display:table` / `table-row` / `table-cell` and normal block/inline flow, which Flying
 * Saucer supports deterministically. The page is also fixed to literal A4 dimensions
 * (210mm) rather than a fluid/responsive container, so on-screen preview and the PDF
 * output are pixel-identical instead of two different layouts that happen to diverge.
 *
 * ALIGNMENT NOTE:
 * Flying Saucer ignores `box-sizing: border-box`, so `width:100%` + horizontal padding
 * overflows the page on the right. Horizontal padding is therefore applied to table
 * CELLS (banner, status row) and blocks with padding do NOT set width:100%.
 */

const NOISE_FIELDS = new Set([
  'invoice_id', 'patientid', 'thirdPartyId', 'admission_id', 'opd_appointment_id',
  'opdtoken_id', 'dep_wise_letterhead', 'location_Wise_Invoice_no', 'razorPayAccountId',
  '_invoice_modified', 'website', 'reciept_sequence', 'imagePath', 'qrCodePath',
  'paymentUpId', 'emailTo', 'invRequestedDate', 'payment_id', 'initial', 'firstName',
  'middleName', 'lastName', 'invoiceDate', 'invoice_type_id', 'invoice_suffix',
  'patientType', 'campName', 'creditBalance', 'inWords', 'clinicName', 'clinicAddress',
  'phoneNo', 'totalChargeDiscount', 'tptalChargeAmount', 'conditionId',
  'dischargeStatusId', 'billSettled', 'paymentSettled', 'packagefromDate',
  'packageToDate', 'packageName', 'payment_note', 'refund', 'obj', '_raw', '_isoDate'
]);

const ALREADY_RENDERED_FIELDS = new Set([
  'invoice_sequence_number', 'invoice_amount', 'balance_amount', 'discount_amount',
  'discount_percent', 'paid_amount', 'payee_of_invoice', 'invoice_type',
  'invoice_date_time', 'counsultant', 'counsultant_qualification', 'refral_name',
  'invoice_prepared_by', 'invoice_note', 'payment_mode', 'patient_name', 'uhid',
  'contact_number', 'address', 'gender', 'payment_log', 'chargeTransaction',
  'transaction', 'admissiondate', 'dischargedate', 'finalDiagnosis',
  'dischargeStatusName', 'dischargeStatusDescription', 'doctor', 'patientName', 'age'
]);

const CLINICAL_FIELDS = ['admissiondate', 'dischargedate', 'finalDiagnosis', 'dischargeStatusName'];

export function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDateTime(raw) {
  if (!raw) return '-';
  const [datePart, timePart] = String(raw).trim().split(' ');
  if (!timePart) return escapeXml(datePart);
  const hhmm = timePart.split(':').slice(0, 2).join(':');
  return escapeXml(`${datePart}, ${hhmm}`);
}

export function cleanText(raw) {
  return (raw ?? '')
    .toString()
    .replace(/\r\n|\r|\n/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deriveCityState(address) {
  if (!address) return { city: '', state: '' };
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  while (parts.length && /^\d{4,6}$/.test(parts[parts.length - 1])) parts.pop();
  const state = parts.length ? parts[parts.length - 1] : '';
  const city = parts.length > 1 ? parts[parts.length - 2] : '';
  return { city: escapeXml(cleanText(city)), state: escapeXml(cleanText(state)) };
}

export function currency(n) {
  const num = Number(n ?? 0);
  return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toLabel(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isMeaningful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return false;
  const s = String(value).trim();
  if (s === '') return false;
  if (s === '0') return false;
  if (s === '-') return false;
  if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return false;
  if (typeof value === 'number' && value === 0) return false;
  return true;
}

export function mapInvoiceRecord(rec) {
  if (!rec) return null;

  const consultant = cleanText(rec.counsultant);

  const subtotal = Number(rec.invoice_amount ?? 0);
  const discount = Number(rec.discount_amount ?? 0);
  const balance = Number(rec.balance_amount ?? 0);
  const paid = Number(rec.paid_amount ?? 0);
  const total = subtotal - discount;

  const charges = (rec.chargeTransaction || []).map(group => ({
    group: cleanText(group.master_charge_name),
    amount: group.total_amount,
    items: (group.charge_list || []).map(item => ({
      description: cleanText(item.chargename),
      code: item.code != null && item.code !== '' ? cleanText(item.code) : '-',
      qty: item.quantity,
      rate: item.charge_amount,
      amount: item.total_charge_amount
    }))
  }));

  const paymentHistory = (rec.payment_log || []).map(p => ({
    date: formatDateTime(p.payment_time),
    mode: cleanText(p.payment_mode),
    amount: p.part_payment_amount
  }));

  const noteText = cleanText((rec.invoice_note || '').replace(/<[^>]*>/g, ' '));
  const notes = noteText ? [{ text: noteText }] : [];
  const hospitalName = cleanText(rec.invoice_prepared_by);
  const { city, state } = deriveCityState(rec.address);

  // Extract clinical fields for React Native UI
  const clinical = CLINICAL_FIELDS
    .filter(key => isMeaningful(rec[key]))
    .map(key => ({
      label: toLabel(key),
      value: /date/i.test(key) ? formatDateTime(rec[key]) : cleanText(String(rec[key]))
    }));

  // Extract extra fields for React Native UI
  const skip = new Set([...ALREADY_RENDERED_FIELDS, ...CLINICAL_FIELDS]);
  const extra = [];
  for (const key of Object.keys(rec || {})) {
    if (skip.has(key) || NOISE_FIELDS.has(key)) continue;
    const val = rec[key];
    if (!isMeaningful(val)) continue;
    extra.push({ label: toLabel(key), value: String(val).trim() });
  }

  return {
    hospitalName,
    invoiceNumber: rec.invoice_sequence_number ?? rec.location_Wise_Invoice_no ?? rec.invoice_id,
    invoiceDate: formatDateTime(rec.invoice_date_time),
    status: { payment: balance <= 0 ? 'paid' : 'pending' },
    amounts: { subtotal, discount, paid, balance, total },
    patient: {
      name: cleanText(rec.patient_name),
      uhid: rec.uhid,
      gender: rec.gender,
      contact: rec.contact_number,
      payee: cleanText(rec.payee_of_invoice),
      city,
      state
    },
    invoiceDetails: {
      consultant,
      referredBy: cleanText(rec.refral_name),
      preparedBy: hospitalName
    },
    payment: { mode: rec.payment_mode || '' },
    charges,
    paymentHistory,
    notes,
    clinical,
    extra
  };
}

export function generateInvoiceHtml(rawOrMappedData, options = {}) {
  const rawRecord = rawOrMappedData?._raw ? rawOrMappedData._raw : rawOrMappedData;
  const mapped = mapInvoiceRecord(rawRecord);
  const serializedRecord = JSON.stringify(rawRecord || {});

  // ---------- letterhead (optional) ----------
  const letterhead = mapLetterhead(options.letterhead);
  const letterheadHtml = buildLetterheadHtml(letterhead, cleanText(options.copyLabel), options.logoUrl || '');

  // Pre-generate static XHTML for all nodes so backend XML engine renders without JS
  const data = mapped || {};
  const d = data.invoiceDetails || {};
  const p = data.patient || {};
  const amounts = data.amounts || {};
  const payment = data.payment || {};

  const isPaid = data.status?.payment === 'paid';
  const paymentBadgeHtml = isPaid
    ? '<span class="badge badge-paid">Paid</span>'
    : '<span class="badge badge-pending">Pending</span>';

  const payeeBadgeHtml = p.payee
    ? `<span class="badge badge-payee">Payee: ${escapeXml(p.payee)}</span>`
    : '';

  const patientRows = [
    { label: 'Name', value: escapeXml(p.name) },
    { label: 'UHID', value: escapeXml(p.uhid) },
    { label: 'Gender', value: escapeXml(p.gender) },
    { label: 'Contact', value: escapeXml(p.contact) },
  ];
  const location = [p.city, p.state].filter(Boolean).join(', ');
  if (location) {
    patientRows.push({ label: 'City / State', value: location });
  }

  // Two-per-row grid instead of one full-width label...value row: pairing
  // fields side by side keeps label and value close together instead of
  // stretching a single pair across the whole page width with a big gap.
  const patientPairs = [];
  for (let i = 0; i < patientRows.length; i += 2) {
    patientPairs.push([patientRows[i], patientRows[i + 1]]);
  }

  const kvCell = (r) => r
    ? `<div class="kv-cell"><span class="kv-label">${r.label}</span><span class="kv-value">${r.value || '-'}</span></div>`
    : '<div class="kv-cell"></div>';

  const patientInfoHtml = patientPairs.map(([a, b]) => `
    <div class="kv-grid-row">
      ${kvCell(a)}
      ${kvCell(b)}
    </div>
  `).join('');

  // Clinical information (IPD: admission/discharge dates, diagnosis, etc.)
  let clinicalInfoHtml = '';
  if (data.clinical && data.clinical.length > 0) {
    const clinicalRows = data.clinical.map(c => `
      <div class="clinical-row">
        <span class="clinical-label">${escapeXml(c.label)}</span>
        <span class="clinical-value">${escapeXml(c.value)}</span>
      </div>
    `).join('');
    clinicalInfoHtml = `
      <div class="section section-clinical">
        <div class="card-title">Clinical Information</div>
        ${clinicalRows}
      </div>
    `;
  }

  let chargesBodyHtml = '';
  if (data.charges && data.charges.length > 0) {
    chargesBodyHtml = data.charges.map(group => {
      const itemsHtml = (group.items || []).map(item => `
        <tr class="charge-item">
          <td>${escapeXml(item.description)}</td>
          <td>${escapeXml(item.code)}</td>
          <td class="text-right">${item.qty}</td>
          <td class="text-right">${currency(item.rate)}</td>
          <td class="text-right">${currency(item.amount)}</td>
        </tr>
      `).join('');

      return `
        <tr class="charge-group">
          <td colspan="4">${escapeXml(group.group)}</td>
          <td class="text-right">${currency(group.amount)}</td>
        </tr>
        ${itemsHtml}
      `;
    }).join('');
  }

  let paymentHistoryBodyHtml = '';
  if (data.paymentHistory && data.paymentHistory.length > 0) {
    paymentHistoryBodyHtml = data.paymentHistory.map(h => `
      <tr>
        <td>${h.date}</td>
        <td>${escapeXml(h.mode)}</td>
        <td class="text-right">${currency(h.amount)}</td>
      </tr>
    `).join('');
  }

  const notesHtml = (data.notes || []).map(n => `
    <div class="note-box">
      <strong>Note</strong>${escapeXml(n.text)}
    </div>
  `).join('');

  let amountSummaryHtml = '';
  if (payment.mode) {
    amountSummaryHtml += `
      <div class="amount-row muted">
        <div class="amount-label">Payment Mode</div><div class="amount-value">${escapeXml(payment.mode)}</div>
      </div>
    `;
  }
  if (amounts.subtotal !== undefined && amounts.subtotal !== null) {
    amountSummaryHtml += `
      <div class="amount-row muted">
        <div class="amount-label">Subtotal</div><div class="amount-value">${currency(amounts.subtotal)}</div>
      </div>
    `;
  }
  if (Number(amounts.discount) > 0) {
    amountSummaryHtml += `
      <div class="amount-row discount">
        <div class="amount-label">Discount</div><div class="amount-value">- ${currency(amounts.discount)}</div>
      </div>
    `;
  }
  amountSummaryHtml += `
    <div class="amount-row muted">
      <div class="amount-label">Paid Amount</div><div class="amount-value">${currency(amounts.paid)}</div>
    </div>
    <div class="amount-row muted">
      <div class="amount-label">Balance</div><div class="amount-value">${currency(amounts.balance)}</div>
    </div>
    <div class="amount-row amount-total">
      <div class="amount-label">Total Amount</div><div class="amount-value">${currency(amounts.total)}</div>
    </div>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Invoice #${data.invoiceNumber || ''}</title>
  <style type="text/css">
    * { margin: 0; padding: 0; box-sizing: border-box; }
    /*
      Fixed A4 page via @page only. Flying Saucer/OpenHTMLtoPDF does not map CSS
      px to 96dpi the way a browser does — it maps px much closer to PDF points
      (72dpi), so a literal "794px" body renders far WIDER than an actual A4 page
      (roughly 11in instead of 8.27in), which is what was cutting off the right
      edge of the table/amount columns. To avoid depending on getting that exact
      conversion factor right, the page's physical size is set once via @page,
      and everything inside is sized in PERCENTAGES relative to that page box —
      so it can never exceed the printable width regardless of unit mapping.
    */
    @page {
      size: 210mm 297mm; /* explicit width x height = A4 portrait; avoids
                             relying on the "portrait" orientation keyword,
                             which some Flying Saucer versions mis-parse and
                             can fall back to landscape for */
      margin: 10mm;
    }
    html, body {
      background: #F3F4F6;
      width: 100%;
    }
    body {
      font-family: Arial, sans-serif;
      color: #1F2937;
      font-size: 11px;
      line-height: 1.4;
    }
    .container {
      width: 100%;
      margin: 0 auto;
      background: #fff;
    }
    #invoiceRoot {
      display: block;
      width: 100%;
    }

    /* ===== Hospital letterhead (optional header above the banner) =====
       Horizontal padding is on the cells, not on the table, for the same
       Flying-Saucer/box-sizing reason as the banner below. */
    .letterhead {
      display: table;
      width: 100%;
      padding: 16px 0 10px 0;
    }
    .letterhead-logo-cell {
      display: table-cell;
      width: 64px;
      vertical-align: top;
      padding-left: 26px;
      padding-right: 14px;
    }
    .letterhead-logo {
      width: 56px;
      height: 56px;
    }
    .letterhead-info {
      display: table-cell;
      vertical-align: top;
      padding-right: 26px;
    }
    .letterhead-name {
      font-size: 15px;
      font-weight: bold;
      color: #1F2937;
    }
    .letterhead-sub {
      font-size: 11px;
      font-weight: bold;
      color: #1F2937;
      margin-top: 2px;
    }
    .letterhead-line {
      font-size: 9px;
      color: #6B7280;
      margin-top: 1px;
    }
    .copy-label {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: #1F2937;
      padding: 7px 0;
      margin: 0 26px 10px 26px;
      border-top: 2px solid #0ea5a2;
      border-bottom: 2px solid #0ea5a2;
    }

    /* ===== Banner: table instead of flex =====
       Padding lives on the CELLS, not on the table. Flying Saucer ignores
       box-sizing, so padding on a width:100% table overflows the page. */
    .banner {
      display: table;
      width: 100%;
      background: #0ea5a2;
      color: #fff;
    }
    .banner-left {
      display: table-cell;
      vertical-align: top;
      width: 60%;
      padding: 14px 10px 14px 26px;
    }
    .banner-right {
      display: table-cell;
      vertical-align: top;
      width: 40%;
      text-align: right;
      padding: 14px 26px 14px 10px;
    }
    .banner h1 {
      font-size: 18px;
      letter-spacing: 1px;
      color: #fff;
    }
    .banner p {
      opacity: 0.85;
      font-size: 11px;
      margin-top: 2px;
      color: #fff;
    }
    .banner-right .inv-no {
      font-size: 15px;
      font-weight: bold;
    }
    .banner-right .inv-date,
    .banner-right .inv-prepared {
      opacity: 0.85;
      font-size: 10px;
      margin-top: 2px;
    }

    /* ===== Status row: table instead of flex (padding on cells) ===== */
    .status-row {
      display: table;
      width: 100%;
      background: #F0FDFC;
      border-bottom: 1px solid #E5E7EB;
    }
    .status-row-left {
      display: table-cell;
      vertical-align: middle;
      width: 60%;
      padding: 6px 10px 6px 26px;
    }
    .status-row-left .label {
      color: #6B7280;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: bold;
      margin-right: 4px;
    }
    .status-consultant {
      display: table-cell;
      vertical-align: middle;
      width: 40%;
      text-align: right;
      padding: 6px 26px 6px 10px;
      font-size: 10px;
      font-weight: bold;
      color: #374151;
    }
    .status-consultant div {
      display: block;
    }
    .status-consultant .referred-by {
      font-weight: normal;
      color: #6B7280;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-paid { background: #D1FAE5; color: #059669; }
    .badge-pending { background: #FEF3C7; color: #D97706; }
    .badge-payee { background: #EDE9FE; color: #7C3AED; }

    /* ===== Content: single stacked column (was sidebar+main split) =====
       No width:100% here — block fills parent automatically, so the
       horizontal padding can't cause overflow. */
    .content {
      margin: 0;
      padding: 14px 26px;
    }
    .section {
      /* no width:100% — see note above */
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #E5E7EB;
      page-break-inside: avoid; /* keep compact blocks (patient info, payment
                                    history) from being split across a page
                                    break; Charges Breakdown overrides this
                                    below since it's the one section allowed
                                    to flow across pages */
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-charges {
      page-break-inside: auto; /* the only section allowed to break across pages */
    }
    .section-patient {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .section-clinical {
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .clinical-row {
      display: table;
      width: 100%;
      margin-bottom: 7px;
    }
    .clinical-row:last-child {
      margin-bottom: 0;
    }
    .clinical-label {
      display: table-cell;
      width: 35%;
      color: #92400E;
      font-weight: bold;
      font-size: 10px;
      vertical-align: top;
    }
    .clinical-value {
      display: table-cell;
      width: 65%;
      font-weight: 600;
      font-size: 10px;
      color: #451A03;
      vertical-align: top;
    }

    .card {
      margin-bottom: 12px;
    }
    .card-title {
      color: #0ea5a2;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 2px solid #0ea5a2;
    }

    /* ===== Patient info: 2-column grid, label sits directly next to its
       value instead of a full-width row with a big gap between them ===== */
    .kv-grid-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 7px;
    }
    .kv-cell {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding-right: 12px;
    }
    .kv-label {
      display: inline-block;
      min-width: 62px;
      color: #6B7280;
      font-weight: 500;
      font-size: 10px;
      vertical-align: top;
    }
    .kv-value {
      display: inline-block;
      font-weight: bold;
      font-size: 10px;
      color: #1F2937;
      white-space: nowrap;
      vertical-align: top;
      word-break: keep-all;
    }

    .charges-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .charges-table thead {
      display: table-header-group; /* repeats the column headers on every
                                       page the charges table spans */
    }
    .charges-table tr {
      page-break-inside: avoid; /* never split a single row across pages,
                                    only ever break between rows */
    }
    .charges-table col.col-desc { width: 42%; }
    .charges-table col.col-code { width: 14%; }
    .charges-table col.col-qty { width: 12%; }
    .charges-table col.col-rate { width: 16%; }
    .charges-table col.col-amount { width: 16%; }
    .charges-table th, .charges-table td {
      overflow: hidden;
    }
    .charges-table td.text-right,
    .charges-table th.text-right {
      white-space: nowrap;
    }
    .charges-table td:not(.text-right),
    .charges-table th:not(.text-right) {
      white-space: normal;
      word-break: break-word;
    }
    .charges-table th {
      background: #F9FAFB;
      padding: 6px 8px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      color: #6B7280;
      border-bottom: 2px solid #E5E7EB;
    }
    .charges-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #F3F4F6;
      font-size: 10px;
    }
    .charges-table tr:last-child td { border-bottom: none; }
    .charge-group { background: #F9FAFB; font-weight: bold; }
    .charge-item { padding-left: 14px; color: #4B5563; }
    .text-right { text-align: right; }

    /* ===== Amount panel: table instead of flex amount-row ===== */
    .amount-panel {
      background: #0ea5a2;
      color: #fff;
      border-radius: 8px;
      padding: 12px 20px;
      margin-top: 4px;
      page-break-inside: avoid;
    }
    .amount-row {
      display: table;
      width: 100%;
      padding: 3px 0;
      font-size: 11px;
    }
    .amount-label {
      display: table-cell;
      width: 60%;
      text-align: left;
    }
    .amount-value {
      display: table-cell;
      width: 40%;
      text-align: right;
    }
    .amount-row.muted { opacity: 0.85; }
    .amount-row.discount { color: #FEE2E2; }
    .amount-total {
      border-top: 1px solid rgba(255,255,255,0.35);
      margin-top: 6px;
      padding-top: 6px;
      font-size: 14px;
      font-weight: bold;
    }

    .note-box {
      background: #FFFBEB;
      border-left: 3px solid #F59E0B;
      padding: 8px 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 10px;
    }
    .note-box strong { color: #D97706; display: block; margin-bottom: 2px; }

    .footer {
      padding: 10px 26px;
      text-align: center;
      color: #9CA3AF;
      font-size: 10px;
      letter-spacing: 0.3px;
      border-top: 1px solid #E5E7EB;
    }

    .hidden { display: none; }

    /*
      NOTE: page-row-header / page-row-content / page-row-footer are kept as
      plain sequential blocks (not a fixed-height sticky-footer table) —
      forcing a 277mm table height in a earlier version left a large blank
      gap below the footer instead of pinning it to the bottom, so that
      approach is reverted. The footer simply follows the content directly.
      The real, load-bearing protections are page-break-inside: avoid on
      .section/.amount-panel/.charges-table tr and table-header-group on
      the charges table's thead (below) — those keep every block except
      Charges Breakdown intact across a page break without depending on
      any fixed page-height assumption.
    */
    .page-row-header,
    .page-row-footer {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="invoiceRoot">
      <!-- Hospital letterhead (optional; printed only when options.letterhead is passed in) -->
      ${letterheadHtml}
      <!-- Header: banner + status -->
      <div class="page-row-header">
      <!-- Banner -->
      <div class="banner">
        <div class="banner-left">
          <h1>INVOICE</h1>
          <p id="orgName">${escapeXml(data.hospitalName || 'SmartCare Digital Health Record')}</p>
        </div>
        <div class="banner-right">
          <div class="inv-no" id="invoiceNumber">#${escapeXml(data.invoiceNumber || '-')}</div>
          <div class="inv-date" id="invoiceDate">${data.invoiceDate || '-'}</div>
          <div class="inv-prepared" id="invoicePreparedBy">${d.preparedBy ? ('Prepared By: ' + escapeXml(d.preparedBy)) : ''}</div>
        </div>
      </div>

      <!-- Status -->
      <div class="status-row">
        <div class="status-row-left">
          <span class="label">Status</span>
          <span id="statusBadges">${paymentBadgeHtml}</span>
          <span id="payeeBadge">${payeeBadgeHtml}</span>
        </div>
        <div class="status-consultant">
          <div id="statusConsultant">${d.consultant ? ('Consultant - ' + escapeXml(d.consultant)) : ''}</div>
          <div id="statusReferredBy" class="referred-by">${d.referredBy ? ('Referred By - ' + escapeXml(d.referredBy)) : ''}</div>
        </div>
      </div>
      </div>

      <!-- Content: everything below the header. Only Charges Breakdown is
           allowed to grow large here; the other blocks are kept compact and
           page-break-protected via .section / .amount-panel CSS. -->
      <div class="content">
        <!-- Patient Information -->
        <div class="section section-patient">
          <div class="card-title">Patient Information</div>
          <div id="patientInfoBody">
            ${patientInfoHtml}
          </div>
        </div>

        <!-- Clinical Information (IPD bills) -->
        ${clinicalInfoHtml}

        <!-- Charges Breakdown: the one section that can grow large -->
        <div class="section section-charges ${chargesBodyHtml ? '' : 'hidden'}">
          <div class="card-title">Charges Breakdown</div>
          <table class="charges-table" id="chargesTable">
            <colgroup>
              <col class="col-desc" />
              <col class="col-code" />
              <col class="col-qty" />
              <col class="col-rate" />
              <col class="col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>Description</th>
                <th>Code</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody id="chargesBody">
              ${chargesBodyHtml}
            </tbody>
          </table>
        </div>

        <!-- Payment History -->
        <div class="section ${paymentHistoryBodyHtml ? '' : 'hidden'}" id="paymentHistorySection">
          <div class="card-title">Payment History</div>
          <table class="charges-table">
            <colgroup>
              <col style="width:34%" />
              <col style="width:33%" />
              <col style="width:33%" />
            </colgroup>
            <thead>
              <tr><th>Date</th><th>Mode</th><th class="text-right">Amount</th></tr>
            </thead>
            <tbody id="paymentHistoryBody">
              ${paymentHistoryBodyHtml}
            </tbody>
          </table>
        </div>

        <div id="notesContainer">
          ${notesHtml}
        </div>

        <!-- Summary -->
        <div class="amount-panel" id="amountSummary">
          ${amountSummaryHtml}
        </div>
      </div>

      <!-- Footer -->
      <div class="page-row-footer">
      <div class="footer">Powered by SmartCare</div>
      </div>
    </div>
  </div>

  <script type="text/javascript">
    /* <![CDATA[ */
    const LIVE_INVOICE_RECORD = ${serializedRecord};
    /* ]]> */
  </script>
</body>
</html>`;
}


// ─────────────────────────────────────────────────────────────────────────────
// INVESTIGATION REPORT MAPPING & GENERATION
// Uses the same generateInvoiceHtml() function name for consistency
// ─────────────────────────────────────────────────────────────────────────────

// Extra findings that only some report types fill in (microbiology / culture etc.).
const FINDING_FIELDS = [
  ['gramStain', 'Gram Stain'],
  ['znStains', 'ZN Stain'],
  ['hangingDrop', 'Hanging Drop'],
  ['macroScopy', 'Macroscopy'],
  ['cultureSpecimen', 'Culture Specimen'],
  ['cultureMediaUsed', 'Culture Media Used'],
  ['incubationMedium', 'Incubation Medium'],
  ['incubationTemperature', 'Incubation Temperature'],
  ['incubationTime', 'Incubation Time'],
  ['growth', 'Growth'],
  ['colonyCount', 'Colony Count'],
  ['organismsIsolated', 'Organisms Isolated'],
  ['methodForRt05', 'Method'],
  ['investigationScore', 'Score']
];

// Keeps line breaks (used for long reference ranges); renders with white-space: pre-line.
function cleanMultiline(raw) {
  return (raw ?? '')
    .toString()
    .replace(/\r\n|\r/g, '\n')
    .replace(/\.{3,}/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function stripHtml(raw) {
  return cleanText(
    (raw || '')
      .toString()
      .replace(/<br\s*\/?>/gi, ', ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
  );
}

function ageText(rec) {
  const a = rec.patientAge ?? rec.age;
  return isMeaningful(a) ? `${String(a).trim()} Yrs` : '';
}

const NUM = '(-?\\d+(?:\\.\\d+)?)';

// Picks the low/high bounds out of a reference-range string
function parseRange(normal, gender) {
  const s = cleanText(normal).replace(/\.{3,}/g, ' ').replace(/,/g, '');
  if (!s) return null;

  const simple = new RegExp('^' + NUM + '\\s*(?:-|to)\\s*' + NUM + '\\s*[a-zA-Z%/.]*$', 'i').exec(s);
  if (simple) return { low: parseFloat(simple[1]), high: parseFloat(simple[2]) };

  const g = String(gender || '').toLowerCase();
  const key = g.startsWith('f') ? 'female' : g.startsWith('m') ? 'male' : '';
  if (key) {
    const re = new RegExp('\\b' + key + '\\b\\s*[:=-]?\\s*' + NUM + '\\s*(?:to|-)\\s*' + NUM, 'i');
    const m = re.exec(s);
    if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };
  }

  return null;
}

function flagFor(param, gender) {
  const raw = String(param.totalObtainedValue ?? '').replace(/,/g, '').trim();
  const val = parseFloat(raw);
  if (raw === '' || Number.isNaN(val) || !/^-?\d+(\.\d+)?$/.test(raw)) return '';

  const range = parseRange(param.normalValue, gender);
  if (!range) return '';

  if (val < range.low) return cleanText(param.lowerCriticalValueFlag) || 'L';
  if (val > range.high) return cleanText(param.higherCriticalValueFlag) || 'H';

  return '';
}

export function mapInvestigationRecord(input) {
  if (!input) return null;

  const rec = input.data && typeof input.data === 'object' && !Array.isArray(input.data) ? input.data : input;

  const gender = cleanText(rec.gender);

  const parameters = (rec.parameterlist || []).map(p => {
    const value = isMeaningful(p.totalObtainedValue)
      ? cleanText(p.totalObtainedValue)
      : (isMeaningful(p.findings) ? cleanText(p.findings) : '');

    const flag = flagFor(p, gender);
    const method = cleanText(p.testParameterMethod || p.parameterMethod || p.methodName);

    return {
      name: cleanText(p.parameterName || p.constantParameterName),
      value,
      unit: isMeaningful(p.parameterUnit) ? cleanText(p.parameterUnit) : '',
      range: cleanMultiline(p.normalValue),
      flag,
      method: rec.hidemethod ? '' : method
    };
  });

  const antibiotics = (Array.isArray(rec.antibioticsList) ? rec.antibioticsList : [])
    .filter(a => a && typeof a === 'object')
    .map(a => ({
      name: cleanText(a.antibioticName || a.antibiotic || a.name || a.antibioticsName),
      result: cleanText(a.sensitivity || a.result || a.value || a.interpretation || a.sensitivityName),
      extra: cleanText(a.mic || a.zone || a.zoneSize || '')
    }))
    .filter(a => a.name);

  const findings = FINDING_FIELDS
    .filter(([key]) => isMeaningful(rec[key]))
    .map(([key, label]) => ({ label, value: cleanText(stripHtml(rec[key])) }));

  const notes = [];
  const remark = stripHtml(rec.remark);
  if (remark) notes.push({ title: 'Remarks', text: remark });

  const indications = stripHtml(rec.indications);
  if (indications) notes.push({ title: 'Indications', text: indications });

  const advice = stripHtml(rec.adviceInEnglish || rec.advice);
  if (advice) notes.push({ title: 'Advice', text: advice });

  const verifiers = [
    {
      name: cleanText(rec.firstVerifierName),
      qualification: cleanText(rec.verifierOneQualification),
      regNo: cleanText(rec.verifierOneRegistrationNumber),
      signature: rec.verifierOneSignature
    },
    {
      name: cleanText(rec.secondVerifierName),
      qualification: cleanText(rec.verifierTwoQualification),
      regNo: cleanText(rec.verifierTwoRegistrationNumber),
      signature: rec.verifierTwoSignature
    }
  ].filter(v => v.name);

  const status = rec.approvedDate ? 'approved' : (rec.completedDate ? 'completed' : 'pending');

  return {
    _type: 'investigation',
    labName: cleanText(rec.labName) || 'Lab Test Report',
    orgName: cleanText(rec.clinicName),
    sectionName: cleanText(rec.sectionName),
    requestNumber: rec.investigationrequestId ?? rec.investigationId ?? '',
    testName: cleanText(rec.testName),
    reportType: cleanText(rec.reportType),
    status,
    urgent: !!rec.urgent,
    dates: {
      requested: formatDateTime(rec.requestedDate),
      collected: formatDateTime(rec.collectedDate),
      completed: formatDateTime(rec.completedDate),
      approved: formatDateTime(rec.approvedDate)
    },
    patient: {
      name: cleanText(rec.patientName),
      uhid: cleanText(rec.uhid),
      age: ageText(rec),
      gender,
      contact: cleanText(rec.contactNo),
      type: cleanText(rec.patientType),
      payee: cleanText(rec.payee),
      referredBy: cleanText(rec.referalName),
      address: cleanText(rec.address),
      ward: cleanText(rec.wardName),
      bed: cleanText(rec.bedName)
    },
    practitioner: cleanText(rec.practionerName || rec.practitionerName),
    practitionerName: cleanText(rec.practitionerName),
    collectedAt: cleanText(rec.collectedAt),
    machineName: isMeaningful(rec.machineName) ? cleanText(rec.machineName) : '',
    completedBy: cleanText(rec.completedByUserName),
    approvedBy: cleanText(rec.approvedByUserName),
    parameters,
    antibiotics,
    findings,
    notes,
    verifiers
  };
}

function buildLetterheadHtml(letterhead, copyLabel, logoUrl) {
  if (!letterhead) return '';

  const lines = [];
  const addressLine = [letterhead.address, letterhead.city].filter(Boolean).join(', ');
  if (addressLine) lines.push(addressLine);
  if (letterhead.landlineNo) lines.push(letterhead.landlineNo);
  if (letterhead.emailId) lines.push(letterhead.emailId);
  if (letterhead.regNo) lines.push('Reg No: ' + letterhead.regNo);
  if (letterhead.website) lines.push(letterhead.website);

  const logoCellHtml = logoUrl
    ? `<div class="letterhead-logo-cell"><img class="letterhead-logo" src="${escapeXml(logoUrl)}" alt="Logo" /></div>`
    : '';

  const nameHtml = letterhead.hospname
    ? `<div class="letterhead-name">${escapeXml(letterhead.hospname)}</div>`
    : '';

  const subHtml = letterhead.subtitle
    ? `<div class="letterhead-sub">${escapeXml(letterhead.subtitle)}</div>`
    : '';

  const linesHtml = lines.map(l => `<div class="letterhead-line">${escapeXml(l)}</div>`).join('');

  const copyLabelHtml = copyLabel
    ? `<div class="copy-label">${escapeXml(copyLabel)}</div>`
    : '';

  return `
      <div class="letterhead">
        ${logoCellHtml}
        <div class="letterhead-info">
          ${nameHtml}
          ${subHtml}
          ${linesHtml}
        </div>
      </div>
      ${copyLabelHtml}`;
}

export function mapLetterhead(input) {
  if (!input) return null;

  const arr = Array.isArray(input) ? input : (Array.isArray(input.letterheadDetails) ? input.letterheadDetails : null);
  const rec = arr ? arr[0] : input;

  if (!rec || typeof rec !== 'object') return null;

  return {
    hospname: cleanText(rec.hospname),
    subtitle: cleanText(rec.subtitle),
    address: cleanText(rec.address),
    city: cleanText(rec.city),
    landlineNo: cleanText(rec.landlineNo),
    emailId: cleanText(rec.emailId),
    regNo: cleanText(rec.regNo),
    website: cleanText(rec.website),
    clinicLogo: cleanText(rec.clinicLogo)
  };
}

export function generateInvestigationHtml(rawOrMappedData, options = {}) {
  const rawRecord = rawOrMappedData?._raw ? rawOrMappedData._raw : rawOrMappedData;
  const mapped = mapInvestigationRecord(rawRecord);
  const serializedRecord = JSON.stringify(rawRecord || {}).replace(/\]\]>/g, ']]]]><![CDATA[>');

  const data = mapped || {};
  const p = data.patient || {};
  const dates = data.dates || {};

  // ---------- letterhead (optional) ----------
  const letterhead = mapLetterhead(options.letterhead);
  const letterheadHtml = buildLetterheadHtml(letterhead, cleanText(options.copyLabel), options.logoUrl || '');

  // ---------- status row ----------
  const statusBadgeHtml =
    data.status === 'approved'
      ? '<span class="badge badge-paid">Approved</span>'
      : data.status === 'completed'
        ? '<span class="badge badge-completed">Completed</span>'
        : '<span class="badge badge-pending">Pending</span>';

  const urgentBadgeHtml = data.urgent ? '<span class="badge badge-urgent">Urgent</span>' : '';
  const typeBadgeHtml = p.type ? `<span class="badge badge-payee">${escapeXml(p.type)}</span>` : '';

  // ---------- generic 2-per-row key/value grid ----------
  const kvCell = (r) => r
    ? `<div class="kv-cell"><span class="kv-label">${escapeXml(r.label)}</span><span class="kv-value">${escapeXml(r.value) || '-'}</span></div>`
    : '<div class="kv-cell"></div>';

  const kvGridHtml = (rows) => {
    const pairs = [];
    for (let i = 0; i < rows.length; i += 2) pairs.push([rows[i], rows[i + 1]]);
    return pairs.map(([a, b]) => `
    <div class="kv-grid-row">
      ${kvCell(a)}
      ${kvCell(b)}
    </div>
  `).join('');
  };

  const kvFull = (label, value) => value
    ? `<div class="kv-full"><div class="kv-full-label">${escapeXml(label)}</div><div class="kv-full-value">${escapeXml(value)}</div></div>`
    : '';

  // ---------- patient card ----------
  const patientRows = [
    { label: 'Name', value: p.name },
    { label: 'UHID', value: p.uhid },
    { label: 'Age', value: p.age },
    { label: 'Gender', value: p.gender },
    { label: 'Contact', value: p.contact },
    { label: 'Referred By', value: p.referredBy },
    { label: 'Payee', value: p.payee }
  ];

  if (p.ward) patientRows.push({ label: 'Ward', value: p.ward });
  if (p.bed) patientRows.push({ label: 'Bed', value: p.bed });

  const patientInfoHtml = kvGridHtml(patientRows) + kvFull('Address', p.address);

  // ---------- sample / report details card ----------
  const sampleRows = [];
  if (data.sectionName) sampleRows.push({ label: 'Section', value: data.sectionName });
  if (data.reportType) sampleRows.push({ label: 'Report Type', value: data.reportType });
  if (dates.requested) sampleRows.push({ label: 'Requested', value: dates.requested });
  if (dates.collected) sampleRows.push({ label: 'Collected', value: dates.collected });
  if (dates.completed) sampleRows.push({ label: 'Completed', value: dates.completed });
  if (dates.approved) sampleRows.push({ label: 'Approved', value: dates.approved });
  if (data.collectedAt) sampleRows.push({ label: 'Collected At', value: data.collectedAt });
  if (data.machineName) sampleRows.push({ label: 'Machine', value: data.machineName });

  // dates are already XML-escaped by formatDateTime, so undo that before kvCell escapes again
  const unesc = (s) => String(s).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  const sampleInfoHtml = kvGridHtml(sampleRows.map(r => ({ label: r.label, value: unesc(r.value) })));

  // ---------- results table ----------
  const anyFlag = (data.parameters || []).some(x => x.flag);
  const resultsBodyHtml = (data.parameters || []).map(x => `
        <tr class="result-row">
          <td>${escapeXml(x.name) || '-'}${x.method ? `<div class="param-method">${escapeXml(x.method)}</div>` : ''}</td>
          <td><span class="${x.flag ? 'val-abnormal' : 'val'}">${escapeXml(x.value) || '-'}</span>${x.flag ? `<span class="flag">${escapeXml(x.flag)}</span>` : ''}</td>
          <td>${escapeXml(x.unit)}</td>
          <td class="ref-range">${escapeXml(x.range) || '-'}</td>
        </tr>
      `).join('');

  // ---------- antibiotic sensitivity ----------
  const antibioticsBodyHtml = (data.antibiotics || []).map(a => `
        <tr>
          <td>${escapeXml(a.name)}</td>
          <td>${escapeXml(a.result) || '-'}</td>
          <td>${escapeXml(a.extra)}</td>
        </tr>
      `).join('');

  // ---------- other findings ----------
  const findingsHtml = (data.findings || []).map(f => kvFull(f.label, f.value)).join('');

  // ---------- notes ----------
  const notesHtml = (data.notes || []).map(n => `
    <div class="note-box">
      <strong>${escapeXml(n.title)}</strong>${escapeXml(n.text)}
    </div>
  `).join('');

  // ---------- signatures ----------
  const signCell = (v, align) => {
    if (!v) return `<div class="sign-cell sign-${align}"></div>`;

    return `<div class="sign-cell sign-${align}">
        <div class="sign-blank"></div>
        <div class="sign-name">${escapeXml(v.name)}</div>
        ${v.qualification ? `<div class="sign-meta">${escapeXml(v.qualification)}</div>` : ''}
        ${v.regNo ? `<div class="sign-meta">Reg No: ${escapeXml(v.regNo)}</div>` : ''}
      </div>`;
  };

  const verifiers = data.verifiers || [];
  const signaturesHtml = verifiers.length
    ? `<div class="sign-row">${signCell(verifiers[0], 'left')}${signCell(verifiers[1], 'right')}</div>`
    : '';

  const reportedByLine = [
    data.completedBy ? `<div>Completed By: ${escapeXml(data.completedBy)}</div>` : '',
    data.approvedBy ? `<div>Approved By: ${escapeXml(data.approvedBy)}</div>` : ''
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Lab Report ${escapeXml(data.requestNumber)}</title>
  <style type="text/css">
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: 210mm 297mm;
      margin: 10mm;
    }
    html, body {
      background: #F3F4F6;
      width: 100%;
    }
    body {
      font-family: Arial, sans-serif;
      color: #1F2937;
      font-size: 11px;
      line-height: 1.4;
    }
    .container {
      width: 100%;
      margin: 0 auto;
      background: #fff;
    }
    #reportRoot {
      display: block;
      width: 100%;
    }

    /* ===== Hospital letterhead (optional header above the banner) =====
       Horizontal padding is on the cells, not on the table, for the same
       Flying-Saucer/box-sizing reason as the banner below. */
    .letterhead {
      display: table;
      width: 100%;
      padding: 16px 0 10px 0;
    }
    .letterhead-logo-cell {
      display: table-cell;
      width: 64px;
      vertical-align: top;
      padding-left: 26px;
      padding-right: 14px;
    }
    .letterhead-logo {
      width: 56px;
      height: 56px;
    }
    .letterhead-info {
      display: table-cell;
      vertical-align: top;
      padding-right: 26px;
    }
    .letterhead-name {
      font-size: 15px;
      font-weight: bold;
      color: #1F2937;
    }
    .letterhead-sub {
      font-size: 11px;
      font-weight: bold;
      color: #1F2937;
      margin-top: 2px;
    }
    .letterhead-line {
      font-size: 9px;
      color: #6B7280;
      margin-top: 1px;
    }
    .copy-label {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: #1F2937;
      padding: 7px 0;
      margin: 0 26px 10px 26px;
      border-top: 2px solid #0ea5a2;
      border-bottom: 2px solid #0ea5a2;
    }

    .banner {
      display: table;
      width: 100%;
      background: #0ea5a2;
      color: #fff;
    }
    .banner-left {
      display: table-cell;
      vertical-align: top;
      width: 60%;
      padding: 14px 10px 14px 26px;
    }
    .banner-right {
      display: table-cell;
      vertical-align: top;
      width: 40%;
      text-align: right;
      padding: 14px 26px 14px 10px;
    }
    .banner h1 {
      font-size: 18px;
      letter-spacing: 1px;
      color: #fff;
    }
    .banner p {
      opacity: 0.85;
      font-size: 11px;
      margin-top: 2px;
      color: #fff;
    }
    .banner-right .inv-no {
      font-size: 15px;
      font-weight: bold;
    }
    .banner-right .inv-date,
    .banner-right .inv-prepared {
      opacity: 0.85;
      font-size: 10px;
      margin-top: 2px;
    }

    .status-row {
      display: table;
      width: 100%;
      background: #F0FDFC;
      border-bottom: 1px solid #E5E7EB;
    }
    .status-row-left {
      display: table-cell;
      vertical-align: middle;
      width: 60%;
      padding: 6px 10px 6px 26px;
    }
    .status-row-left .label {
      color: #6B7280;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: bold;
      margin-right: 4px;
    }
    .status-consultant {
      display: table-cell;
      vertical-align: middle;
      width: 40%;
      text-align: right;
      padding: 6px 26px 6px 10px;
      font-size: 10px;
      font-weight: bold;
      color: #374151;
    }
    .status-consultant div { display: block; }
    .status-consultant .referred-by {
      font-weight: normal;
      color: #6B7280;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-paid { background: #D1FAE5; color: #059669; }
    .badge-completed { background: #DBEAFE; color: #2563EB; }
    .badge-pending { background: #FEF3C7; color: #D97706; }
    .badge-payee { background: #EDE9FE; color: #7C3AED; }
    .badge-urgent { background: #FEE2E2; color: #DC2626; }

    .content {
      margin: 0;
      padding: 14px 26px;
    }
    .section {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #E5E7EB;
      page-break-inside: avoid;
    }
    .section:last-child { border-bottom: none; }
    .section-results { page-break-inside: auto; }
    .section-patient {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px 14px;
    }

    .card-title {
      color: #0ea5a2;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 2px solid #0ea5a2;
    }

    .test-name {
      font-size: 13px;
      font-weight: bold;
      color: #1F2937;
      margin-bottom: 8px;
    }

    .kv-grid-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 7px;
    }
    .kv-cell {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding-right: 12px;
    }
    .kv-label {
      display: inline-block;
      min-width: 70px;
      color: #6B7280;
      font-weight: 500;
      font-size: 10px;
      vertical-align: top;
    }
    .kv-value {
      display: inline-block;
      font-weight: bold;
      font-size: 10px;
      color: #1F2937;
      white-space: nowrap;
      vertical-align: top;
      word-break: keep-all;
    }

    .kv-full {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 7px;
    }
    .kv-full-label {
      display: table-cell;
      width: 82px;
      color: #6B7280;
      font-size: 10px;
      vertical-align: top;
    }
    .kv-full-value {
      display: table-cell;
      font-weight: bold;
      font-size: 10px;
      color: #1F2937;
      vertical-align: top;
    }

    .result-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .result-table thead { display: table-header-group; }
    .result-table tr { page-break-inside: avoid; }

    .result-table col.col-param { width: 30%; }
    .result-table col.col-result { width: 18%; }
    .result-table col.col-unit { width: 14%; }
    .result-table col.col-range { width: 38%; }

    .result-table th, .result-table td { overflow: hidden; }
    .result-table th {
      background: #F9FAFB;
      padding: 6px 8px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      color: #6B7280;
      border-bottom: 2px solid #E5E7EB;
    }
    .result-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #F3F4F6;
      font-size: 10px;
      vertical-align: top;
      white-space: normal;
      word-break: break-word;
    }
    .result-table tr:last-child td { border-bottom: none; }
    .result-table td.ref-range {
      color: #4B5563;
      font-size: 9px;
      white-space: pre-line;
    }

    .param-method { color: #9CA3AF; font-size: 8px; margin-top: 1px; }
    .val { font-weight: bold; color: #1F2937; }
    .val-abnormal { font-weight: bold; color: #DC2626; }
    .flag {
      font-size: 9px;
      font-weight: bold;
      color: #DC2626;
    }

    .legend {
      margin-top: 6px;
      font-size: 9px;
      color: #6B7280;
    }

    .text-right { text-align: right; }

    .note-box {
      background: #FFFBEB;
      border-left: 3px solid #F59E0B;
      padding: 8px 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 10px;
    }
    .note-box strong { color: #D97706; display: block; margin-bottom: 2px; }

    .sign-panel {
      margin-top: 8px;
      page-break-inside: avoid;
    }
    .sign-row {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .sign-cell {
      display: table-cell;
      width: 50%;
      vertical-align: bottom;
    }
    .sign-left { text-align: left; }
    .sign-right { text-align: right; }
    .sign-blank { height: 34px; }
    .sign-name { font-size: 10px; font-weight: bold; color: #1F2937; }
    .sign-meta { font-size: 9px; color: #6B7280; }

    .reported-by {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #E5E7EB;
      font-size: 9px;
      color: #6B7280;
      text-align: center;
    }

    .end-panel {
      background: #0ea5a2;
      color: #fff;
      border-radius: 8px;
      padding: 10px 20px;
      margin-top: 4px;
      text-align: center;
      font-size: 10px;
      letter-spacing: 0.5px;
      page-break-inside: avoid;
    }

    .footer {
      padding: 10px 26px;
      text-align: center;
      color: #9CA3AF;
      font-size: 10px;
      letter-spacing: 0.3px;
      border-top: 1px solid #E5E7EB;
    }

    .hidden { display: none; }

    .page-row-header,
    .page-row-footer {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="reportRoot">
      <!-- Hospital letterhead (optional; printed only when options.letterhead is passed in) -->
      ${letterheadHtml}
      <!-- Header: banner + status -->
      <div class="page-row-header">
      <div class="banner">
        <div class="banner-left">
          <h1>${escapeXml((data.labName || 'Lab Test Report').toUpperCase())}</h1>
          <p id="orgName">${escapeXml(data.orgName || 'SmartCare Digital Health Record')}</p>
          ${data.sectionName ? `<p id="sectionName">${escapeXml(data.sectionName)}</p>` : ''}
        </div>
        <div class="banner-right">
          <div class="inv-no" id="requestNumber">${data.requestNumber !== '' ? 'Request No: ' + escapeXml(data.requestNumber) : ''}</div>
          <div class="inv-date" id="requestedDate">${dates.requested ? 'Requested: ' + dates.requested : ''}</div>
          <div class="inv-prepared" id="approvedBy">${data.approvedBy ? 'Approved By: ' + escapeXml(data.approvedBy) : ''}</div>
        </div>
      </div>

      <div class="status-row">
        <div class="status-row-left">
          <span class="label">Status</span>
          <span id="statusBadges">${statusBadgeHtml}</span>
          <span id="typeBadge">${typeBadgeHtml}</span>
          <span id="urgentBadge">${urgentBadgeHtml}</span>
        </div>
        <div class="status-consultant">
          <div id="statusPractitioner">${data.practitionerName ? 'Requested By: ' + escapeXml(data.practitionerName) : ''}</div>
          <div id="statusReferredBy" class="referred-by">${p.referredBy ? 'Referred By: ' + escapeXml(p.referredBy) : ''}</div>
        </div>
      </div>
      </div>

      <div class="content">
        <div class="section section-patient">
          <div class="card-title">Patient Information</div>
          <div id="patientInfoBody">
            ${patientInfoHtml}
          </div>
        </div>

        <div class="section ${sampleRows.length ? '' : 'hidden'}">
          <div class="card-title">Report Details</div>
          <div id="sampleInfoBody">
            ${sampleInfoHtml}
          </div>
        </div>

        <div class="section section-results ${resultsBodyHtml ? '' : 'hidden'}">
          <div class="card-title">Investigation Results</div>
          ${data.testName ? `<div class="test-name" id="testName">${escapeXml(data.testName)}</div>` : ''}
          <table class="result-table" id="resultsTable">
            <colgroup>
              <col class="col-param" />
              <col class="col-result" />
              <col class="col-unit" />
              <col class="col-range" />
            </colgroup>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
              </tr>
            </thead>
            <tbody id="resultsBody">
              ${resultsBodyHtml}
            </tbody>
          </table>
          ${anyFlag ? '<div class="legend">H means above the reference range. L means below the reference range.</div>' : ''}
        </div>

        <div class="section ${antibioticsBodyHtml ? '' : 'hidden'}">
          <div class="card-title">Antibiotic Sensitivity</div>
          <table class="result-table">
            <colgroup>
              <col style="width:45%" />
              <col style="width:30%" />
              <col style="width:25%" />
            </colgroup>
            <thead>
              <tr><th>Antibiotic</th><th>Result</th><th>Details</th></tr>
            </thead>
            <tbody>
              ${antibioticsBodyHtml}
            </tbody>
          </table>
        </div>

        <div class="section ${findingsHtml ? '' : 'hidden'}">
          <div class="card-title">Findings</div>
          ${findingsHtml}
        </div>

        <div id="notesContainer">
          ${notesHtml}
        </div>

        <div class="sign-panel ${signaturesHtml || reportedByLine ? '' : 'hidden'}">
          ${signaturesHtml}
          ${reportedByLine ? `<div class="reported-by">${reportedByLine}</div>` : ''}
        </div>

        <div class="end-panel">End of Report</div>
      </div>

      <div class="page-row-footer">
      <div class="footer">Powered by SmartCare</div>
      </div>
    </div>
  </div>

  <script type="text/javascript">
    /* <![CDATA[ */
    const LIVE_INVESTIGATION_RECORD = ${serializedRecord};
    /* ]]> */
  </script>
</body>
</html>`;
}
