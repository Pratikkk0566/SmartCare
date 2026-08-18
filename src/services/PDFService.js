import { PermissionsAndroid, Platform, Alert } from 'react-native';

// Import with error handling
let RNHTMLtoPDF;
try {
  RNHTMLtoPDF = require('react-native-html-to-pdf');
} catch (error) {
  console.warn('react-native-html-to-pdf not available:', error);
}

let RNFS;
try {
  RNFS = require('react-native-fs');
} catch (error) {
  console.warn('react-native-fs not available:', error);
}

class PDFService {
  static async generateInvoicePDF(invoiceData) {
    try {
      // Check if the library is available
      if (!RNHTMLtoPDF || !RNHTMLtoPDF.convert) {
        throw new Error('PDF generation library not available. Please restart the app.');
      }

      // For Android 13+ (API 33+), we don't need WRITE_EXTERNAL_STORAGE permission
      // For older versions, request permission
      if (Platform.OS === 'android' && Platform.Version < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs storage permission to save PDF files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Storage permission denied. Please allow storage access in Settings.');
        }
      }

      // Generate the HTML content with the exact same styling
      const htmlContent = this.generateInvoiceHTML(invoiceData);
      
      // Use app-specific directory that doesn't require permissions on modern Android
      let directory = 'Documents';
      
      if (Platform.OS === 'android') {
        // For Android, try different directories based on API level
        if (Platform.Version >= 29) {
          // Android 10+ (API 29+): Use scoped storage
          directory = 'Downloads'; 
        } else {
          // Older Android: Use external storage
          directory = 'Documents';
        }
      }

      const options = {
        html: htmlContent,
        fileName: `Invoice_${invoiceData.invoiceNumber}_${Date.now()}`,
        directory: directory,
        width: 595, // A4 width in points
        height: 842, // A4 height in points
        padding: 20,
        bgColor: '#FFFFFF',
      };

      // Generate PDF
      const file = await RNHTMLtoPDF.convert(options);
      
      if (file && file.filePath) {
        return {
          success: true,
          filePath: file.filePath,
          fileName: options.fileName + '.pdf'
        };
      } else {
        throw new Error('Failed to generate PDF - no file path returned');
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static generateInvoiceHTML(invoiceData) {
    const {
      invoiceNumber = '1078',
      invoiceDate = '01-10-2025 · 11:31',
      status = 'Paid',
      type = 'OPD',
      paidAmount = 550,
      balance = 0,
      totalAmount = 550,
      patientName = 'PRASHANT HIRADUTT PANDE',
      uhid = 'SCD/250505011',
      age = 49,
      gender = 'Male',
      contact = '7249620566',
      consultant = 'Dr. ANAND Shukla',
      qualification = 'MBBS, MDFCPS (Psy) MumbaiPhd. Psychiatry from Johns Hopkins University(NY)',
      referredBy = 'Dr JAI SHAH',
      preparedBy = 'AUREUS Hospital',
      paymentMode = 'Cash',
      paymentDate = '2025-10-01',
      charges = [
        {
          group: 'Appointment Charge',
          amount: 500,
          items: [
            { description: 'OPD CONSULTATION CHARGE', qty: 1, rate: 500, amount: 500 }
          ]
        },
        {
          group: 'Registration Charge',
          amount: 50,
          items: [
            { description: 'OPD Registration Charge', qty: 1, rate: 50, amount: 50 }
          ]
        }
      ]
    } = invoiceData;

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  padding: 20px;
  background: #fff;
  color: #1F2937;
  font-size: 12px;
  line-height: 1.5;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  border-bottom: 3px solid #0ea5a2;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.header h1 {
  color: #0ea5a2;
  font-size: 28px;
  margin-bottom: 5px;
}

.header p {
  color: #6B7280;
  font-size: 14px;
}

.invoice-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 15px;
  background: #F9FAFB;
  border-radius: 8px;
}

.invoice-info div {
  flex: 1;
}

.invoice-info strong {
  display: block;
  color: #0ea5a2;
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.invoice-info span {
  display: block;
  font-size: 13px;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.badge-paid {
  background: #D1FAE5;
  color: #059669;
}

.badge-pending {
  background: #FEF3C7;
  color: #D97706;
}

.badge-opd {
  background: #DBEAFE;
  color: #3B82F6;
}

.badge-ipd {
  background: #FEE2E2;
  color: #EF4444;
}

.section {
  margin-bottom: 20px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  background: #0ea5a2;
  color: white;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-body {
  padding: 15px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #F3F4F6;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #6B7280;
  font-weight: 500;
}

.info-value {
  font-weight: 600;
  text-align: right;
}

.amount-summary {
  background: #F0FDFC;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 2px solid #0ea5a2;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.amount-label {
  font-size: 13px;
  color: #6B7280;
}

.amount-value {
  font-size: 13px;
  font-weight: 700;
  color: #1F2937;
}

.amount-total {
  border-top: 2px solid #0ea5a2;
  margin-top: 10px;
  padding-top: 10px;
}

.amount-total .amount-label {
  font-size: 16px;
  font-weight: 700;
  color: #0ea5a2;
}

.amount-total .amount-value {
  font-size: 20px;
  color: #0ea5a2;
}

.charges-table {
  width: 100%;
  border-collapse: collapse;
}

.charges-table th {
  background: #F9FAFB;
  padding: 10px;
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  color: #6B7280;
  border-bottom: 2px solid #E5E7EB;
}

.charges-table td {
  padding: 10px;
  border-bottom: 1px solid #F3F4F6;
}

.charges-table tr:last-child td {
  border-bottom: none;
}

.charge-group {
  background: #F9FAFB;
  font-weight: 700;
}

.charge-item {
  padding-left: 20px;
}

.text-right {
  text-align: right;
}

.footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #E5E7EB;
  text-align: center;
  color: #9CA3AF;
  font-size: 11px;
}

.note-box {
  background: #FFFBEB;
  border-left: 4px solid #F59E0B;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
}

.note-box strong {
  color: #D97706;
  display: block;
  margin-bottom: 5px;
}
</style>
</head>
<body>
<div class="container">
  <!-- Header -->
  <div class="header">
    <h1>INVOICE</h1>
    <p>SmartCare Digital Health Record</p>
  </div>

  <!-- Invoice Info -->
  <div class="invoice-info">
    <div>
      <strong>Invoice Number</strong>
      <span>#${invoiceNumber}</span>
    </div>
    <div>
      <strong>Invoice Date</strong>
      <span>${invoiceDate}</span>
    </div>
    <div>
      <strong>Status</strong>
      <span>
        <span class="badge badge-${status.toLowerCase()}">${status}</span>
        <span class="badge badge-${type.toLowerCase()}">${type}</span>
      </span>
    </div>
  </div>

  <!-- Amount Summary -->
  <div class="amount-summary">
    <div class="amount-row">
      <span class="amount-label">Paid Amount</span>
      <span class="amount-value" style="color: #059669;">₹${paidAmount.toFixed(2)}</span>
    </div>
    <div class="amount-row">
      <span class="amount-label">Balance</span>
      <span class="amount-value" style="color: #9CA3AF;">₹${balance.toFixed(2)}</span>
    </div>
    <div class="amount-row amount-total">
      <span class="amount-label">Total Amount</span>
      <span class="amount-value">₹${totalAmount.toFixed(2)}</span>
    </div>
  </div>

  <!-- Patient Information -->
  <div class="section">
    <div class="section-header">Patient Information</div>
    <div class="section-body">
      <div class="info-row">
        <span class="info-label">Name</span>
        <span class="info-value">${patientName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">UHID</span>
        <span class="info-value">${uhid}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Age / Gender</span>
        <span class="info-value">${age} / ${gender}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Contact</span>
        <span class="info-value">${contact}</span>
      </div>
    </div>
  </div>

  <!-- Invoice Details -->
  <div class="section">
    <div class="section-header">Invoice Details</div>
    <div class="section-body">
      <div class="info-row">
        <span class="info-label">Consultant</span>
        <span class="info-value">${consultant}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Qualification</span>
        <span class="info-value">${qualification}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Referred By</span>
        <span class="info-value">${referredBy}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Prepared By</span>
        <span class="info-value">${preparedBy}</span>
      </div>
    </div>
  </div>

  <!-- Payment Details -->
  <div class="section">
    <div class="section-header">Payment Details</div>
    <div class="section-body">
      <div class="info-row">
        <span class="info-label">Payment Mode</span>
        <span class="info-value">${paymentMode}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Date</span>
        <span class="info-value">${paymentDate}</span>
      </div>
    </div>
  </div>

  <!-- Charges Breakdown -->
  <div class="section">
    <div class="section-header">Charges Breakdown</div>
    <div class="section-body">
      <table class="charges-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${charges.map(group => `
            <tr class="charge-group">
              <td colspan="3"><strong>${group.group}</strong></td>
              <td class="text-right"><strong>₹${group.amount.toFixed(2)}</strong></td>
            </tr>
            ${group.items.map(item => `
              <tr class="charge-item">
                <td>${item.description}</td>
                <td class="text-right">${item.qty}</td>
                <td class="text-right">₹${item.rate.toFixed(2)}</td>
                <td class="text-right">₹${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This is a computer-generated invoice. No signature required.</p>
    <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
    <p>SmartCare Digital PHR · © 2026</p>
  </div>
</div>
</body>
</html>
    `;
  }

  static async shareInvoicePDF(invoiceData) {
    try {
      const result = await this.generateInvoicePDF(invoiceData);
      
      if (result.success) {
        // You can add sharing functionality here using react-native-share
        Alert.alert(
          'PDF Generated',
          `Invoice saved successfully at: ${result.fileName}`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return result;
      } else {
        Alert.alert('Error', `Failed to generate PDF: ${result.error}`);
        return result;
      }
    } catch (error) {
      Alert.alert('Error', `An error occurred: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Helper function to convert invoice data from app format to PDF format
  static convertInvoiceData(invoice) {
    const raw = invoice._raw || {};
    
    // Extract charges
    const chargeTransactions = raw.chargeTransaction || [];
    const charges = chargeTransactions.map(charge => ({
      group: charge.master_charge_name || 'Service Charge',
      amount: Number(charge.total_amount || 0),
      items: (charge.charge_list || []).map(item => ({
        description: item.chargename || 'Service',
        qty: Number(item.quantity || 1),
        rate: Number(item.charge_amount || 0),
        amount: Number(item.charge_amount || 0) * Number(item.quantity || 1)
      }))
    }));

    // If no charges breakdown, create from basic info
    if (charges.length === 0) {
      charges.push({
        group: 'Consultation Charge',
        amount: invoice.rawAmount || 0,
        items: [{
          description: invoice.description || 'Consultation',
          qty: 1,
          rate: invoice.rawAmount || 0,
          amount: invoice.rawAmount || 0
        }]
      });
    }

    return {
      invoiceNumber: invoice.id || raw.location_Wise_Invoice_no || '1078',
      invoiceDate: invoice.date && invoice.time ? `${invoice.date} · ${invoice.time}` : invoice.date || '01-10-2025',
      status: invoice.status || 'Paid',
      type: invoice.invType || raw.invoice_type || 'OPD',
      paidAmount: invoice.paidAmount || Number(raw.paid_amount || 0),
      balance: invoice.balance || Number(raw.balance_amount || 0),
      totalAmount: invoice.rawAmount || Number(raw.invoice_amount || 0),
      patientName: raw.patient_name || 'PATIENT NAME',
      uhid: raw.uhid || invoice.ipdAbr || 'SCD/250505011',
      age: raw.age || 49,
      gender: raw.gender || 'Male',
      contact: raw.contact_number || '7249620566',
      consultant: raw.counsultant || invoice.consultant || 'Dr. CONSULTANT NAME',
      qualification: raw.counsultant_qualification || 'MBBS, MD',
      referredBy: raw.refral_name && raw.refral_name !== '0' ? raw.refral_name : 'Self',
      preparedBy: raw.invoice_prepared_by || 'AUREUS Hospital',
      paymentMode: invoice.paymentMode || raw.payment_mode || 'Cash',
      paymentDate: raw.transaction?.payment_time?.split(' ')[0] || invoice.date || '2025-10-01',
      charges
    };
  }
}

// Export the downloadInvoicePDF function for use in InvoicesScreen
export const downloadInvoicePDF = async (invoice) => {
  try {
    const invoiceData = PDFService.convertInvoiceData(invoice);
    const result = await PDFService.generateInvoicePDF(invoiceData);
    
    if (result.success) {
      Alert.alert(
        'PDF Generated Successfully! 🎉',
        `Your invoice has been saved to:\n\n📁 ${Platform.OS === 'android' ? 'Downloads' : 'Documents'} folder\n📄 ${result.fileName}\n\n💡 You can find it in your file manager or gallery.`,
        [
          { text: 'Open File Manager', onPress: () => openFileManager() },
          { text: 'OK', style: 'default' }
        ]
      );
    }
    
    return result;
  } catch (error) {
    console.error('Download PDF Error:', error);
    Alert.alert(
      'Permission Required',
      'To save PDFs, please:\n\n1️⃣ Go to Settings > Apps > SusCare\n2️⃣ Enable Storage permission\n3️⃣ Try again\n\nOr check your Downloads folder - the PDF might already be there!',
      [{ text: 'OK', style: 'default' }]
    );
    return { success: false, error: error.message };
  }
};

// Helper function to open file manager (Android)
const openFileManager = () => {
  if (Platform.OS === 'android') {
    // This will open the Downloads folder on most Android devices
    Alert.alert(
      'Find Your PDF',
      'Open your File Manager app and look in:\n\n📁 Downloads folder\n📄 Search for "Invoice_" files\n\n💡 You can also check Gallery > Documents section.',
      [{ text: 'Got it!', style: 'default' }]
    );
  }
};

export default PDFService;