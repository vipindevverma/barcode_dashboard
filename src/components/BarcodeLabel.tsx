"use client";

import { forwardRef, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export type ExtraField = {
  id: string;
  label: string;
  value: string;
};

export type LabelConfig = {
  value: string;
  title: string;
  subtitle: string;
  extras: ExtraField[];
  widthMm: number;
  heightMm: number;
  showValue: boolean;
  barHeight: number;
  fontSize: number;
};

const MM_TO_PX = 96 / 25.4;

const BarcodeLabel = forwardRef<HTMLDivElement, { config: LabelConfig }>(
  function BarcodeLabel({ config }, ref) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
      if (!svgRef.current) return;
      const data = config.value.trim();
      if (!data) {
        svgRef.current.innerHTML = "";
        return;
      }
      try {
        JsBarcode(svgRef.current, data, {
          format: "CODE128",
          displayValue: config.showValue,
          height: config.barHeight,
          fontSize: config.fontSize,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        if (svgRef.current) svgRef.current.innerHTML = "";
      }
    }, [config.value, config.showValue, config.barHeight, config.fontSize]);

    const widthPx = config.widthMm * MM_TO_PX;
    const heightPx = config.heightMm * MM_TO_PX;

    return (
      <div
        ref={ref}
        className="bg-white text-black flex flex-col items-center justify-center border border-zinc-300 shadow-sm"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          padding: "6px",
          gap: "4px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {config.title && (
          <div
            className="font-semibold text-center w-full truncate"
            style={{ fontSize: `${config.fontSize + 2}px` }}
          >
            {config.title}
          </div>
        )}
        <svg ref={svgRef} className="max-w-full" />
        {config.subtitle && (
          <div
            className="text-center w-full truncate"
            style={{ fontSize: `${config.fontSize}px` }}
          >
            {config.subtitle}
          </div>
        )}
        {config.extras.length > 0 && (
          <div
            className="w-full grid grid-cols-2 gap-x-2 gap-y-0.5 px-1"
            style={{ fontSize: `${Math.max(config.fontSize - 2, 8)}px` }}
          >
            {config.extras.map((extra) => (
              <div key={extra.id} className="flex gap-1 truncate">
                {extra.label && (
                  <span className="font-medium">{extra.label}:</span>
                )}
                <span className="truncate">{extra.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default BarcodeLabel;
