
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Loader2, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  BarChart2,
  Table as TableIcon,
  Image as ImageIcon,
  Monitor,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LogOut
} from 'lucide-react';
import { Receipt, Category, PaymentMethod } from './types';
import { extractReceiptData } from './services/geminiService';
import { storageService, handleFirestoreError, OperationType } from './services/storageService';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import ReceiptForm from './components/ReceiptForm';
import Dashboard from './components/Dashboard';
import ExportModal from './components/ExportModal';
import ImageModal from './components/ImageModal';

import CameraModal from './components/CameraModal';

// Helper to convert file to base64 and compress it
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(reader.result as string);
        }
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  
  // Processing Queue State
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalQueueCount, setTotalQueueCount] = useState(0);
  
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [groupMode, setGroupMode] = useState<'day' | 'month'>('day');
  
  // 수정 중인 영수증 폼 데이터
  const [activeForm, setActiveForm] = useState<Partial<Receipt> | null>(null);
  
  const [previewImage, setPreviewImage] = useState<{uri: string, title: string} | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setReceipts([]);
      return;
    }

    // Migrate local storage data to Firestore
    const migrateLocalData = async () => {
      const localData = localStorage.getItem('receipt_master_data');
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as Receipt[];
          if (parsed && parsed.length > 0) {
            console.log(`Migrating ${parsed.length} receipts to Firestore...`);
            for (const receipt of parsed) {
              await storageService.saveReceipt(receipt);
            }
          }
          localStorage.removeItem('receipt_master_data');
          addNotification('기존 기기에 저장된 영수증을 클라우드로 이동했습니다.', 'success');
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }
    };
    migrateLocalData();

    const q = query(
      collection(db, 'receipts'),
      where('userId', '==', user.uid)
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const fetchedReceipts: Receipt[] = [];
      snapshot.forEach((doc) => {
        fetchedReceipts.push(doc.data() as Receipt);
      });
      // Sort in memory (descending by date) since we don't have a composite index yet
      fetchedReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setReceipts(fetchedReceipts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'receipts');
    });

    return () => unsubscribeSnapshot();
  }, [user, isAuthReady]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // Queue Processor
  useEffect(() => {
    const processNext = async () => {
      if (uploadQueue.length === 0 || isProcessing) return;

      setIsProcessing(true);
      const currentFile = uploadQueue[0];

      try {
        const base64 = await fileToBase64(currentFile);
        
        // 1. 중복 체크 (Duplicate Check)
        // 최신 데이터를 가져와서 비교해야 함
        const isDuplicate = receipts.some(r => r.image_uri === base64);

        if (isDuplicate) {
          addNotification(`'${currentFile.name}'은(는) 이미 등록된 영수증입니다.`, 'error');
          // 중복이면 저장하지 않고 카운트만 증가 후 종료
          setProcessedCount(prev => prev + 1);
        } else {
          // AI Analysis
          let extractedData: Partial<Receipt> = {};
          try {
            extractedData = await extractReceiptData(base64);
          } catch (e) {
            console.error("Analysis failed, using defaults", e);
            addNotification(`'${currentFile.name}' 분석 실패 (수동 입력 필요)`, 'info');
          }

          // Construct new receipt object
          const newReceipt: Receipt = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            merchant_name: extractedData.merchant_name || '분석 실패',
            date: extractedData.date || new Date().toISOString().split('T')[0],
            time: extractedData.time || '00:00',
            total_amount: typeof extractedData.total_amount === 'number' ? extractedData.total_amount : 0,
            tax_amount: extractedData.tax_amount || 0,
            currency: extractedData.currency || 'KRW',
            payment_method: extractedData.payment_method || PaymentMethod.Other,
            items: extractedData.items || [],
            category: extractedData.category || Category.Other,
            raw_text: extractedData.raw_text || '',
            image_uri: base64,
            confidence: extractedData.confidence || 0,
            memo: extractedData.merchant_name ? '' : `${currentFile.name} 분석 실패`
          };

          // Auto Save
          try {
            await storageService.saveReceipt(newReceipt);
            setProcessedCount(prev => prev + 1);
          } catch (e) {
            console.error("Auto-save error:", e);
            addNotification(`'${currentFile.name}' 저장 실패`, 'error');
            setProcessedCount(prev => prev + 1);
          }
          
          if (!isDuplicate) {
            // 마지막 파일이 아닐 경우 너무 많은 알림 방지, 마지막 파일이거나 단일 파일일 때만 성공 알림 등 조절 가능하지만
            // 여기서는 사용자 피드백을 위해 성공 시에는 조용히 넘어가고 UI 리스트 갱신으로 보여줌
            // 필요시: addNotification(`${newReceipt.merchant_name} 저장 완료`, 'success');
          }
        }

      } catch (error) {
        console.error("Critical error processing file:", currentFile.name, error);
        addNotification(`'${currentFile.name}' 처리 중 오류 발생`, 'error');
      } finally {
        // Remove processed file from queue
        setUploadQueue(prev => prev.slice(1));
        setIsProcessing(false);
      }
    };

    processNext();
  }, [uploadQueue, isProcessing]);

  // Reset counts when finished
  useEffect(() => {
    if (uploadQueue.length === 0 && !isProcessing && totalQueueCount > 0) {
      const timer = setTimeout(() => {
        setTotalQueueCount(0);
        setProcessedCount(0);
        addNotification('모든 파일 처리가 완료되었습니다.', 'success');
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [uploadQueue.length, isProcessing, totalQueueCount]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setTotalQueueCount(prev => prev + files.length);
    setUploadQueue(prev => [...prev, ...files]);
    
    event.target.value = '';
  };

  const handleCameraCapture = (file: File) => {
    setTotalQueueCount(prev => prev + 1);
    setUploadQueue(prev => [...prev, file]);
    setIsCameraOpen(false);
  };

  const handleSave = async (receipt: Receipt) => {
    try {
      await storageService.saveReceipt(receipt);
      setActiveForm(null);
      addNotification('저장되었습니다.', 'success');
    } catch (error) {
      console.error("Manual save error:", error);
      addNotification('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('선택한 영수증을 삭제하시겠습니까?')) {
      try {
        await storageService.deleteReceipt(id);
        addNotification('삭제되었습니다.', 'info');
      } catch (error) {
        console.error("Delete error:", error);
        addNotification('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const matchesSearch = r.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (r.memo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || r.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [receipts, searchTerm, filterCategory]);

  const groupedData = useMemo(() => {
    return storageService.groupReceipts(filteredReceipts, groupMode);
  }, [filteredReceipts, groupMode]);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) newExpanded.delete(key);
    else newExpanded.add(key);
    setExpandedGroups(newExpanded);
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      addNotification('로그인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <TableIcon size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">영수증 마스터</h1>
            <p className="text-gray-500">스마트폰과 PC 어디서든 영수증을 관리하세요.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Google 계정으로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto border-x bg-white relative shadow-sm">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-black text-blue-600 tracking-tight">Receipt Master</h1>
            <p className="text-xs text-gray-500 font-medium">Smart Expense Tracker</p>
          </div>
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100 animate-bounce"
            >
              <Monitor size={14} />
              PC에 설치
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 hidden sm:inline-block mr-2">{user.email}</span>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            title="로그아웃"
          >
            <LogOut size={20} />
          </button>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            title="CSV 내보내기"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'stats' : 'list')}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            {viewMode === 'list' ? <BarChart2 size={20} /> : <TableIcon size={20} />}
          </button>
        </div>
      </header>

      {/* Progress Bar for Bulk Upload */}
      {(totalQueueCount > 0) && (
        <div className="bg-blue-600 text-white px-4 py-3 sticky top-[73px] z-30 animate-in slide-in-from-top-2 shadow-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold flex items-center gap-2">
              <Loader2 className={`w-4 h-4 ${uploadQueue.length > 0 ? 'animate-spin' : ''}`} />
              {uploadQueue.length > 0 
                ? `영수증 분석 중... (${processedCount + 1}/${totalQueueCount})` 
                : '분석 완료!'}
            </span>
            <span className="text-xs font-medium opacity-80">{Math.round(((processedCount + (uploadQueue.length > 0 ? 0 : 0)) / totalQueueCount) * 100)}%</span>
          </div>
          <div className="w-full bg-blue-800/50 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-300 ease-out"
              style={{ width: `${(processedCount / totalQueueCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        {viewMode === 'stats' ? (
          <Dashboard receipts={receipts} />
        ) : (
          <div className="p-4 space-y-6">
            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="가맹점명, 메모 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button 
                  onClick={() => setGroupMode(groupMode === 'day' ? 'month' : 'day')}
                  className="shrink-0 px-4 py-2 rounded-full border bg-white text-xs font-semibold flex items-center gap-1 hover:bg-gray-50"
                >
                  <Filter size={14} />
                  {groupMode === 'day' ? '일별 보기' : '월별 보기'}
                </button>
                {['All', ...Object.values(Category)].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      filterCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 border border-transparent'
                    }`}
                  >
                    {cat === 'All' ? '전체' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt List */}
            <div className="space-y-4">
              {(Object.entries(groupedData) as [string, Receipt[]][]).sort(([a], [b]) => b.localeCompare(a)).map(([groupKey, groupReceipts]) => (
                <div key={groupKey} className="border rounded-2xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between border-b"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(groupKey) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="font-bold text-gray-700">{groupKey}</span>
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{groupReceipts.length}건</span>
                    </div>
                    <span className="font-black text-blue-600">
                      {groupReceipts.reduce((sum, r) => sum + r.total_amount, 0).toLocaleString()}원
                    </span>
                  </button>
                  
                  {!expandedGroups.has(groupKey) && (
                    <div className="divide-y">
                      {groupReceipts.map(receipt => (
                        <div 
                          key={receipt.id} 
                          className={`px-4 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group ${receipt.confidence < 70 ? 'bg-amber-50/50' : ''}`}
                          onClick={() => setActiveForm(receipt)}
                        >
                          <div className="flex gap-4 items-center overflow-hidden">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              receipt.confidence < 70 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {receipt.category.substring(0, 2)}
                            </div>
                            <div className="truncate">
                              <h4 className="font-bold text-sm leading-tight truncate flex items-center gap-2">
                                {receipt.merchant_name}
                                {receipt.confidence < 70 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">확인필요</span>}
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">{receipt.payment_method} · {receipt.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-gray-800 tabular-nums">
                              {receipt.total_amount.toLocaleString()}원
                            </span>
                            <div className="flex gap-1">
                              {receipt.image_uri && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage({ uri: receipt.image_uri, title: receipt.merchant_name });
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="이미지 보기"
                                >
                                  <ImageIcon size={16} />
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(receipt.id);
                                }}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {receipts.length === 0 && (
                <div className="text-center py-20 text-gray-400 space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <TableIcon size={24} />
                  </div>
                  <p>등록된 영수증이 없습니다.<br/>아래 버튼을 눌러 추가해보세요.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 z-30 w-full max-w-sm px-4 justify-center">
        <label className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-gray-700 px-3 py-3 sm:px-5 sm:py-4 rounded-full font-bold shadow-xl border cursor-pointer hover:scale-105 transition-transform whitespace-nowrap flex-1 text-sm sm:text-base">
          <Upload className="shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
          <span className="whitespace-nowrap">다중 업로드</span>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            multiple
            onChange={handleImageUpload}
          />
        </label>
        <button 
          onClick={() => setIsCameraOpen(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-3 py-3 sm:px-6 sm:py-4 rounded-full font-black shadow-xl shadow-blue-200 hover:scale-105 transition-transform whitespace-nowrap flex-1 text-sm sm:text-base"
        >
          <Camera className="shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
          <span className="whitespace-nowrap">촬영</span>
        </button>
      </div>

      {/* Notifications (Toasts) */}
      <div className="fixed bottom-28 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
        {notifications.map(note => (
          <div 
            key={note.id} 
            className={`
              flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl font-medium text-sm animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm w-full
              ${note.type === 'error' ? 'bg-red-500 text-white' : 
                note.type === 'success' ? 'bg-green-600 text-white' : 
                'bg-gray-800 text-white'}
            `}
          >
            {note.type === 'error' && <XCircle size={18} />}
            {note.type === 'success' && <CheckCircle2 size={18} />}
            {note.type === 'info' && <AlertCircle size={18} />}
            {note.message}
          </div>
        ))}
      </div>

      {isCameraOpen && (
        <CameraModal 
          onCapture={handleCameraCapture} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}

      {activeForm && (
        <ReceiptForm 
          initialData={activeForm} 
          onSave={handleSave} 
          onCancel={() => setActiveForm(null)} 
        />
      )}

      {previewImage && (
        <ImageModal 
          imageUri={previewImage.uri} 
          onClose={() => setPreviewImage(null)}
          title={previewImage.title}
        />
      )}

      {isExportModalOpen && (
        <ExportModal 
          receipts={receipts} 
          onClose={() => setIsExportModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
