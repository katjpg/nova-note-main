import { NotesProvider } from '@/lib/contexts/NotesContext';
import Sidebar from '../components/Sidebar';

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotesProvider>
      <div className="flex h-screen pt-24 px-6 pb-6">
        <Sidebar />
        {children}
      </div>
    </NotesProvider>
  );
}