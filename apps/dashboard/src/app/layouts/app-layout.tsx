import { Outlet } from '@tanstack/react-router';
import { TooltipProvider } from '@/shared/ui/shadcn/tooltip';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppLayout() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-auto">
          <Topbar />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
