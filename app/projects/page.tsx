import { Sidebar } from '@/components/sidebar';
import { ProjectsClient } from './_components/projects-client';

export default function ProjectsPage() {
  return (
    <div className="flex min-h-screen bg-[#060b18]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <ProjectsClient />
      </main>
    </div>
  );
}
