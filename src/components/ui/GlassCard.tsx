"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverable?: boolean;
}

export function GlassCard({ children, className, delay = 0, hoverable = true }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "brutal-card p-6 md:p-8",
        hoverable && "hover:translate-x-[2px] hover:translate-y-[2px]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon?: ReactNode;
  color?: "purple" | "blue" | "cyan" | "pink" | "green";
}

export function StatCard({ label, value, change, positive, icon, color = "purple" }: StatCardProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 border-2 border-white/20 bg-primary text-black brutal-shadow-sm">
          {icon}
        </div>
        {change && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-1 border-2 font-mono uppercase tracking-widest",
            positive ? "bg-white text-black border-black" : "bg-red-500 text-white border-black"
          )}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-white font-mono uppercase tracking-tight">{value}</h4>
      </div>
    </GlassCard>
  );
}
