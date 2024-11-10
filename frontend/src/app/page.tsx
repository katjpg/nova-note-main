'use client'

import { useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import NotePanel from './components/NotePanel'
import OutlineBar from './components/OutlineBar'
import Toggle from './components/Toggle'
import GraphView from './components/GraphView'

export default function Home() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'write' | 'view'>('write');

  return (
    <div className="fixed inset-0 pt-24 px-6 pb-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {mode === 'write' ? (
          <div className="flex w-full h-full gap-6 min-h-0">
            {/* Sidebar */}
            <div className="h-full w-64 flex-shrink-0">
              <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex h-full min-w-0">
              <div className="flex-1 flex flex-col min-w-0">
                {/* Note Panel Container */}
                <div ref={contentRef} className="flex-1 min-h-0 overflow-auto">
                  <NotePanel />
                </div>
                
                {/* Toggle Button */}
                <div className="flex justify-center mt-6">
                  <Toggle mode={mode} onChange={setMode} />
                </div>
              </div>

              {/* Outline */}
              <div className="w-64 ml-6 flex-shrink-0">
                <OutlineBar 
                  contentRef={contentRef}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <GraphView />
            </div>
            <div className="flex justify-center mt-6">
              <Toggle mode={mode} onChange={setMode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}