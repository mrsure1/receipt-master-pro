
import { Receipt, GroupedReceipts } from '../types';

const STORAGE_KEY = 'receipt_master_data';

export const storageService = {
  saveReceipt: (receipt: Receipt): void => {
    const receipts = storageService.getAllReceipts();
    const existingIndex = receipts.findIndex(r => r.id === receipt.id);
    if (existingIndex > -1) {
      receipts[existingIndex] = receipt;
    } else {
      receipts.unshift(receipt);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  },

  getAllReceipts: (): Receipt[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  },

  deleteReceipt: (id: string): void => {
    const receipts = storageService.getAllReceipts();
    const filtered = receipts.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  groupReceipts: (receipts: Receipt[], mode: 'day' | 'month'): GroupedReceipts => {
    return receipts.reduce((groups: GroupedReceipts, receipt) => {
      const date = new Date(receipt.date);
      const key = mode === 'day' 
        ? receipt.date 
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(receipt);
      return groups;
    }, {});
  }
};
