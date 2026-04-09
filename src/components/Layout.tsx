import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <main className="flex-1 p-6 overflow-auto print:p-0 print:overflow-visible">
        <Outlet />
      </main>
    </div>
  );
}
