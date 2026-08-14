import { useState } from 'react';
import { Alert } from 'react-native';
import PDFService from '../services/PDFService';

const usePDFGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateClinicalNotePDF = async (clinicalNote, userProfile) => {
    setIsGenerating(true);
    try {
      const result = await PDFService.generateClinicalNotePDF(clinicalNote, userProfile);
      return result;
    } catch (error) {
      Alert.alert('Error', 'Failed to generate clinical note PDF');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePrescriptionPDF = async (prescription, userProfile) => {
    setIsGenerating(true);
    try {
      const result = await PDFService.generatePrescriptionPDF(prescription, userProfile);
      return result;
    } catch (error) {
      Alert.alert('Error', 'Failed to generate prescription PDF');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateInvestigationReportPDF = async (investigation, userProfile) => {
    setIsGenerating(true);
    try {
      const result = await PDFService.generateInvestigationReportPDF(investigation, userProfile);
      return result;
    } catch (error) {
      Alert.alert('Error', 'Failed to generate investigation report PDF');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateInvoicePDF = async (invoice, userProfile) => {
    setIsGenerating(true);
    try {
      const result = await PDFService.generateInvoicePDF(invoice, userProfile);
      return result;
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invoice PDF');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateABHACardPDF = async (abhaData, userProfile) => {
    setIsGenerating(true);
    try {
      const result = await PDFService.generateABHACardPDF(abhaData, userProfile);
      return result;
    } catch (error) {
      Alert.alert('Error', 'Failed to generate ABHA card PDF');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateClinicalNotePDF,
    generatePrescriptionPDF,
    generateInvestigationReportPDF,
    generateInvoicePDF,
    generateABHACardPDF,
  };
};

export default usePDFGenerator;