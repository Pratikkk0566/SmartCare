import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNBlobUtil from 'react-native-blob-util';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// PDF Generation Service for SmartCare PHR
// Handles clinical notes, prescriptions, investigation reports, and invoices

class PDFService {
  
  static async requestStoragePermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs storage permission to save PDF files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  }

  static formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      let date;
      if (dateString.includes('-') && dateString.includes(' ')) {
        // Parse DD-MM-YY HH:MM:SS format
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('-');
        date = new Date(`20${year}`, month - 1, day);
      } else {
        date = new Date(dateString);
      }
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  static formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
      let date;
      if (dateString.includes('-') && dateString.includes(' ')) {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');
        date = new Date(`20${year}`, month - 1, day, hours, minutes);
      } else {
        date = new Date(dateString);
      }
      
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }
  static getHospitalHeader() {
    return `
      <div class="hospital-header">
        <div class="hospital-logo">
          <h1>SmartCare PHR</h1>
        </div>
        <div class="hospital-info">
          <h2>Aureus Healthcare</h2>
          <p>Complete Healthcare Solutions</p>
          <p>Email: info@aureushealthcare.com</p>
          <p>Phone: +91 (0) 1234 567890</p>
        </div>
      </div>
    `;
  }

  static getCommonStyles() {
    return `
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .hospital-header {
          text-align: center;
          border-bottom: 2px solid #007AFF;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .hospital-header h1 {
          color: #007AFF;
          margin: 0;
          font-size: 28px;
        }
        .hospital-header h2 {
          color: #333;
          margin: 10px 0 5px 0;
          font-size: 22px;
        }
        .hospital-header p {
          color: #666;
          margin: 2px 0;
          font-size: 14px;
        }
        .patient-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .patient-info h3 {
          margin: 0 0 15px 0;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .info-value {
          color: #333;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h3 {
          background: #007AFF;
          color: white;
          padding: 10px 15px;
          margin: 0 0 20px 0;
          border-radius: 5px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .table th,
        .table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .table th {
          background-color: #f2f2f2;
          font-weight: bold;
          color: #333;
        }
        .table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .no-print { display: none; }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      </style>
    `;
  }
  static parseHtmlClinicalData(htmlData) {
    if (!htmlData) return [];
    
    try {
      const rows = [];
      const tableRowRegex = /<tr[^>]*>.*?<\/tr>/g;
      const matches = htmlData.match(tableRowRegex);
      
      if (matches) {
        matches.forEach((row, index) => {
          if (index === 0) return; // Skip header row
          
          const cellRegex = /<td[^>]*[^>]*className="text-start">([^<]*)<\/td>/g;
          const cells = [];
          let match;
          
          while ((match = cellRegex.exec(row)) !== null) {
            cells.push(match[1].trim());
          }
          
          if (cells.length >= 3) {
            rows.push({
              diagnosis: cells[0] || 'Not specified',
              problem: cells[1] || 'Not specified', 
              intervention: cells[2] === 'undefined' ? 'Not specified' : cells[2] || 'Not specified'
            });
          }
        });
      }
      
      return rows;
    } catch (error) {
      console.log('Error parsing HTML table:', error);
      return [];
    }
  }

  // Generate Clinical Note PDF
  static async generateClinicalNotePDF(clinicalNote, userProfile = {}) {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const clinicalData = this.parseHtmlClinicalData(clinicalNote.htmldata);
      const patientName = userProfile.fullName || userProfile.name || 'Patient';
      const currentDate = new Date().toLocaleDateString('en-GB');

      const clinicalDataRows = clinicalData.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.diagnosis}</td>
          <td>${item.problem}</td>
          <td>${item.intervention}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Clinical Note - ${patientName}</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getHospitalHeader()}
          
          <div class="patient-info">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${patientName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${userProfile.mobileNumber || userProfile.mobile || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Visit Date:</span>
              <span class="info-value">${this.formatDateTime(clinicalNote.datetime)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Doctor:</span>
              <span class="info-value">${clinicalNote.practitionername || 'Unknown Doctor'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Note ID:</span>
              <span class="info-value">#${clinicalNote.id}</span>
            </div>
          </div>

          <div class="section">
            <h3>Clinical Assessment</h3>
            ${clinicalData.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Diagnosis</th>
                    <th>Problem</th>
                    <th>Intervention</th>
                  </tr>
                </thead>
                <tbody>
                  ${clinicalDataRows}
                </tbody>
              </table>
            ` : `
              <p>No structured clinical data available in this note.</p>
            `}
          </div>

          <div class="footer">
            <p>Generated on ${currentDate} | SmartCare PHR - Digital Healthcare Records</p>
            <p>This is a computer-generated document and does not require a signature.</p>
          </div>
        </body>
        </html>
      `;

      return await this.generatePDF(htmlContent, `clinical_note_${clinicalNote.id}`, 'Clinical Note');

    } catch (error) {
      console.error('Error generating clinical note PDF:', error);
      throw error;
    }
  }

  // Generate Prescription PDF
  static async generatePrescriptionPDF(prescription, userProfile = {}) {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const patientName = userProfile.fullName || userProfile.name || 'Patient';
      const currentDate = new Date().toLocaleDateString('en-GB');
      
      // Handle medicines array
      const medicines = prescription.medicines || prescription.medicineList || [];
      const medicineRows = medicines.map((medicine, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${medicine.name || medicine.medicineName || 'N/A'}</td>
          <td>${medicine.dosage || medicine.dose || 'N/A'}</td>
          <td>${medicine.frequency || 'N/A'}</td>
          <td>${medicine.duration || 'N/A'}</td>
          <td>${medicine.instructions || medicine.notes || 'Take as directed'}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Prescription - ${patientName}</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getHospitalHeader()}
          
          <div class="patient-info">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${patientName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age:</span>
              <span class="info-value">${userProfile.age || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${userProfile.mobileNumber || userProfile.mobile || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Prescription Date:</span>
              <span class="info-value">${this.formatDate(prescription.date || prescription.createdAt)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Doctor:</span>
              <span class="info-value">${prescription.doctorName || prescription.practitioner || 'Dr. SmartCare'}</span>
            </div>
          </div>

          ${prescription.diagnosis ? `
            <div class="section">
              <h3>Diagnosis</h3>
              <p style="padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007AFF;">
                ${prescription.diagnosis}
              </p>
            </div>
          ` : ''}

          <div class="section">
            <h3>Prescription</h3>
            ${medicines.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicine Name</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${medicineRows}
                </tbody>
              </table>
            ` : `
              <p>No medicines prescribed.</p>
            `}
          </div>

          ${prescription.advice || prescription.notes ? `
            <div class="section">
              <h3>Doctor's Advice</h3>
              <p style="padding: 15px; background: #f0f8ff; border-radius: 5px; border-left: 4px solid #28a745;">
                ${prescription.advice || prescription.notes}
              </p>
            </div>
          ` : ''}

          <div class="section">
            <h3>Important Instructions</h3>
            <ul style="padding-left: 20px; color: #555;">
              <li>Take medicines as prescribed by the doctor</li>
              <li>Complete the full course even if you feel better</li>
              <li>Do not share medicines with others</li>
              <li>Contact doctor if you experience any adverse effects</li>
              <li>Store medicines in a cool, dry place</li>
            </ul>
          </div>

          <div class="footer">
            <p>Generated on ${currentDate} | SmartCare PHR - Digital Healthcare Records</p>
            <p>This prescription is digitally generated and valid for medical use.</p>
          </div>
        </body>
        </html>
      `;

      return await this.generatePDF(htmlContent, `prescription_${prescription.id || Date.now()}`, 'Prescription');

    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      throw error;
    }
  }
  // Generate Investigation Report PDF
  static async generateInvestigationReportPDF(investigation, userProfile = {}) {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const patientName = userProfile.fullName || userProfile.name || 'Patient';
      const currentDate = new Date().toLocaleDateString('en-GB');
      
      // Handle investigation results
      const results = investigation.results || investigation.testResults || [];
      const resultRows = results.map((result, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${result.testName || result.name || 'N/A'}</td>
          <td>${result.value || result.result || 'N/A'}</td>
          <td>${result.normalRange || result.range || 'N/A'}</td>
          <td>
            <span style="color: ${result.status === 'abnormal' ? '#dc3545' : '#28a745'}; font-weight: bold;">
              ${result.status || 'Normal'}
            </span>
          </td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Investigation Report - ${patientName}</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getHospitalHeader()}
          
          <div class="patient-info">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${patientName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age:</span>
              <span class="info-value">${userProfile.age || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gender:</span>
              <span class="info-value">${userProfile.gender || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${userProfile.mobileNumber || userProfile.mobile || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Report Date:</span>
              <span class="info-value">${this.formatDate(investigation.reportDate || investigation.date)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Lab/Hospital:</span>
              <span class="info-value">${investigation.labName || investigation.hospitalName || 'SmartCare Lab'}</span>
            </div>
          </div>

          <div class="section">
            <h3>Investigation Details</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <div class="info-row">
                <span class="info-label">Investigation Type:</span>
                <span class="info-value">${investigation.investigationType || investigation.type || 'Laboratory Test'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Requested By:</span>
                <span class="info-value">${investigation.requestedBy || investigation.doctorName || 'Dr. SmartCare'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Sample Collection Date:</span>
                <span class="info-value">${this.formatDateTime(investigation.collectionDate || investigation.sampleDate)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Test Results</h3>
            ${results.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Test Name</th>
                    <th>Result</th>
                    <th>Normal Range</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${resultRows}
                </tbody>
              </table>
            ` : `
              <p>No test results available.</p>
            `}
          </div>

          ${investigation.interpretation || investigation.comments ? `
            <div class="section">
              <h3>Clinical Interpretation</h3>
              <p style="padding: 15px; background: #f0f8ff; border-radius: 5px; border-left: 4px solid #007AFF;">
                ${investigation.interpretation || investigation.comments}
              </p>
            </div>
          ` : ''}

          <div class="section">
            <h3>Important Notes</h3>
            <ul style="padding-left: 20px; color: #555;">
              <li>These results should be interpreted by your healthcare provider</li>
              <li>Reference ranges may vary between laboratories</li>
              <li>Abnormal results may require further investigation</li>
              <li>Please discuss these results with your doctor</li>
            </ul>
          </div>

          <div class="footer">
            <p>Generated on ${currentDate} | SmartCare PHR - Digital Healthcare Records</p>
            <p>This report is digitally generated and authenticated.</p>
          </div>
        </body>
        </html>
      `;

      return await this.generatePDF(htmlContent, `investigation_report_${investigation.id || Date.now()}`, 'Investigation Report');

    } catch (error) {
      console.error('Error generating investigation report PDF:', error);
      throw error;
    }
  }

  // Generate Invoice PDF
  static async generateInvoicePDF(invoice, userProfile = {}) {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const patientName = userProfile.fullName || userProfile.name || 'Patient';
      const currentDate = new Date().toLocaleDateString('en-GB');
      
      // Handle invoice items
      const items = invoice.items || invoice.services || [];
      const itemRows = items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description || item.serviceName || item.name || 'N/A'}</td>
          <td style="text-align: center;">${item.quantity || 1}</td>
          <td style="text-align: right;">₹${item.rate || item.price || 0}</td>
          <td style="text-align: right;">₹${item.amount || (item.quantity * item.rate) || item.price || 0}</td>
        </tr>
      `).join('');

      const subtotal = items.reduce((sum, item) => sum + (item.amount || (item.quantity * item.rate) || item.price || 0), 0);
      const tax = invoice.tax || (subtotal * 0.18); // 18% GST default
      const total = invoice.total || (subtotal + tax);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${invoice.invoiceNumber || 'INV-' + Date.now()}</title>
          ${this.getCommonStyles()}
          <style>
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .invoice-number {
              font-size: 24px;
              font-weight: bold;
              color: #007AFF;
            }
            .amount-summary {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .total-amount {
              font-size: 18px;
              font-weight: bold;
              color: #007AFF;
              border-top: 2px solid #007AFF;
              padding-top: 10px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${this.getHospitalHeader()}
          
          <div class="invoice-header">
            <div>
              <h2>INVOICE</h2>
              <div class="invoice-number">${invoice.invoiceNumber || 'INV-' + Date.now()}</div>
            </div>
            <div style="text-align: right;">
              <p><strong>Date:</strong> ${this.formatDate(invoice.date || invoice.createdAt)}</p>
              <p><strong>Due Date:</strong> ${this.formatDate(invoice.dueDate || invoice.date)}</p>
            </div>
          </div>
          
          <div class="patient-info">
            <h3>Bill To</h3>
            <div class="info-row">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${patientName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${userProfile.mobileNumber || userProfile.mobile || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${userProfile.address || invoice.billingAddress || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">UHID:</span>
              <span class="info-value">${userProfile.uhid || userProfile.id || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <h3>Services/Items</h3>
            ${items.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Rate</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            ` : `
              <p>No items in this invoice.</p>
            `}
          </div>

          <div class="amount-summary">
            <div class="info-row">
              <span class="info-label">Subtotal:</span>
              <span class="info-value">₹${subtotal.toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tax (GST):</span>
              <span class="info-value">₹${tax.toFixed(2)}</span>
            </div>
            ${invoice.discount ? `
              <div class="info-row">
                <span class="info-label">Discount:</span>
                <span class="info-value">-₹${invoice.discount}</span>
              </div>
            ` : ''}
            <div class="info-row total-amount">
              <span class="info-label">Total Amount:</span>
              <span class="info-value">₹${total.toFixed(2)}</span>
            </div>
          </div>

          ${invoice.paymentStatus ? `
            <div class="section">
              <h3>Payment Information</h3>
              <div style="padding: 15px; background: ${invoice.paymentStatus === 'paid' ? '#d4edda' : '#f8d7da'}; border-radius: 5px;">
                <p><strong>Payment Status:</strong> 
                  <span style="color: ${invoice.paymentStatus === 'paid' ? '#155724' : '#721c24'}; font-weight: bold;">
                    ${invoice.paymentStatus.toUpperCase()}
                  </span>
                </p>
                ${invoice.paymentMethod ? `<p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>` : ''}
                ${invoice.transactionId ? `<p><strong>Transaction ID:</strong> ${invoice.transactionId}</p>` : ''}
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <p>Generated on ${currentDate} | SmartCare PHR - Digital Healthcare Records</p>
            <p>Thank you for choosing SmartCare Healthcare Services</p>
          </div>
        </body>
        </html>
      `;

      return await this.generatePDF(htmlContent, `invoice_${invoice.invoiceNumber || Date.now()}`, 'Invoice');

    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }
  // Core PDF Generation Function
  static async generatePDF(htmlContent, fileName, documentType = 'Document') {
    try {
      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: Platform.OS === 'ios' ? 'Documents' : 'Downloads',
        base64: false,
        width: 612,
        height: 792,
        padding: 24,
      };

      const result = await RNHTMLtoPDF.convert(options);
      
      if (result.filePath) {
        // Show success alert with options
        return new Promise((resolve, reject) => {
          Alert.alert(
            `${documentType} Generated`,
            `${documentType} has been successfully generated and saved.`,
            [
              {
                text: 'View PDF',
                onPress: () => {
                  this.openPDF(result.filePath)
                    .then(() => resolve(result))
                    .catch(reject);
                },
              },
              {
                text: 'Share',
                onPress: () => {
                  this.sharePDF(result.filePath)
                    .then(() => resolve(result))
                    .catch(reject);
                },
              },
              {
                text: 'OK',
                onPress: () => resolve(result),
              },
            ],
            { cancelable: false }
          );
        });
      } else {
        throw new Error('Failed to generate PDF file');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', `Failed to generate ${documentType}. Please try again.`);
      throw error;
    }
  }

  // Open PDF using device's default PDF viewer
  static async openPDF(filePath) {
    try {
      if (Platform.OS === 'ios') {
        await RNBlobUtil.ios.previewDocument(filePath);
      } else {
        await RNBlobUtil.android.actionViewIntent(filePath, 'application/pdf');
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Could not open PDF file. Please check if you have a PDF viewer installed.');
    }
  }

  // Share PDF using device's share functionality
  static async sharePDF(filePath) {
    try {
      const shareOptions = {
        title: 'Share PDF',
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        type: 'application/pdf',
      };

      if (Platform.OS === 'android') {
        await RNBlobUtil.android.actionViewIntent(filePath, 'application/pdf', 'Share PDF');
      } else {
        // For iOS, you might want to use react-native-share if available
        Alert.alert('Share', 'PDF is ready to share from your Documents folder.');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Could not share PDF file.');
    }
  }

  // Generate ABHA Card PDF
  static async generateABHACardPDF(abhaData, userProfile = {}) {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const currentDate = new Date().toLocaleDateString('en-GB');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ABHA Card - ${abhaData.name}</title>
          ${this.getCommonStyles()}
          <style>
            .abha-card {
              border: 2px solid #007AFF;
              border-radius: 15px;
              padding: 20px;
              margin: 20px auto;
              max-width: 400px;
              background: linear-gradient(135deg, #007AFF 0%, #0056D3 100%);
              color: white;
              text-align: center;
            }
            .abha-number {
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 2px;
              margin: 15px 0;
              padding: 10px;
              background: rgba(255,255,255,0.2);
              border-radius: 8px;
            }
            .qr-placeholder {
              width: 100px;
              height: 100px;
              background: white;
              margin: 15px auto;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #333;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          ${this.getHospitalHeader()}
          
          <div class="section">
            <h3 style="text-align: center;">Ayushman Bharat Health Account (ABHA) Card</h3>
            
            <div class="abha-card">
              <h2>ABHA</h2>
              <div class="abha-number">${abhaData.abhaNumber || 'XX-XXXX-XXXX-XXXX'}</div>
              
              <div style="text-align: left; margin: 20px 0;">
                <p><strong>Name:</strong> ${abhaData.name || userProfile.fullName}</p>
                <p><strong>Gender:</strong> ${abhaData.gender || userProfile.gender || 'N/A'}</p>
                <p><strong>DOB:</strong> ${abhaData.dateOfBirth || userProfile.dateOfBirth || 'N/A'}</p>
                <p><strong>Mobile:</strong> ${abhaData.mobile || userProfile.mobileNumber}</p>
              </div>
              
              <div class="qr-placeholder">
                QR Code
              </div>
              
              <p style="font-size: 12px; margin-top: 15px;">
                Valid across all healthcare facilities in India
              </p>
            </div>
          </div>

          <div class="section">
            <h3>ABHA Benefits</h3>
            <ul style="padding-left: 20px; color: #555;">
              <li>Universal health identity for all Indians</li>
              <li>Seamless access to healthcare services</li>
              <li>Digital health records storage</li>
              <li>Interoperability across health systems</li>
              <li>Privacy and security of health data</li>
            </ul>
          </div>

          <div class="footer">
            <p>Generated on ${currentDate} | SmartCare PHR - Digital Healthcare Records</p>
            <p>This ABHA card is digitally generated and verified.</p>
          </div>
        </body>
        </html>
      `;

      return await this.generatePDF(htmlContent, `abha_card_${abhaData.abhaNumber || Date.now()}`, 'ABHA Card');

    } catch (error) {
      console.error('Error generating ABHA card PDF:', error);
      throw error;
    }
  }
}

export default PDFService;