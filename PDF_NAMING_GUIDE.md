# 📄 PDF Naming Convention Guide

## Overview
This document explains how PDF files are named in the SmartCare PHR app for easy identification and organization.

---

## 📋 Invoice PDFs

### **Format:**
```
Bill_DDMmmYY_UHID.pdf
```

### **Components:**
1. **`Bill_`** - Fixed prefix indicating invoice/bill
2. **`DDMmmYY`** - Invoice date in Day-Month-Year format
   - `DD` = Day (01-31)
   - `Mmm` = Month (3-letter abbreviation: Jan, Feb, Mar, etc.)
   - `YY` = Year (last 2 digits)
3. **`UHID`** - Last 6 digits of patient's UHID (Unique Hospital ID)

### **Examples:**
| Invoice Details | PDF Name |
|----------------|----------|
| Patient UHID: SCD/250505<br>Invoice Date: 25-Jan-2026 | `Bill_25Jan26_250505.pdf` |
| Patient UHID: SCD/123456<br>Invoice Date: 01-Feb-2026 | `Bill_01Feb26_123456.pdf` |
| Patient UHID: SCD/789012<br>Invoice Date: 15-Dec-2025 | `Bill_15Dec25_789012.pdf` |

### **Key Points:**
✅ Date is from the **actual invoice**, not download date
✅ UHID last 6 digits ensure uniqueness
✅ Same patient can have multiple bills from different dates
✅ Easy to sort chronologically by date

---

## 🔬 Investigation PDFs

### **Format:**
```
TestName_DDMmmYY.pdf
```

### **Components:**
1. **`TestName`** - Short name of the investigation/test (max 20 chars)
   - Special characters removed
   - Examples: CBC, HbA1c, XRayChest, UrineRoutine
2. **`DDMmmYY`** - Test date in Day-Month-Year format
   - Uses requested/collected date from lab report
   - `DD` = Day (01-31)
   - `Mmm` = Month (3-letter abbreviation)
   - `YY` = Year (last 2 digits)

### **Examples:**
| Test Details | PDF Name |
|-------------|----------|
| Test: Complete Blood Count (CBC)<br>Date: 25-Jan-2026 | `CBC_25Jan26.pdf` |
| Test: HbA1c (Glycated Hemoglobin)<br>Date: 01-Feb-2026 | `HbA1c_01Feb26.pdf` |
| Test: X-Ray Chest PA View<br>Date: 15-Dec-2025 | `XRayChestPAView_15Dec25.pdf` |
| Test: Urine Routine & Microscopy<br>Date: 10-Mar-2026 | `UrineRoutineMicroscopy_10Mar26.pdf` |

### **Key Points:**
✅ Date is from the **test request/collection date**, not download date
✅ Test name is readable and identifies the investigation
✅ Multiple tests on same day will have same date (test name differentiates)
✅ Easy to find specific test reports

---

## 🎯 Why This Naming Convention?

### **Problems with Old Format:**
❌ Too long: `INVOICE_123456_SCD_250505011_1735123456789.pdf` (52 characters)
❌ Hard to read: Numbers and underscores everywhere
❌ Difficult to sort: Timestamp at end
❌ Not user-friendly when sharing

### **Benefits of New Format:**
✅ **Short & Clean:** 15-25 characters only
✅ **Human Readable:** Clear what it is at a glance
✅ **Sortable:** Files sort by date automatically
✅ **Unique:** Date + UHID prevents duplicates
✅ **Professional:** Medical standard naming
✅ **Share-Friendly:** Looks good in WhatsApp, Email, etc.

---

## 📂 File Organization

PDFs are saved in device storage:

**Invoices:**
```
/storage/emulated/0/Download/SmartCare/Invoices/
├── Bill_25Jan26_250505.pdf
├── Bill_15Jan26_250505.pdf
└── Bill_01Feb26_250505.pdf
```

