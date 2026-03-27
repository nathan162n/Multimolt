import Titlebar from './Titlebar';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

export default function AppShell() {
  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[var(--color-bg-base)]">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
}
