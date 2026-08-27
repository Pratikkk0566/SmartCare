/**
 * Generates self-contained, fully-styled, XHTML-compliant XML string for an Invoice.
 * Follows the proven SmartCare HIS XML template format (tested with Java Flying Saucer / OpenHTMLtoPDF).
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

const CHARGE_ITEM_RENDERED = new Set(['chargename', 'code', 'quantity', 'charge_amount', 'total_charge_amount']);
const CHARGE_ITEM_NOISE = new Set([
  'id', 'chargetype', 'chargeInvoiceid', 'charge_added_date', 'charge_master_id',
  'patient', 'practitioner_id', 'wardid', 'unit_charge_amount', 'is_discount_requested',
  'package_id', 'admissionid', 'opdId', 'referralId', 'invRequestedDate', 'chargeTypeId',
  'discountTeamId', 'discountTeamUserId', 'discountTeamUserName', 'discountType',
  'chargeAddedToDate', 'packageChargeList', 'payBy', 'pharmacyBillNumbers', 'productName',
  'expiryDate', 'productCharge', 'productQuantity', 'totalMedicineAmount', 'batchNumber',
  'medicineDate', 'compulsaryConsultant', 'total_discount_percent', 'packageChargeId',
  'packageAppliedId', 'originalAmount', 'originalTotalAmount', 'fromDate', 'toDate',
  'thirdPartyChargeName', 'medicineChargeList', 'chargeLogDateTime',
  'packagePractitionertDepartment', 'duration', 'totaloriginalAmount', 'genericName',
  'neworiginalAmount', 'discountPercent', 'manualCharge', 'referalName'
]);

export function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function cleanText(raw) {
  if (raw === null || raw === undefined) return '';
  const cleaned = String(raw)
    .replace(/\r\n|\r|\n/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  return escapeXml(cleaned);
}

export function formatDateTime(raw) {
  if (!raw) return '-';
  const str = String(raw).trim();
  const [datePart, timePart] = str.split(' ');
  if (!timePart) return escapeXml(datePart);
  const hhmm = timePart.split(':').slice(0, 2).join(':');
  return escapeXml(`${datePart}, ${hhmm}`);
}

export function deriveCityState(address) {
  if (!address) return { city: '', state: '' };
  const parts = String(address).split(',').map(p => p.trim()).filter(Boolean);
  while (parts.length && /^\d{4,6}$/.test(parts[parts.length - 1])) parts.pop();
  const state = parts.length ? parts[parts.length - 1] : '';
  const city = parts.length > 1 ? parts[parts.length - 2] : '';
  return { city: cleanText(city), state: cleanText(state) };
}

export function toLabel(key) {
  const lbl = String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return escapeXml(lbl);
}

export function isMeaningful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (typeof value === 'string' && value.trim() === '0') return false;
  if (typeof value === 'number' && value === 0) return false;
  return true;
}

export function currency(n) {
  const num = Number(n ?? 0);
  return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function extractDynamicFields(record, skipSet) {
  const out = [];
  for (const key of Object.keys(record || {})) {
    if (skipSet.has(key) || NOISE_FIELDS.has(key)) continue;
    const value = record[key];
    if (!isMeaningful(value)) continue;
    out.push({ label: toLabel(key), value: escapeXml(String(value).trim()) });
  }
  return out;
}

export function extractChargeItemExtras(item) {
  const parts = [];
  for (const key of Object.keys(item || {})) {
    if (CHARGE_ITEM_RENDERED.has(key) || CHARGE_ITEM_NOISE.has(key)) continue;
    const value = item[key];
    if (!isMeaningful(value)) continue;
    parts.push(`${toLabel(key)}: ${cleanText(String(value))}`);
  }
  if (Number(item.charge_discount_amount) > 0) {
    parts.push(`Discount: ${currency(item.charge_discount_amount)}`);
  }
  return parts;
}

export function mapInvoiceRecord(rec) {
  if (!rec) return null;

  const consultant = [
    cleanText(rec.counsultant || rec.doctor),
    cleanText(rec.counsultant_qualification)
  ].filter(Boolean).join(', ');

  const subtotal = Number(rec.invoice_amount ?? rec.totalAmount ?? rec.net_amount ?? 0);
  const discount = Number(rec.discount_amount ?? 0);
  const balance = Number(rec.balance_amount ?? 0);
  const paid = Number(rec.paid_amount ?? 0);
  const total = subtotal - discount;

  const rawCharges = rec.chargeTransaction || rec.charges || [];
  const charges = (Array.isArray(rawCharges) ? rawCharges : []).map(group => ({
    group: cleanText(group.master_charge_name || group.groupName || 'Service Group'),
    amount: group.total_amount ?? group.amount ?? 0,
    items: (group.charge_list || group.items || []).map(item => ({
      description: cleanText(item.chargename || item.name || 'Service'),
      code: item.code != null && item.code !== '' ? cleanText(item.code) : '-',
      qty: item.quantity ?? 1,
      rate: item.charge_amount ?? item.rate ?? 0,
      amount: item.total_charge_amount ?? item.amount ?? 0,
      extras: extractChargeItemExtras(item)
    }))
  }));

  const rawLogs = rec.payment_log || rec.paymentLogs || [];
  const paymentHistory = (Array.isArray(rawLogs) ? rawLogs : []).map(p => ({
    date: formatDateTime(p.payment_time || p.date),
    mode: cleanText(p.payment_mode || p.mode || 'Cash'),
    amount: p.part_payment_amount ?? p.amount ?? 0
  }));

  const noteText = cleanText((rec.invoice_note || rec.note || '').replace(/<[^>]*>/g, ' '));
  const notes = noteText ? [{ text: noteText }] : [];
  const hospitalName = cleanText(rec.invoice_prepared_by || rec.hospitalName || rec.clinicName || 'SmartCare Hospital');
  const { city, state } = deriveCityState(rec.address);

  const clinical = CLINICAL_FIELDS
    .filter(key => isMeaningful(rec[key]))
    .map(key => ({
      label: toLabel(key),
      value: /date/i.test(key) ? formatDateTime(rec[key]) : cleanText(String(rec[key]))
    }));

  const skip = new Set([...ALREADY_RENDERED_FIELDS, ...CLINICAL_FIELDS]);
  const extra = extractDynamicFields(rec, skip);

  const rawInvoiceNo = rec.invoice_sequence_number ?? rec.location_Wise_Invoice_no ?? rec.invoice_id ?? rec.invoiceNo ?? rec.id ?? '-';
  const invoiceNo = escapeXml(String(rawInvoiceNo));
  const invoiceType = rec.invoice_type || (rec.ipd_id ? 'IPD' : 'OPD');

  return {
    hospitalName,
    invoiceNumber: invoiceNo,
    invoiceDate: formatDateTime(rec.invoice_date_time || rec.invoiceDate || rec.date),
    invoiceType: escapeXml(invoiceType),
    status: {
      payment: balance <= 0 ? 'paid' : 'pending',
      type: invoiceType
    },
    amounts: { subtotal, discount, paid, balance, total },
    patient: {
      name: cleanText(rec.patient_name || rec.patientName),
      uhid: escapeXml(rec.uhid || '-'),
      gender: escapeXml(rec.gender || '-'),
      age: escapeXml(rec.age || '-'),
      contact: escapeXml(rec.contact_number || rec.contact || '-'),
      payee: cleanText(rec.payee_of_invoice || rec.payee),
      city,
      state
    },
    invoiceDetails: {
      consultant,
      referredBy: cleanText(rec.refral_name && rec.refral_name !== '0' ? rec.refral_name : ''),
      preparedBy: hospitalName
    },
    payment: { mode: cleanText(rec.payment_mode || (rec.transaction && rec.transaction.payment_mode) || 'Cash') },
    charges,
    paymentHistory,
    notes,
    clinical,
    extra
  };
}

/**
 * Builds the complete XHTML table-based string representation of an invoice.
 */
