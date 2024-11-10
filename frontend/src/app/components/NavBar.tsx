'use client'

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { usePathname } from 'next/navigation';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Decks', path: '/decks' },
  { name: 'Progress', path: '/progress' },
] as const;

const NavBar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4">
      <nav className="relative flex items-center px-8 py-4 bg-white border border-[#D0D5DD] rounded-[80px] shadow-sm">
        {/* Logo on the left */}
        <div className="absolute left-8">
          <Link href="/" legacyBehavior>
            <a className="flex items-center">
              <Image
                src="/nova-note-logo.png"
                alt="Nova.note Logo"
                width={120}
                height={28}
                priority
              />
            </a>
          </Link>
        </div>
        
        {/* Centered navigation items */}
        <div className={`${plusJakartaSans.className} flex items-center justify-center gap-16 w-full text-base`}>
          {navItems.map((item) => (
            <Link 
              key={item.path}
              href={item.path}
              className={`transition-colors ${
                isActive(item.path)
                  ? 'text-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default NavBar;