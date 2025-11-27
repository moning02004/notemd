import { Sidebar } from "./components/sidebar";
import { Topbar } from "./components/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (

    <div className="flex h-screen font-sans bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col p-5">
        <Topbar />
        <main className="mt-2 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
