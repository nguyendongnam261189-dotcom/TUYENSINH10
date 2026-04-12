import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ErrorReport } from '../types';
import { format } from 'date-fns';
import { PlusCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface TeacherDashboardProps {
  teacherClass: string;
}

export function TeacherDashboard({ teacherClass }: TeacherDashboardProps) {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    studentName: '',
    incorrectContent: '',
    correctContent: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'errorReports'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ErrorReport[];
      setReports(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'errorReports');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newReport = {
        ...formData,
        className: teacherClass,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'errorReports'), newReport);
      setFormData({ studentName: '', incorrectContent: '', correctContent: '' });
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'errorReports');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Chờ xử lý</span>;
      case 'in-progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><AlertCircle className="w-3 h-3 mr-1" /> Đang xử lý</span>;
      case 'resolved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Đã hoàn thành</span>;
      default:
        return null;
    }
  };

  const displayedReports = reports.filter(r => r.className === teacherClass);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý báo lỗi tuyển sinh</h1>
          <p className="text-gray-600">Lớp: {teacherClass}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Báo lỗi mới
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold mb-4">Gửi thông tin sai sót mới cho lớp {teacherClass}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên học sinh</label>
              <input
                type="text"
                required
                value={formData.studentName}
                onChange={e => setFormData({...formData, studentName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập họ và tên học sinh..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung sai/lỗi</label>
                <textarea
                  required
                  rows={3}
                  value={formData.incorrectContent}
                  onChange={e => setFormData({...formData, incorrectContent: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ví dụ: Sai ngày sinh (12/05/2009)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung đúng cần điều chỉnh</label>
                <textarea
                  required
                  rows={3}
                  value={formData.correctContent}
                  onChange={e => setFormData({...formData, correctContent: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ví dụ: Ngày sinh đúng là 15/05/2009..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Nội dung sai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Nội dung đúng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phản hồi từ IT</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Lớp {teacherClass} chưa có yêu cầu sửa lỗi nào.
                  </td>
                </tr>
              ) : (
                displayedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{report.studentName}</div>
                      <div className="text-xs text-gray-500">
                        {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-red-600 max-w-xs truncate" title={report.incorrectContent}>
                        {report.incorrectContent}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-green-600 max-w-xs truncate" title={report.correctContent}>
                        {report.correctContent}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate" title={report.adminNotes}>
                        {report.adminNotes || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {displayedReports.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200 text-gray-500">
            Lớp {teacherClass} chưa có yêu cầu sửa lỗi nào.
          </div>
        ) : (
          displayedReports.map((report) => (
            <div key={report.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-gray-900 text-lg">{report.studentName}</div>
                  <div className="text-xs text-gray-500">
                    {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}
                  </div>
                </div>
                {getStatusBadge(report.status)}
              </div>
              
              <div className="text-sm mb-2 bg-red-50 p-2 rounded border border-red-100">
                <span className="font-semibold text-red-700 block mb-1">Sai:</span> 
                <span className="text-red-600">{report.incorrectContent}</span>
              </div>
              
              <div className="text-sm mb-3 bg-green-50 p-2 rounded border border-green-100">
                <span className="font-semibold text-green-700 block mb-1">Đúng:</span> 
                <span className="text-green-600">{report.correctContent}</span>
              </div>

              {report.adminNotes && (
                <div className="mt-3 text-sm bg-gray-50 p-3 rounded border border-gray-200">
                  <span className="font-semibold text-gray-700 block mb-1">IT phản hồi:</span> 
                  <span className="text-gray-600">{report.adminNotes}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
