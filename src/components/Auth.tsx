import React, { useState } from 'react';
import { loginWithGoogle } from '../firebase';
import { GraduationCap, Shield, Users } from 'lucide-react';

interface AuthProps {
  onTeacherLogin: (className: string) => void;
}

const CLASSES = Array.from({ length: 13 }, (_, i) => `9/${i + 1}`);

export function Auth({ onTeacherLogin }: AuthProps) {
  const [className, setClassName] = useState('');

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (className.trim()) {
      onTeacherLogin(className.trim());
    }
  };

  const handleAdminLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed', error);
      alert('Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Hệ thống quản lý tuyển sinh
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Tiếp nhận và xử lý sai sót hồ sơ tuyển sinh lớp 10
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label htmlFor="className" className="block text-sm font-medium text-gray-700">
                Chọn lớp chủ nhiệm
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="className"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border appearance-none bg-white"
                >
                  <option value="" disabled>Chọn lớp...</option>
                  {CLASSES.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Vào báo cáo lỗi
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc</span>
            </div>
          </div>

          <button
            onClick={handleAdminLogin}
            type="button"
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2 text-gray-500" />
            Đăng nhập Quản trị viên (IT)
          </button>
        </div>
      </div>
    </div>
  );
}
