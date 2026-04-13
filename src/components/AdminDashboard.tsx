import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ErrorReport, ReportStatus } from '../types';
import { format } from 'date-fns';
import { Clock, CheckCircle, AlertCircle, Search, Filter, X, Trash2, Download, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

export function AdminDashboard() {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ErrorReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [updateStatus, setUpdateStatus] = useState<ReportStatus>('pending');
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport?.id) return;

    setIsUpdating(true);
    try {
      const reportRef = doc(db, 'errorReports', selectedReport.id);
      await updateDoc(reportRef, {
        status: updateStatus,
        adminNotes: updateNotes,
        updatedAt: serverTimestamp()
      });
      setSelectedReport(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `errorReports/${selectedReport.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const executeDelete = async () => {
    if (!reportToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'errorReports', reportToDelete.id));
      setReportToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `errorReports/${reportToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesClass = classFilter === 'all' || report.className === classFilter;
    const matchesSearch = report.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          report.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesClass && matchesSearch;
  });

  const handleExportExcel = () => {
    // Sắp xếp báo cáo theo lớp rồi đến tên học sinh
    const sortedReports = [...filteredReports].sort((a, b) => {
      const numA = parseInt(a.className.split('/')[1] || '0');
      const numB = parseInt(b.className.split('/')[1] || '0');
      if (numA !== numB) return numA - numB;
      return a.studentName.localeCompare(b.studentName);
    });

    const dataToExport = sortedReports.map(report => ({
      'Lớp': report.className,
      'Học sinh': report.studentName,
      'Nội dung sai/lỗi': report.incorrectContent,
      'Nội dung đúng cần điều chỉnh': report.correctContent,
      'Trạng thái': report.status === 'pending' ? 'Chờ xử lý' : report.status === 'in-progress' ? 'Đang xử lý' : 'Đã hoàn thành',
      'Phản hồi từ IT': report.adminNotes || '',
      'Ngày báo cáo': report.createdAt?.toDate ? format(report.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    // Auto-size columns slightly
    const wscols = [
      {wch: 10}, // Lớp
      {wch: 25}, // Học sinh
      {wch: 40}, // Nội dung sai
      {wch: 40}, // Nội dung đúng
      {wch: 15}, // Trạng thái
      {wch: 30}, // Phản hồi
      {wch: 20}  // Ngày báo cáo
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoLoiTuyenSinh");
    
    const fileName = classFilter === 'all' 
      ? `BaoLoiTuyenSinh_${format(new Date(), 'ddMMyyyy')}.xlsx`
      : `BaoLoiTuyenSinh_Lop_${classFilter.replace('/', '_')}_${format(new Date(), 'ddMMyyyy')}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const openModal = (report: ErrorReport) => {
    setSelectedReport(report);
    setUpdateStatus(report.status);
    setUpdateNotes(report.adminNotes || '');
  };

  // Group reports by class
  const groupedReports = filteredReports.reduce((acc, report) => {
    if (!acc[report.className]) acc[report.className] = [];
    acc[report.className].push(report);
    return acc;
  }, {} as Record<string, ErrorReport[]>);

  // Sort classes (e.g., 9/1, 9/2... 9/13)
  const sortedClasses = Object.keys(groupedReports).sort((a, b) => {
    const numA = parseInt(a.split('/')[1] || '0');
    const numB = parseInt(b.split('/')[1] || '0');
    return numA - numB;
  });

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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản trị viên IT - Xử lý lỗi tuyển sinh</h1>
          <p className="text-gray-600">Tiếp nhận và xử lý các báo cáo sai sót từ GVCN</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="w-full sm:w-auto flex justify-center items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          <Download className="w-5 h-5 mr-2" />
          Xuất Excel
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Tìm kiếm theo tên HS, Lớp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">Tất cả các lớp</option>
            {Array.from({ length: 13 }, (_, i) => `9/${i + 1}`).map(cls => (
              <option key={cls} value={cls}>Lớp {cls}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in-progress">Đang xử lý</option>
            <option value="resolved">Đã hoàn thành</option>
          </select>
        </div>
      </div>

      {sortedClasses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-500">
          Không tìm thấy báo cáo nào.
        </div>
      ) : (
        sortedClasses.map(className => (
          <div key={className} className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">Lớp {className}</span>
              <span className="text-sm font-normal text-gray-500">({groupedReports[className].length} báo cáo)</span>
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Nội dung sai</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Nội dung đúng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedReports[className].map((report) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openModal(report)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Xử lý
                        </button>
                        <button
                          onClick={() => setReportToDelete(report)}
                          className="text-red-600 hover:text-red-900"
                          title="Xóa báo cáo"
                        >
                          <Trash2 className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {groupedReports[className].map((report) => (
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
                  <div className="text-sm mb-4 bg-green-50 p-2 rounded border border-green-100">
                    <span className="font-semibold text-green-700 block mb-1">Đúng:</span> 
                    <span className="text-green-600">{report.correctContent}</span>
                  </div>
                  <div className="flex justify-end gap-3 border-t pt-3">
                    <button
                      onClick={() => openModal(report)}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Xử lý
                    </button>
                    <button
                      onClick={() => setReportToDelete(report)}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 transition-colors flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Update Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Xử lý báo cáo lỗi</h2>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Học sinh</p>
                  <p className="font-medium">{selectedReport.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lớp</p>
                  <p className="font-medium">{selectedReport.className}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Nội dung sai/lỗi</p>
                  <p className="font-medium mt-1 whitespace-pre-wrap text-red-600">{selectedReport.incorrectContent}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Nội dung đúng cần điều chỉnh</p>
                  <p className="font-medium mt-1 whitespace-pre-wrap text-green-600">{selectedReport.correctContent}</p>
                </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cập nhật trạng thái</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as ReportStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Chờ xử lý</option>
                    <option value="in-progress">Đang xử lý</option>
                    <option value="resolved">Đã hoàn thành</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú xử lý (Phản hồi cho GVCN)</label>
                  <textarea
                    rows={3}
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Ví dụ: Đã cập nhật lại ngày sinh trên hệ thống..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? 'Đang lưu...' : 'Lưu cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Xác nhận xóa báo cáo</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa báo cáo của học sinh <span className="font-bold text-gray-900">{reportToDelete.studentName}</span> (Lớp {reportToDelete.className})? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isDeleting ? 'Đang xóa...' : <><Trash2 className="w-4 h-4 mr-2"/> Xóa báo cáo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
