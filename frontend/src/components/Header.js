import React from 'react';
import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';

export default function Header() {
  return (
    <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Aurelia Studio</h1>
              <p className="text-sm text-slate-600">Digital Art Platform</p>
            </div>
          </div>
          <div className="text-sm text-slate-600">v2.0</div>
        </div>
      </div>
    </motion.header>
  );
}