export function generateInvoiceHtml(rawOrMappedData) {
  const data = rawOrMappedData?.amounts ? rawOrMappedData : mapInvoiceRecord(rawOrMappedData);
  if (!data) return '';

  const d = data.invoiceDetails || {};
  const p = data.patient || {};
  const amounts = data.amounts || {};
  const payment = data.payment || {};

  const isPaid = data.status?.payment === 'paid';
  const paymentBadge = isPaid
    ? '<span style="background:#D1FAE5;color:#059669;padding:3px 8px;font-size:10px;font-weight:bold;border-radius:4px;">PAID</span>'
    : '<span style="background:#FEF3C7;color:#D97706;padding:3px 8px;font-size:10px;font-weight:bold;border-radius:4px;">PENDING</span>';

  const typeBadge = data.invoiceType
    ? `<span style="background:${data.invoiceType.toUpperCase() === 'IPD' ? '#FEE2E2' : '#DBEAFE'};color:${data.invoiceType.toUpperCase() === 'IPD' ? '#EF4444' : '#3B82F6'};padding:3px 8px;font-size:10px;font-weight:bold;border-radius:4px;margin-left:6px;">${data.invoiceType}</span>`
    : '';

  // Charges rows
  let chargesRows = '';
  if (data.charges && data.charges.length > 0) {
    chargesRows = data.charges.map(group => {
      const itemsHtml = (group.items || []).map(item => {
        const extraText = (item.extras && item.extras.length > 0)
          ? `<div style="font-size:9px;color:#64748B;margin-top:2px;">${item.extras.join(' &#8226; ')}</div>`
          : '';
        return `
          <tr>
            <td style="padding:6px 8px;border:1px solid #E2E8F0;font-size:10px;color:#334155;padding-left:14px;">${item.description}${extraText}</td>
            <td style="padding:6px 8px;border:1px solid #E2E8F0;font-size:10px;color:#64748B;">${item.code}</td>
            <td style="padding:6px 8px;border:1px solid #E2E8F0;font-size:10px;text-align:right;color:#334155;">${item.qty}</td>
            <td style="padding:6px 8px;border:1px solid #E2E8F0;font-size:10px;text-align:right;color:#334155;">${currency(item.rate)}</td>
            <td style="padding:6px 8px;border:1px solid #E2E8F0;font-size:10px;text-align:right;font-weight:bold;color:#0F172A;">${currency(item.amount)}</td>
          </tr>
        `;
      }).join('');

      return `
        <tr style="background:#F8FAFC;">
          <td colspan="4" style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;font-weight:bold;color:#0F172A;">${group.group}</td>
          <td style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;font-weight:bold;text-align:right;color:#0F172A;">${currency(group.amount)}</td>
        </tr>
        ${itemsHtml}
      `;
    }).join('');
  }

  // Payment History
  let paymentHistoryRows = '';
  if (data.paymentHistory && data.paymentHistory.length > 0) {
    paymentHistoryRows = data.paymentHistory.map(h => `
      <tr>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;color:#334155;">${h.date}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;color:#334155;">${h.mode}</td>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;font-size:10px;text-align:right;font-weight:bold;color:#059669;">${currency(h.amount)}</td>
      </tr>
    `).join('');
  }

  // Notes
  const notesHtml = (data.notes || []).map(n => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #FDE68A;background:#FFFBEB;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 10px;font-size:10px;color:#78350F;">
          <strong style="color:#D97706;display:block;margin-bottom:2px;">Note:</strong>
          ${n.text}
        </td>
      </tr>
    </table>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Invoice #${data.invoiceNumber}</title><style type="text/css">* { font-family: Arial, Helvetica, sans-serif; }</style></head><body style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1E293B;background:#FFFFFF;margin:0;padding:15px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border-collapse:collapse;"><tr><td style="vertical-align:middle;"><p style="margin:0 0 2px 0;font-size:20px;font-weight:bold;color:#0EA5A2;">INVOICE</p><p style="margin:0;font-size:12px;font-weight:bold;color:#475569;">${data.hospitalName || 'SmartCare Digital Health Record'}</p></td><td style="text-align:right;vertical-align:middle;"><p style="margin:0 0 2px 0;font-size:16px;font-weight:bold;color:#0EA5A2;">#${data.invoiceNumber}</p><p style="margin:0;font-size:11px;color:#64748B;">Date: ${data.invoiceDate}</p>${d.preparedBy ? `<p style="margin:2px 0 0 0;font-size:10px;color:#64748B;">Prepared By: ${d.preparedBy}</p>` : ''}</td></tr></table><table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:12px;border:1px solid #E2E8F0;background:#F8FAFC;border-collapse:collapse;"><tr><td style="vertical-align:middle;border-right:1px solid #E2E8F0;"><span style="font-size:10px;font-weight:bold;color:#64748B;text-transform:uppercase;margin-right:6px;">Status:</span>${paymentBadge}${typeBadge}</td><td style="text-align:right;vertical-align:middle;">${d.consultant ? `<span style="font-size:10px;font-weight:bold;color:#334155;margin-right:8px;">Consultant: ${d.consultant}</span>` : ''}${d.referredBy ? `<span style="font-size:10px;color:#64748B;">Referred By: ${d.referredBy}</span>` : ''}</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #E2E8F0;background:#F8FAFC;border-collapse:collapse;"><tr><td style="padding:8px 12px;vertical-align:top;border-right:1px solid #E2E8F0;width:33%;"><span style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#64748B;display:block;margin-bottom:2px;">Patient Name</span><span style="font-size:11px;color:#1E293B;font-weight:bold;display:block;">${p.name || '—'}</span></td><td style="padding:8px 12px;vertical-align:top;border-right:1px solid #E2E8F0;width:33%;"><span style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#64748B;display:block;margin-bottom:2px;">Age / Gender / Contact</span><span style="font-size:11px;color:#1E293B;font-weight:bold;display:block;">${p.age || '—'} / ${p.gender || '—'} · ${p.contact || '—'}</span></td><td style="padding:8px 12px;vertical-align:top;width:34%;"><span style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#64748B;display:block;margin-bottom:2px;">UHID / Payee</span><span style="font-size:11px;color:#1E293B;font-weight:bold;display:block;">${p.uhid || '—'}${p.payee ? ` (${p.payee})` : ''}</span></td></tr></table>${chargesRows ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;border-collapse:collapse;"><tr><td style="border-bottom:2px solid #0EA5A2;padding-bottom:4px;"><span style="font-size:12px;font-weight:bold;text-transform:uppercase;color:#0EA5A2;">Charges Breakdown</span></td></tr></table><table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:14px;border:1px solid #CBD5E1;border-collapse:collapse;"><thead><tr style="background:#F1F5F9;"><th style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:left;color:#475569;text-transform:uppercase;">Description</th><th style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:left;color:#475569;text-transform:uppercase;width:50px;">Code</th><th style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:right;color:#475569;text-transform:uppercase;width:35px;">Qty</th><th style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:right;color:#475569;text-transform:uppercase;width:65px;">Rate</th><th style="padding:6px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:right;color:#475569;text-transform:uppercase;width:70px;">Amount</th></tr></thead><tbody>${chargesRows}</tbody></table>` : ''}<table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:14px;border:1px solid #0EA5A2;background:#F0FDFC;border-collapse:collapse;"><tr><td style="width:60%;vertical-align:top;border-right:1px solid #CCFBF1;"><table width="100%" cellpadding="2" cellspacing="0"><tr><td style="font-size:10px;color:#64748B;">Payment Mode:</td><td style="font-size:10px;font-weight:bold;color:#1E293B;">${payment.mode || 'Cash'}</td></tr><tr><td style="font-size:10px;color:#64748B;">Subtotal:</td><td style="font-size:10px;font-weight:bold;color:#1E293B;">${currency(amounts.subtotal)}</td></tr>${Number(amounts.discount) > 0 ? `<tr><td style="font-size:10px;color:#EF4444;">Discount:</td><td style="font-size:10px;font-weight:bold;color:#EF4444;">- ${currency(amounts.discount)}</td></tr>` : ''}</table></td><td style="width:40%;vertical-align:top;"><table width="100%" cellpadding="2" cellspacing="0"><tr><td style="font-size:10px;color:#64748B;">Paid Amount:</td><td style="font-size:10px;font-weight:bold;text-align:right;color:#059669;">${currency(amounts.paid)}</td></tr><tr><td style="font-size:10px;color:#64748B;">Balance Due:</td><td style="font-size:10px;font-weight:bold;text-align:right;color:#D97706;">${currency(amounts.balance)}</td></tr><tr><td style="font-size:12px;font-weight:bold;color:#0EA5A2;padding-top:4px;border-top:1px solid #0EA5A2;">Total Amount:</td><td style="font-size:13px;font-weight:bold;text-align:right;color:#0EA5A2;padding-top:4px;border-top:1px solid #0EA5A2;">${currency(amounts.total)}</td></tr></table></td></tr></table>${paymentHistoryRows ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;border-collapse:collapse;"><tr><td style="border-bottom:2px solid #0EA5A2;padding-bottom:4px;"><span style="font-size:12px;font-weight:bold;text-transform:uppercase;color:#0EA5A2;">Payment History</span></td></tr></table><table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:14px;border:1px solid #CBD5E1;border-collapse:collapse;"><thead><tr style="background:#F1F5F9;"><th style="padding:5px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:left;color:#475569;text-transform:uppercase;">Date</th><th style="padding:5px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:left;color:#475569;text-transform:uppercase;">Mode</th><th style="padding:5px 8px;border:1px solid #CBD5E1;font-size:10px;text-align:right;color:#475569;text-transform:uppercase;">Amount</th></tr></thead><tbody>${paymentHistoryRows}</tbody></table>` : ''}${notesHtml}<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #E2E8F0;border-collapse:collapse;"><tr><td style="padding-top:8px;font-size:9px;color:#94A3B8;text-align:right;">Powered by SmartCare</td></tr></table></body></html>`;
}
