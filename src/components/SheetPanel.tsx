"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import BarcodeLabel, { LabelConfig } from "./BarcodeLabel";
import DimInput, { Unit, formatDim } from "./DimInput";

export type SheetConfig = {
  paperWidthMm: number;
  paperHeightMm: number;
  marginMm: number;
  gapMm: number;
};

const PAPER_PRESETS = [
  { name: "A4", widthMm: 210, heightMm: 297 },
  { name: "A4 landscape", widthMm: 297, heightMm: 210 },
  { name: "A5", widthMm: 148, heightMm: 210 },
  { name: "Letter", widthMm: 216, heightMm: 279 },
];

type Props = {
  labels: LabelConfig[];
  sheet: SheetConfig;
  setSheet: (updater: (s: SheetConfig) => SheetConfig) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  busy: boolean;
  unit: Unit;
};

const SheetPanel = forwardRef<HTMLDivElement, Props>(function SheetPanel(
  { labels, sheet, setSheet, onPrint, onExportPdf, busy, unit },
  ref,
) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => sheetRef.current as HTMLDivElement);

  return (
    <main className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 p-6">
      <style>{`@page { size: ${sheet.paperWidthMm}mm ${sheet.paperHeightMm}mm; margin: 0; }`}</style>

      <section className="space-y-5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 h-fit">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Paper
          </h2>
          <select
            className={inputCls}
            onChange={(e) => {
              const preset = PAPER_PRESETS[Number(e.target.value)];
              if (preset) {
                setSheet((s) => ({
                  ...s,
                  paperWidthMm: preset.widthMm,
                  paperHeightMm: preset.heightMm,
                }));
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Choose preset…
            </option>
            {PAPER_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name} ({formatDim(p.widthMm, unit)}×
                {formatDim(p.heightMm, unit)} {unit})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label={`Width (${unit})`}>
              <DimInput
                valueMm={sheet.paperWidthMm}
                onChangeMm={(mm) =>
                  setSheet((s) => ({ ...s, paperWidthMm: mm }))
                }
                unit={unit}
                minMm={50}
                maxMm={500}
                className={inputCls}
              />
            </Field>
            <Field label={`Height (${unit})`}>
              <DimInput
                valueMm={sheet.paperHeightMm}
                onChangeMm={(mm) =>
                  setSheet((s) => ({ ...s, paperHeightMm: mm }))
                }
                unit={unit}
                minMm={50}
                maxMm={500}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Layout
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Margin (${unit})`}>
              <DimInput
                valueMm={sheet.marginMm}
                onChangeMm={(mm) =>
                  setSheet((s) => ({ ...s, marginMm: mm }))
                }
                unit={unit}
                minMm={0}
                maxMm={50}
                className={inputCls}
              />
            </Field>
            <Field label={`Gap (${unit})`}>
              <DimInput
                valueMm={sheet.gapMm}
                onChangeMm={(mm) => setSheet((s) => ({ ...s, gapMm: mm }))}
                unit={unit}
                minMm={0}
                maxMm={50}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {labels.length} label{labels.length === 1 ? "" : "s"} on this sheet
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onPrint}
            className="w-full h-10 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={busy}
            className="w-full h-10 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? "Exporting…" : "Export sheet PDF"}
          </button>
        </div>
      </section>

      <section className="bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 overflow-auto flex justify-center items-start">
        <div
          ref={sheetRef}
          className="print-sheet"
          style={{
            width: `${sheet.paperWidthMm}mm`,
            height: `${sheet.paperHeightMm}mm`,
            padding: `${sheet.marginMm}mm`,
            background: "#ffffff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexWrap: "wrap",
              gap: `${sheet.gapMm}mm`,
              alignContent: "flex-start",
            }}
          >
            {labels.map((label, i) => (
              <BarcodeLabel
                key={i}
                config={label}
                interactive={false}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
});

export default SheetPanel;

const inputCls =
  "w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
