import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import ResourceCard from './ResourceCard';
import { useTheme } from '@/context/ThemeContext';

export default function LibraryGrid({ assets, setViewingPdf }) {
  const { isDarkMode } = useTheme();
  if (assets.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">No resources found matching filter.</p>
      </div>
    );
  }

  return (
    <LayoutGroup>
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {assets.map((asset, index) => (
            <motion.div
              layout
              key={asset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                ease: "easeOut",
                delay: index * 0.03 // Staggered entrance
              }}
            >
              <ResourceCard 
                asset={asset} 
                setViewingPdf={setViewingPdf} 
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
