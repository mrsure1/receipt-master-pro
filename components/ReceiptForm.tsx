
import React, { useState } from 'react';
import { Receipt, Category, PaymentMethod } from '../types';
import { X, Save, AlertCircle, Maximize2, Trash2, Plus } from 'lucide-react';
import ImageModal from './ImageModal';

interface Props {
  initialData: Partial<Receipt>;
  onSave: (receipt: Receipt) => void;
  onCancel: () => void;
}

const ReceiptForm: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const [formData, setFormData] = useState<Partial<Receipt>>({
    id: initialData.id || Date.now().toString(),
    merchant_name: initialData.merchant_name || '',
    date: initialData.date || new Date().toISOString().split('T')[0],
    time: initialData.time || '00:00',
    total_amount: initialData.total_amount || 0,
    currency: initialData.currency || 'KRW',
    category: initialData.category || Category.Other,
    payment_method: initialData.payment_method || PaymentMethod.Card,
    items: initialData.items || [],
    raw_text: initialData.raw_text || '',
    image_uri: initialData.image_uri || '',
    confidence: initialData.confidence || 0,
    memo: initialData.memo || ''
  });

  const formatNumber = (num: number | string | undefined) => {
    if (num === undefined || num === null) return '';
    return Number(String(num).replace(/[^0-9]/g, '')).toLocaleString();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, total_amount: Number(val) }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { name: '', qty: 1, price: 0, line_total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
            <h2 className="text-xl font-bold">영수증 정보 확인</h2>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {formData.image_uri && (
              <div 
                className="relative group cursor-zoom-in"
                onClick={() => setShowFullImage(true)}
              >
                <img 
                  src={formData.image_uri} 
                  alt="Receipt" 
                  className="w-full h-48 object-contain rounded-lg bg-gray-100 border transition-opacity group-hover:opacity-90" 
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                    <Maximize2 size={24} />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-md">
                  클릭하여 확대
                </div>
              </div>
            )}

            {formData.confidence !== undefined && formData.confidence < 70 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 text-amber-800 text-sm">
                <AlertCircle className="shrink-0" size={18} />
                <p>일부 정보가 불확실합니다. 직접 확인 후 수정해 주세요.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">가맹점명</label>
                <input 
                  name="merchant_name"
                  value={formData.merchant_name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">결제 총액</label>
                <input 
                  type="text"
                  name="total_amount"
                  value={formatNumber(formData.total_amount)}
                  onChange={handleAmountChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">날짜</label>
                <input 
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">카테고리</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(Category).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">결제 수단</label>
                <select 
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(PaymentMethod).map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">메모</label>
              <textarea 
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                rows={2}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="추가 기록사항..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-500 uppercase">품목 상세</label>
                <button onClick={addItem} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={14} /> 추가
                </button>
              </div>
              <div className="border rounded-lg overflow-hidden text-sm overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">품명</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap w-16">수량</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap w-28">금액</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items?.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1">
                          <input 
                            value={item.name} 
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="w-full p-1.5 border-transparent hover:border-gray-200 focus:border-blue-500 border rounded outline-none bg-transparent"
                            placeholder="품명"
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text"
                            value={formatNumber(item.qty)} 
                            onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value.replace(/[^0-9]/g, '')))}
                            className="w-full p-1.5 border-transparent hover:border-gray-200 focus:border-blue-500 border rounded outline-none bg-transparent text-right"
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text"
                            value={formatNumber(item.line_total)} 
                            onChange={(e) => handleItemChange(idx, 'line_total', Number(e.target.value.replace(/[^0-9]/g, '')))}
                            className="w-full p-1.5 border-transparent hover:border-gray-200 focus:border-blue-500 border rounded outline-none bg-transparent text-right"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!formData.items || formData.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-xs">
                          등록된 품목이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-6 border-t flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl border font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button 
              onClick={() => onSave(formData as Receipt)}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              저장하기
            </button>
          </div>
        </div>
      </div>

      {showFullImage && formData.image_uri && (
        <ImageModal 
          imageUri={formData.image_uri} 
          onClose={() => setShowFullImage(false)}
          title={formData.merchant_name}
        />
      )}
    </>
  );
};

export default ReceiptForm;
