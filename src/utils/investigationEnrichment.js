import {InvestigationApi} from '../API/Api';
import {StorageService} from '../services/StorageService';

/**
 * Enrich investigation reports with dates from the print API
 * @param {Array} reports - Array of investigation reports
 * @param {string} clientId - Client ID for API calls
 * @param {Function} onUpdate - Callback function to update the UI (receives updated reports array)
 * @returns {Promise<Array>} - Returns the enriched reports array
 */
export async function enrichInvestigationsWithDates(reports, clientId, onUpdate) {
  console.log(`[InvestigationEnrichment] Starting enrichment for ${reports.length} reports...`);
  
  const enrichedReports = [...reports];
  let successCount = 0;
  
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const parentId = report._raw?.parentId;
    const gender = report._raw?.gender || 'Male';
    
    if (!parentId) {
      console.log(`[Enrichment ${i}] No parentId, skipping`);
      continue;
    }
    
    try {
      const printResult = await InvestigationApi.print(clientId, {
        investigationParentId: parentId,
        gender: gender
      });
      
      if (printResult.success && printResult.data?.data) {
        const details = printResult.data.data;
        const completedDate = details.completedDate || details.collectedDate || details.requestedDate || '';
        
        let date = '';
        let time = '';
        
        if (completedDate) {
          // Format: "17-06-2026 14:19:45"
          const parts = completedDate.split(' ');
          date = parts[0] || '';
          time = parts[1] ? parts[1].substring(0, 5) : '';
        }
        
        // Update the report
        enrichedReports[i] = {
          ...enrichedReports[i],
          date,
          time,
          _enriched: true,
        };
        
        successCount++;
        console.log(`[Enrichment ${i}/${reports.length}] Success: ${date} ${time}`);
        
        // Update UI every 2 reports for progressive loading
        if ((i + 1) % 2 === 0 && onUpdate) {
          const sorted = [...enrichedReports].sort((a, b) => {
            const aTime = Date.parse(a.date) || 0;
            const bTime = Date.parse(b.date) || 0;
            return bTime - aTime;
          });
          onUpdate(sorted);
        }
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`[Enrichment ${i}] Error:`, error.message);
    }
  }
  
  // Final sort and save
  const finalReports = enrichedReports.sort((a, b) => {
    const aTime = Date.parse(a.date) || 0;
    const bTime = Date.parse(b.date) || 0;
    return bTime - aTime;
  });
  
  // Save to storage
  await StorageService.saveInvestigations(finalReports);
  
  console.log(`[InvestigationEnrichment] Complete: ${successCount}/${reports.length} successful`);
  
  // Final update
  if (onUpdate) {
    onUpdate(finalReports);
  }
  
  return finalReports;
}
