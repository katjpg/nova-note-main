'use client'

import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

interface ToggleProps {
  mode: 'write' | 'view';
  onChange: (mode: 'write' | 'view') => void;
}

const Toggle: React.FC<ToggleProps> = ({ mode, onChange }) => {
  return (
    <div className={`${plusJakartaSans.className} flex justify-center mb-4`}>
      <div className="inline-flex rounded-full bg-gray-100 p-1">
        <button
          className={`
            px-6 py-1.5 rounded-full text-sm font-medium transition-all
            ${mode === 'write' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          onClick={() => onChange('write')}
        >
          Write
        </button>
        <button
          className={`
            px-6 py-1.5 rounded-full text-sm font-medium transition-all
            ${mode === 'view' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          onClick={() => onChange('view')}
        >
          View
        </button>
      </div>
    </div>
  );
};

export default Toggle;