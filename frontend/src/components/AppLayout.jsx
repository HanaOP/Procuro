import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
