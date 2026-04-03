"use client";
import React from "react";
import { MinimalCarousel, type CarouselCard } from "@/components/ui/watermelon-carousel";
import { Shield, Zap, BarChart2, GitBranch, Wrench, Users } from "lucide-react";

const FEATURES: CarouselCard[] = [
  {
    id: "analysis",
    title: "AI-Powered Analysis",
    value: "AST-level precision",
    color: "bg-[#dd571c]",
    icon: Zap,
  },
  {
    id: "performance",
    title: "Performance",
    value: "Detect O(n²) loops",
    color: "bg-[#ed7014]",
    icon: BarChart2,
  },
  {
    id: "fixes",
    title: "One-Click Fixes",
    value: "Diff-previewed patches",
    color: "bg-[#b2560d]",
    icon: Wrench,
  },
  {
    id: "team",
    title: "Team Collaboration",
    value: "Shared workspaces",
    color: "bg-[#d67229]",
    icon: Users,
  },
];

export function FeatureCarousel() {
  const handleView = (card: CarouselCard) => {
    console.log("Viewing feature:", card.title);
  };

  const handleCopy = (card: CarouselCard) => {
    navigator.clipboard.writeText(`CodeSage Feature: ${card.title} - ${card.value}`);
  };

  return (
    <div className="py-8">
      <MinimalCarousel 
        cards={FEATURES} 
        onCopyClick={handleCopy}
        onCustomizeClick={handleView}
      />
    </div>
  );
}
