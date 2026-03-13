
import { Receipt, GroupedReceipts } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const storageService = {
  saveReceipt: async (receipt: Receipt): Promise<void> => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    
    const receiptToSave = {
      ...receipt,
      userId: auth.currentUser.uid
    };

    try {
      await setDoc(doc(db, 'receipts', receipt.id), receiptToSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `receipts/${receipt.id}`);
    }
  },

  deleteReceipt: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    try {
      await deleteDoc(doc(db, 'receipts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `receipts/${id}`);
    }
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
