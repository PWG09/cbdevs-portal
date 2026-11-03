import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { ProjectsProvider } from "@/components/useClientProjects";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ProjectsProvider>
        <AppShell>{children}</AppShell>
      </ProjectsProvider>
    </AuthGuard>
  );
}
