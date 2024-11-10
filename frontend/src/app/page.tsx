'use client'

import { useRef, useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import NotePanel from './components/NotePanel'
import OutlineBar from './components/OutlineBar'
import Toggle from './components/Toggle'
import GraphView from './components/GraphView'

export default function Home() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'write' | 'view'>('write');

  return (
    <div className="flex min-h-[calc(100vh-96px)] px-6 pb-6">
      {mode === 'write' ? (
        <div className="flex w-full gap-6">
          <Sidebar />
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col">
              <div ref={contentRef} className="flex-1 min-h-0">
                <NotePanel />
              </div>
              <div className="flex justify-center mt-6">
                <Toggle mode={mode} onChange={setMode} />
              </div>
            </div>
            <div className="ml-6">
              <OutlineBar 
                contentRef={contentRef}
                className="h-[calc(100vh-96px)]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full">
          <GraphView />
          <div className="flex justify-center mt-6">
            <Toggle mode={mode} onChange={setMode} />
          </div>
        </div>
      )}
    </div>
  );
}