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
  if (typeof value === 'string' && value.trim() === '') return false;
  if (typeof value === 'string' && value.trim() === '0') return false;
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

export function generateInvoiceHtml(rawOrMappedData) {
  const rawRecord = rawOrMappedData?._raw ? rawOrMappedData._raw : rawOrMappedData;
  const mapped = mapInvoiceRecord(rawRecord);
  const serializedRecord = JSON.stringify(rawRecord || {});

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

  // table-row / table-cell instead of flex kv-row, so column alignment is fixed
  // regardless of label/value length.
  const patientInfoHtml = patientRows.map(r => `
    <div class="kv-row">
      <div class="kv-label">${r.label}</div>
      <div class="kv-value">${r.value || '-'}</div>
    </div>
  `).join('');

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

    /* ===== Banner: table instead of flex ===== */
    .banner {
      display: table;
      width: 100%;
      background: #0ea5a2;
      color: #fff;
      padding: 14px 18px;
    }
    .banner-left {
      display: table-cell;
      vertical-align: top;
      width: 60%;
    }
    .banner-right {
      display: table-cell;
      vertical-align: top;
      width: 40%;
      text-align: right;
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

    /* ===== Status row: table instead of flex ===== */
    .status-row {
      display: table;
      width: 100%;
      background: #F0FDFC;
      padding: 6px 18px;
      border-bottom: 1px solid #E5E7EB;
    }
    .status-row-left {
      display: table-cell;
      vertical-align: middle;
      width: 60%;
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

    /* ===== Content: single stacked column (was sidebar+main split) ===== */
    .content {
      width: 100%;
      padding: 14px 18px;
    }
    .section {
      width: 100%;
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

    /* ===== Patient info rows: table instead of flex kv-row ===== */
    .kv-row {
      display: table;
      width: 100%;
      padding: 3px 0;
    }
    .kv-label {
      display: table-cell;
      width: 45%;
      color: #6B7280;
      font-weight: 500;
      font-size: 10px;
      vertical-align: top;
    }
    .kv-value {
      display: table-cell;
      width: 55%;
      font-weight: bold;
      text-align: right;
      font-size: 10px;
      white-space: pre-line;
      vertical-align: top;
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
      padding: 12px 14px;
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
      padding: 10px 18px;
      text-align: center;
      color: #9CA3AF;
      font-size: 10px;
      letter-spacing: 0.3px;
      border-top: 1px solid #E5E7EB;
    }

    .hidden { display: none; }

    /*
      Sticky header/content/footer using the classic CSS-table trick (no
      flexbox, consistent with the rest of this file): the outer table is
      exactly one page's content height (297mm - 2x10mm @page margin =
      277mm). The header and footer rows size to their own content; the
      middle row has height:100% so it soaks up any leftover space, which
      pins the footer to the true bottom of the page on short invoices.
      If Charges Breakdown makes the middle row taller than the page, the
      table simply grows past 277mm and the document flows onto additional
      pages — that section is the only one meant to grow; everything else
      (header, patient info, payment history, summary, footer) stays
      compact and is protected from splitting mid-block by
      page-break-inside: avoid below.
    */
    .page-table {
      display: table;
      width: 100%;
      height: 277mm;
    }
    .page-row {
      display: table-row;
    }
    .page-cell {
      display: table-cell;
      vertical-align: top;
    }
    .page-row-header,
    .page-row-footer {
      page-break-inside: avoid;
    }
    .page-row-content {
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="invoiceRoot" class="page-table">
      <!-- Header row: banner + status, pinned to top -->
      <div class="page-row page-row-header">
        <div class="page-cell">
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
      </div>

      <!-- Content row: everything below the header. Only Charges Breakdown
           is allowed to grow large inside here; the other blocks are kept
           compact and page-break-protected via .section / .amount-panel CSS. -->
      <div class="page-row page-row-content">
        <div class="page-cell">
      <div class="content">
        <!-- Patient Information -->
        <div class="section section-patient">
          <div class="card-title">Patient Information</div>
          <div id="patientInfoBody">
            ${patientInfoHtml}
          </div>
        </div>

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
        </div>
      </div>

      <!-- Footer row: pinned to the true bottom of the page -->
      <div class="page-row page-row-footer">
        <div class="page-cell">
      <div class="footer">Powered by SmartCare</div>
        </div>
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