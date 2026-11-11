import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { BASE_PRICE, SLOPE, getSpotPrice } from "../lib/db";

interface BondingCurveChartProps {
  currentSupply: number;
  maxSupply: number;
  tokenSymbol: string;
}

export default function BondingCurveChart({ currentSupply, maxSupply, tokenSymbol }: BondingCurveChartProps) {
  // Generate 20 points along the curve for visualization
  const data: Array<{ supply: number; price: number; supplyFormatted: string; priceFormatted: string }> = [];
  const steps = 15;
  const maxVisualizationSupply = maxSupply || 100000000; // default cap for curve visualization

  for (let i = 0; i <= steps; i++) {
    const supply = (maxVisualizationSupply / steps) * i;
    const price = BASE_PRICE + SLOPE * supply;
    data.push({
      supply,
      price,
      supplyFormatted: `${(supply / 1000000).toFixed(1)}M`,
      priceFormatted: `${(price * 1000000).toFixed(2)} μETH` // micro ETH
    });
  }

  // Current spot price
  const currentSpotPrice = getSpotPrice(currentSupply);
  
  // Highlight the current position
  const currentPoint = {
    supply: currentSupply,
    price: currentSpotPrice
  };

  return (
    <div id="bonding-curve-chart-container" className="w-full h-64 rounded-2xl glass-panel p-4 flex flex-col justify-between border border-white/5 bg-zinc-950/40 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-bold text-zinc-400 font-display uppercase tracking-wider">Bonding Curve Price Trajectory</h4>
          <p className="text-[10px] text-zinc-500 font-mono">P(s) = BASE_PRICE + SLOPE * supply</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-400 font-mono">Current Supply: </span>
          <span className="text-xs font-mono font-bold text-brand-purple">{(currentSupply / 1000000).toFixed(2)}M / {(maxVisualizationSupply / 1000000).toFixed(0)}M {tokenSymbol}</span>
        </div>
      </div>

      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0052ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="supplyFormatted" 
              tick={{ fill: "#71717a", fontSize: 9, fontFamily: "monospace" }} 
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: "#71717a", fontSize: 9, fontFamily: "monospace" }} 
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10, 10, 12, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "10px",
                fontFamily: "monospace"
              }}
              labelStyle={{ color: "#a1a1aa" }}
              itemStyle={{ color: "#8b5cf6" }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
            
            {/* Dot representing current position */}
            <ReferenceDot
              x={`${(currentSupply / 1000000).toFixed(1)}M`}
              y={currentSpotPrice}
              r={5}
              fill="#22c55e"
              stroke="#ffffff"
              strokeWidth={1}
              className="animate-pulse"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono mt-1 pt-2 border-t border-white/5">
        <span>● Supply = 0: 1.00 μETH (Base Price)</span>
        <span className="text-emerald-400">● Live Spot Price: {(currentSpotPrice * 1000000).toFixed(3)} μETH / token</span>
        <span>● Target Cap: Price increases linearly</span>
      </div>
    </div>
  );
}
