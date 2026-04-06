import { Sidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 lg:p-12">
        <div className="mx-auto max-w-7xl w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
