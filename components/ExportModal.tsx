
import React, { useState } from 'react';
import { X, Calendar, Download } from 'lucide-react';
import { Receipt } from '../types';
import { exportToCSV } from '../utils/csvExport';

interface Props {
  receipts: Receipt[];
  onClose: () => void;
}

const ExportModal: React.FC<Props> = ({ receipts, onClose }) => {
  const [rangeType, setRangeType] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleExport = () => {
    let filtered = receipts;
    if (rangeType === 'custom') {
      filtered = receipts.filter(r => r.date >= startDate && r.date <= endDate);
    }
    
    if (filtered.length === 0) {
      alert('선택한 기간에 해당하는 영수증이 없습니다.');
      return;
    }

    const filename = rangeType === 'all' 
      ? `전체_영수증_목록_${new Date().toISOString().split('T')[0]}`
      : `영수증_목록_${startDate}_to_${endDate}`;
      
    exportToCSV(filtered, filename);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">엑셀(CSV) 내보내기</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">기간 선택</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRangeType('all')}
                className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${
                  rangeType === 'all' 
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                }`}
              >
                전체 기간
              </button>
              <button
                onClick={() => setRangeType('custom')}
                className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${
                  rangeType === 'custom' 
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                }`}
              >
                기간 설정
              </button>
            </div>
          </div>

          {rangeType === 'custom' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400">시작일</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400">종료일</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Download size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800">CSV 형식 지원</p>
              <p className="text-xs text-blue-600 leading-relaxed mt-0.5">
                내보낸 파일은 엑셀(Excel), 구글 스프레드시트 등에서 바로 열어볼 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleExport}
            className="flex-[2] py-4 px-6 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} />
            파일 다운로드
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
