"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MoreHorizontal, Copy } from "lucide-react";

/* --- Types --- */
export interface CarouselCard {
  id: string;
  title: string;
  value: string;
  color: string;
  icon: React.ElementType;
}

interface MinimalCarouselProps {
  cards: CarouselCard[];
  onCopyClick?: (card: CarouselCard) => void;
  onCustomizeClick?: (card: CarouselCard) => void;
}

export const MinimalCarousel: React.FC<MinimalCarouselProps> = ({
  cards,
  onCopyClick,
  onCustomizeClick,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeCard = cards.find((c) => c.id === activeId);
  const secondaryCards = cards.filter((c) => c.id !== activeId);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setActiveId(null);
  };

  return (
    <div className="min-h-full w-full flex items-center justify-center bg-transparent theme-injected">
      <div
        className="w-full flex flex-col items-center justify-center px-3 sm:px-4 select-none font-sans"
        onClick={handleBackgroundClick}
      >
        {/* Container  */}
        <div className="w-full max-w-7xl mx-auto">
          <motion.div layout className="flex flex-col" style={{ gap: 32 }}>

            {/* Expanded Card */}
            <AnimatePresence mode="popLayout">
              {activeCard && (
                <motion.div
                  key={activeCard.id}
                  layoutId={activeCard.id}
                  className={`relative flex w-full flex-col justify-between
                             rounded-[36px] text-white shadow-xl
                             ${activeCard.color}`}
                  style={{ padding: '48px 56px', minHeight: 260 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                >
                  <div className="flex items-start">
                    <activeCard.icon size={48} style={{ opacity: 0.9 }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', marginTop: 32 }}>
                    <h3 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {activeCard.title}
                    </h3>
                    <p style={{ fontSize: 16, fontWeight: 500, opacity: 0.7, marginTop: 6 }}>
                      {activeCard.value}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              className={`grid transition-all duration-500 ${activeId ? "grid-cols-3" : "grid-cols-2"}`}
              style={{ gap: 24 }}
            >
              {(activeId ? secondaryCards : cards).map((card) => (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveId(card.id);
                  }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  className={`relative flex flex-col justify-between cursor-pointer
                             rounded-[28px] text-white shadow-lg
                             ${card.color}`}
                  style={{ padding: '28px 32px', height: activeId ? 170 : 220 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <card.icon size={32} style={{ flexShrink: 0, opacity: 0.9 }} />
                    <div style={{ borderRadius: '50%', background: 'rgba(255,255,255,0.1)', padding: 8, transition: 'background 0.15s' }}>
                      <MoreHorizontal size={20} />
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', paddingBottom: 4 }}>
                    <h4 style={{ fontSize: activeId ? 14 : 20, fontWeight: 700, lineHeight: 1.2 }}>
                      {card.title}
                    </h4>
                    <p style={{ fontSize: activeId ? 12 : 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                      {card.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
