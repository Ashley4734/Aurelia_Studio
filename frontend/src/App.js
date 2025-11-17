import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Palette, Package, Sparkles, FileText } from 'lucide-react';
import MockupsTab from './components/MockupsTab';
import UpscaleTab from './components/UpscaleTab';
import GenerateTab from './components/GenerateTab';
import ListingTab from './components/ListingTab';
import Header from './components/Header';

const tabs = [
  { id: 'mockups', label: 'Mockups', icon: Palette, description: 'Transform artwork with professional mockups' },
  { id: 'upscale', label: 'Package', icon: Package, description: 'Create print-ready packages' },
  { id: 'generate', label: 'Generate', icon: Sparkles, description: 'AI-powered art creation' },
  { id: 'listing', label: 'Listing', icon: FileText, description: 'Auto-generate product listings' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('mockups');

  const TabButton = ({ tab, isActive, onClick }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl font-medium text-sm transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
          : 'bg-white/70 backdrop-blur-sm text-slate-700 hover:bg-white hover:shadow-md border border-white/50'
      }`}
    >
      <tab.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
      <div className="text-left">
        <div className="font-semibold">{tab.label}</div>
        <div className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
          {tab.description}
        </div>
      </div>
    </motion.button>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mockups': return <MockupsTab />;
      case 'upscale': return <UpscaleTab />;
      case 'generate': return <GenerateTab />;
      case 'listing': return <ListingTab />;
      default: return <MockupsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Toaster position="top-right" />
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary-600 via-accent-500 to-primary-700 bg-clip-text text-transparent mb-4">
            Aurelia Studio
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Professional digital art workflow platform for mockups, packaging, generation, and listing automation
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
