
import { Receipt } from '../types';

/**
 * Exports receipt data to a CSV file.
 * Includes a BOM (\uFEFF) to ensure UTF-8 characters (like Korean) are correctly displayed in Excel.
 */
export const exportToCSV = (receipts: Receipt[], customFilename?: string) => {
  const headers = ['날짜', '시간', '가맹점명', '카테고리', '금액', '결제수단', '세금', '메모'];
  
  const rows = receipts.map(r => [
    r.date,
    r.time,
    `"${r.merchant_name.replace(/"/g, '""')}"`,
    r.category,
    r.total_amount,
    r.payment_method,
    r.tax_amount || 0,
    `"${(r.memo || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // \uFEFF is the UTF-8 Byte Order Mark, which tells Excel to open the file as UTF-8
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const filename = customFilename || `receipts_export_${new Date().toISOString().split('T')[0]}`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
