
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Receipt, Category } from '../types';

interface Props {
  receipts: Receipt[];
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

const Dashboard: React.FC<Props> = ({ receipts }) => {
  const categoryStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    receipts.forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + r.total_amount;
    });
    return Object.keys(stats).map(name => ({ name, value: stats[name] }));
  }, [receipts]);

  const monthlyStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    receipts.forEach(r => {
      const month = r.date.substring(0, 7);
      stats[month] = (stats[month] || 0) + r.total_amount;
    });
    return Object.keys(stats).sort().map(month => ({ month, total: stats[month] }));
  }, [receipts]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return receipts
      .filter(r => r.date.startsWith(currentMonthStr))
      .reduce((sum, r) => sum + r.total_amount, 0);
  }, [receipts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-700">이번 달 총 지출</h3>
          <span className="text-2xl font-black text-blue-600">{totalThisMonth.toLocaleString()}원</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyStats}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <h3 className="font-bold text-gray-700">카테고리별 지출</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryStats}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
