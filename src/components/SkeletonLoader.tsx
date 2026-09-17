"use client";

interface SkeletonLoaderProps {
  variant: "metric" | "row" | "card";
  count?: number;
  className?: string;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

export default function SkeletonLoader({
  variant,
  count = 4,
  className = "",
}: SkeletonLoaderProps) {
  if (variant === "metric") {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white"
          >
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-24 hidden sm:block" />
            <SkeletonBlock className="h-4 w-16 hidden sm:block" />
            <SkeletonBlock className="h-4 w-20 hidden md:block" />
            <SkeletonBlock className="h-4 w-14 ml-auto" />
            <SkeletonBlock className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // variant === "card"
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4"
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
          </div>
          <div className="flex gap-2 pt-2">
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
            <SkeletonBlock className="h-8 w-8 rounded-lg ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
