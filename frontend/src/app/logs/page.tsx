import { LogViewer } from "@/features/logs/components/log-viewer";

export const metadata = {
  title: "Backend logs · UnderOS",
};

export default function LogsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-void)]">
      <LogViewer />
    </main>
  );
}
