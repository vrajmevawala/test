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
          <motion.div layout className="flex flex-col gap-12">

            {/* Expanded Card */}
            <AnimatePresence mode="popLayout">
              {activeCard && (
                <motion.div
                  key={activeCard.id}
                  layoutId={activeCard.id}
                  className={`relative flex w-full flex-col justify-between
                             rounded-[36px] p-10 sm:p-14 text-white shadow-xl
                             ${activeCard.color}
                             min-h-[220px] sm:min-h-[260px]`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                >
                  <div className="flex items-start">
                    <activeCard.icon size={48} className="sm:w-16 sm:h-16 opacity-90" />
                  </div>

                  <div className="flex flex-col items-start text-left mt-8">
                    <h3 className="text-2xl sm:text-3xl font-bold opacity-100 tracking-tight leading-tight">
                      {activeCard.title}
                    </h3>
                    <p className="text-base sm:text-lg font-medium tracking-tight opacity-70 mt-1">
                      {activeCard.value}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              className={`grid transition-all duration-500 gap-6 sm:gap-8 ${activeId ? "grid-cols-3" : "grid-cols-2"
                }`}
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
                             rounded-[28px] sm:rounded-[32px] p-8 sm:p-10 text-white shadow-lg
                             ${card.color}
                             ${activeId ? "h-[180px] sm:h-[200px]" : "h-[240px] sm:h-[280px]"}`}
                >
                  <div className="flex justify-between items-start">
                    <card.icon size={32} className="shrink-0 opacity-90" />
                    <div className="rounded-full bg-white/10 p-1.5 sm:p-2 transition-colors hover:bg-white/20">
                      <MoreHorizontal size={20} />
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-start text-left">
                    <h4 className={`${activeId ? "text-sm sm:text-base" : "text-lg sm:text-xl"} 
                                   font-bold opacity-100 leading-tight`}>
                      {card.title}
                    </h4>
                    <p className={`${activeId ? "text-[10px] sm:text-sm" : "text-sm sm:text-base"} 
                                   font-medium text-white/70 mt-1`}>
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
