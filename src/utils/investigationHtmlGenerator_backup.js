/**
 * Generates self-contained, XHTML-compliant HTML for an Investigation / Lab Report.
 * Same look as the invoice template (teal banner, status row, cards, teal footer panel)
 * and the same Flying Saucer / OpenHTMLtoPDF (XHTML 1.0 Transitional) rules:
 *
 *  - NO flexbox. Layout uses only display:table / table-cell and normal block flow.
 *  - Horizontal padding is applied to table CELLS, and blocks with padding do NOT
 *    set width:100% (Flying Saucer ignores box-sizing, so that would overflow).
 *  - Every tag is closed, every attribute quoted, everything is escaped with escapeXml().
 *
 * Works with the raw API response ({ data: {...}, status_code, ... }) or just the
 * inner `data` object.
 *
 * No images are used anywhere (signatures print as a blank space plus the verifier name),
 * and no decorative symbols are printed: only plain words, numbers and colons.
 */

// Extra findings that only some report types fill in (microbiology / culture etc.).
// Only non-empty ones are printed, so normal numeric reports never show this section.
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
  if (!raw) return '';
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

function isMeaningful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return false;
  const s = String(value).trim();
  if (s === '' || s === '-' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return false;
  return true;
}

function ageText(rec) {
  const a = rec.patientAge ?? rec.age;
  return isMeaningful(a) ? `${String(a).trim()} Yrs` : '';
}

const NUM = '(-?\\d+(?:\\.\\d+)?)';

// Picks the low/high bounds out of a reference-range string. Handles:
//   "4000-10000", "11.5 - 14.5", "40 to 75"
//   "Male: 40 to 50 Female: 36 to 45"  (picked by patient gender)
// Anything more complicated returns null and the value is simply not flagged.
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

export function generateInvestigationHtml(rawOrMappedData) {
  const rawRecord = rawOrMappedData?._raw ? rawOrMappedData._raw : rawOrMappedData;
  const mapped = mapInvestigationRecord(rawRecord);
  const serializedRecord = JSON.stringify(rawRecord || {}).replace(/\]\]>/g, ']]]]><![CDATA[>');

  const data = mapped || {};
  const p = data.patient || {};
  const dates = data.dates || {};

  // ---------- status row ----------
  const statusBadgeHtml =
    data.status === 'approved'
      ? '<span class="badge badge-paid">Approved</span>'
      : data.status === 'completed'
        ? '<span class="badge badge-completed">Completed</span>'
        : '<span class="badge badge-pending">Pending</span>';

  const urgentBadgeHtml = data.urgent ? '<span class="badge badge-urgent">Urgent</span>' : '';
  const typeBadgeHtml = p.type ? `<span class="badge badge-payee">${escapeXml(p.type)}</span>` : '';

  // ---------- generic 2-per-row key/value grid (same as invoice patient card) ----------
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

  // ---------- antibiotic sensitivity (culture reports) ----------
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

    /* ===== Banner (padding on cells, not on the table) ===== */
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

    /* ===== Status row (padding on cells) ===== */
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

    /* ===== Content ===== */
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

    /* ===== key / value grid ===== */
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
      white-space: pre-line;
      vertical-align: top;
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

    /* ===== Results / generic tables ===== */
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

    /* ===== Notes ===== */
    .note-box {
      background: #FFFBEB;
      border-left: 3px solid #F59E0B;
      padding: 8px 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 10px;
    }
    .note-box strong { color: #D97706; display: block; margin-bottom: 2px; }

    /* ===== Signatures ===== */
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

    /* ===== Teal end-of-report panel ===== */
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
        <!-- Patient Information -->
        <div class="section section-patient">
          <div class="card-title">Patient Information</div>
          <div id="patientInfoBody">
            ${patientInfoHtml}
          </div>
        </div>

        <!-- Sample / Report Details -->
        <div class="section ${sampleRows.length ? '' : 'hidden'}">
          <div class="card-title">Report Details</div>
          <div id="sampleInfoBody">
            ${sampleInfoHtml}
          </div>
        </div>

        <!-- Test Results: the one section allowed to flow across pages -->
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

        <!-- Antibiotic sensitivity (culture reports only) -->
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

        <!-- Other findings (microbiology / culture fields, only when filled) -->
        <div class="section ${findingsHtml ? '' : 'hidden'}">
          <div class="card-title">Findings</div>
          ${findingsHtml}
        </div>

        <div id="notesContainer">
          ${notesHtml}
        </div>

        <!-- Signatures -->
        <div class="sign-panel ${signaturesHtml || reportedByLine ? '' : 'hidden'}">
          ${signaturesHtml}
          ${reportedByLine ? `<div class="reported-by">${reportedByLine}</div>` : ''}
        </div>

        <div class="end-panel">End of Report</div>
      </div>

      <!-- Footer -->
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
