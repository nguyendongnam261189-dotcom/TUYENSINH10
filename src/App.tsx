import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout } from './firebase';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogOut, Loader2 } from 'lucide-react';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [teacherClass, setTeacherClass] = useState<string | null>(localStorage.getItem('teacherClass'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email === 'nguyendongnam261189@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTeacherLogin = (className: string) => {
    localStorage.setItem('teacherClass', className);
    setTeacherClass(className);
  };

  const handleLogout = async () => {
    if (isAdmin) {
      await logout();
    }
    localStorage.removeItem('teacherClass');
    setTeacherClass(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin && !teacherClass) {
    return <Auth onTeacherLogin={handleTeacherLogin} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="text-xl font-bold text-blue-600">
                  Tuyển Sinh 10
                </span>
                <span className="ml-4 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {isAdmin ? 'Quản trị viên' : `Giáo viên lớp ${teacherClass}`}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {isAdmin ? 'IT Admin' : `Lớp ${teacherClass}`}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="py-8">
          {isAdmin ? <AdminDashboard /> : <TeacherDashboard teacherClass={teacherClass!} />}
        </main>
      </div>
    </ErrorBoundary>
  );
}
