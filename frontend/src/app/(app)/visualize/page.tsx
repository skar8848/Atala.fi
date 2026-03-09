import { Card, CardContent } from "@/components/ui/card";

export default function VisualizePage() {
  return (
    <div className="flex items-center justify-center py-32">
      <Card className="border-border/40 bg-card/50 max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10">
            <svg className="w-7 h-7 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Strategy Visualizer</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Visual drag-and-drop strategy builder for composing DeFi positions across Euler V2, Silo V2, and Morpho Blue.
            </p>
          </div>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-400">
            Coming Soon
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