**Investigations:**
```
/storage/emulated/0/Download/SmartCare/Investigation/
├── CBC_25Jan26.pdf
├── HbA1c_25Jan26.pdf
├── XRayChest_15Jan26.pdf
└── UrineRoutine_01Feb26.pdf
```

---

## 🔍 Quick Search Tips

**Find all bills for a patient (UHID 250505):**
- Search: `250505`
- Results: All bills with that UHID

**Find all reports from January 2026:**
- Search: `Jan26`
- Results: All documents from Jan 2026

**Find specific test (e.g., CBC):**
- Search: `CBC`
- Results: All CBC test reports

**Find specific date (e.g., 25th Jan):**
- Search: `25Jan`
- Results: All documents from 25th Jan (any year)

---

## 💻 Implementation Details

### **Invoice Date Source:**
```javascript
const invoiceDate = invoice?.invoiceDate || 
                   invoice?.invoice_date_time || 
                   invoice?.date;
```

### **Investigation Date Source:**
```javascript
const testDate = fullReport.requestedDate || 
                fullReport.collectedDate || 
                fullReport.dates?.requested || 
                fullReport.dates?.collected;
```

### **Date Formatting:**
```javascript
const dateObj = new Date(invoiceDate);
const day = String(dateObj.getDate()).padStart(2, '0');
const month = monthNames[dateObj.getMonth()]; // Jan, Feb, Mar...
const year = String(dateObj.getFullYear()).slice(-2);
const dateStr = `${day}${month}${year}`; // 25Jan26
```

### **UHID Extraction:**
```javascript
const uhidStr = String(uhid).replace(/[^0-9]/g, '');
const uhidLast6 = uhidStr.slice(-6).padStart(6, '0');
// SCD/250505 → 250505
```

### **Test Name Cleaning:**
```javascript
const testName = rawTestName
  .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
  .substring(0, 20);             // Max 20 chars
// "Complete Blood Count (CBC)" → "CompleteBloodCountCBC"
```

---

## 📝 Change Log

| Date | Change | Reason |
|------|--------|--------|
| 22-Sep-2026 | Changed from timestamp to actual document date | Users need to know when invoice/test was done, not when downloaded |
| 22-Sep-2026 | Added detailed console logging | Better debugging and user understanding |
| 22-Sep-2026 | Created this guide | Document the naming convention for developers |

---

## 🤝 User Experience

**Before (Download Day: 22-Sep-2026):**
- Invoice from 25-Jan-2026 → `INVOICE_123456_250505_1727020800000.pdf`
- Downloaded again on 23-Sep-2026 → Different name!
- Confusing: "Which one is newer?"

**After:**
- Invoice from 25-Jan-2026 → `Bill_25Jan26_250505.pdf`
- Downloaded again anytime → Same name!
- Clear: "This is the bill from 25th January for patient 250505"

---

## 🎓 For New Developers

### **Where to Find the Code:**

**Invoice Naming:**
- File: `src/screens/Invoices/InvoiceDetailScreen.jsx`
- Search for: `formTitle = `Bill_`

**Investigation Naming:**
- File: `src/screens/Investigations/InvestigationReportScreen.jsx`
- Search for: `formTitle = `${testName}_`

**To Change the Format:**
1. Locate the `formTitle` assignment
2. Modify the string template
3. Test with various dates and UHIDs
4. Update this guide!

---

## ✅ Testing Checklist

When testing PDF naming, verify:

- [ ] Invoice shows correct invoice date (not today)
- [ ] Investigation shows correct test date (not today)
- [ ] UHID extracted correctly (last 6 digits)
- [ ] Special characters removed from test names
- [ ] Date formatted as DDMmmYY (e.g., 25Jan26)
- [ ] File saves with correct name
- [ ] Multiple downloads produce same filename
- [ ] Files sort correctly by date

---

**Last Updated:** 22-Sep-2026  
**Maintained By:** SmartCare PHR Development Team
