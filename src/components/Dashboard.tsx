"use client";

import { useEffect, useRef, useState } from "react";
import BarcodeLabel, {
  ElementId,
  LabelConfig,
  Position,
  TextEntry,
  TextStyle,
} from "./BarcodeLabel";
import SheetPanel, { SheetConfig } from "./SheetPanel";
import DimInput, { Unit, formatDim } from "./DimInput";
import { exportPdf, exportPng } from "@/lib/exporters";

const PRESETS: { name: string; widthMm: number; heightMm: number }[] = [
  { name: "Small (50×30 mm)", widthMm: 50, heightMm: 30 },
  { name: "Medium (70×40 mm)", widthMm: 70, heightMm: 40 },
  { name: "Large (100×60 mm)", widthMm: 100, heightMm: 60 },
  { name: "Shipping (100×150 mm)", widthMm: 100, heightMm: 150 },
];

const defaultStyle = (fontSize: number, bold = false): TextStyle => ({
  fontSize,
  bold,
  italic: false,
});

function blankLabel(suffix: string = "12345"): LabelConfig {
  return {
    widthMm: 70,
    heightMm: 40,
    barcode: {
      value: `ABC-${suffix}`,
      pos: { xPct: 50, yPct: 50 },
      showValue: true,
      valueStyle: defaultStyle(14),
      barHeight: 50,
      barWidth: 2,
    },
    title: {
      text: "Product Name",
      pos: { xPct: 50, yPct: 12 },
      style: defaultStyle(14, true),
    },
    subtitle: {
      text: `SKU: ABC-${suffix}`,
      pos: { xPct: 50, yPct: 90 },
      style: defaultStyle(11),
    },
    texts: [],
  };
}

const defaultSheet: SheetConfig = {
  paperWidthMm: 210,
  paperHeightMm: 297,
  marginMm: 10,
  gapMm: 5,
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type ViewMode = "editor" | "sheet";

type Template = { id: string; name: string; config: LabelConfig };

const TEMPLATES_KEY = "barcode-dashboard-templates";

export default function Dashboard() {
  const [labels, setLabels] = useState<LabelConfig[]>([blankLabel()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<ViewMode>("editor");
  const [unit, setUnit] = useState<Unit>("mm");
  const [sheet, setSheet] = useState<SheetConfig>(defaultSheet);
  const [busy, setBusy] = useState<null | "png" | "pdf" | "sheet-pdf">(null);
  const [selectedId, setSelectedId] = useState<ElementId | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplName, setTplName] = useState("");
  const [tplLoaded, setTplLoaded] = useState(false);

  const labelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEMPLATES_KEY);
      if (raw) setTemplates(JSON.parse(raw));
    } catch {}
    setTplLoaded(true);
  }, []);

  useEffect(() => {
    if (!tplLoaded) return;
    try {
      window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch {}
  }, [templates, tplLoaded]);

  const activeLabel = labels[activeIndex] ?? labels[0];

  const updateActive = (updater: (l: LabelConfig) => LabelConfig) =>
    setLabels((ls) =>
      ls.map((l, i) => (i === activeIndex ? updater(l) : l)),
    );

  const updateBarcode = (patch: Partial<LabelConfig["barcode"]>) =>
    updateActive((l) => ({ ...l, barcode: { ...l.barcode, ...patch } }));

  const updateBarcodeValueStyle = (patch: Partial<TextStyle>) =>
    updateActive((l) => ({
      ...l,
      barcode: {
        ...l.barcode,
        valueStyle: { ...l.barcode.valueStyle, ...patch },
      },
    }));

  const updateTitleField = (
    key: "title" | "subtitle",
    patch: Partial<LabelConfig["title"]>,
  ) => updateActive((l) => ({ ...l, [key]: { ...l[key], ...patch } }));

  const updateTitleStyle = (
    key: "title" | "subtitle",
    patch: Partial<TextStyle>,
  ) =>
    updateActive((l) => ({
      ...l,
      [key]: { ...l[key], style: { ...l[key].style, ...patch } },
    }));

  const addText = () => {
    const id = uid();
    updateActive((l) => ({
      ...l,
      texts: [
        ...l.texts,
        {
          id,
          text: "New text",
          pos: { xPct: 50, yPct: 50 },
          style: defaultStyle(11),
        },
      ],
    }));
    setSelectedId(id);
  };

  const updateText = (id: string, patch: Partial<TextEntry>) =>
    updateActive((l) => ({
      ...l,
      texts: l.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const updateTextStyle = (id: string, patch: Partial<TextStyle>) =>
    updateActive((l) => ({
      ...l,
      texts: l.texts.map((t) =>
        t.id === id ? { ...t, style: { ...t.style, ...patch } } : t,
      ),
    }));

  const removeText = (id: string) => {
    updateActive((l) => ({ ...l, texts: l.texts.filter((t) => t.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const handleMove = (id: ElementId, xPct: number, yPct: number) => {
    const pos: Position = { xPct, yPct };
    if (id === "barcode") updateBarcode({ pos });
    else if (id === "title") updateTitleField("title", { pos });
    else if (id === "subtitle") updateTitleField("subtitle", { pos });
    else updateText(id, { pos });
  };

  const addLabel = () => {
    setLabels((ls) => [...ls, blankLabel(String(ls.length + 1).padStart(5, "0"))]);
    setActiveIndex(labels.length);
    setSelectedId(null);
  };

  const duplicateLabel = (i: number) => {
    setLabels((ls) => {
      const copy = clone(ls[i]);
      copy.texts = copy.texts.map((t) => ({ ...t, id: uid() }));
      return [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)];
    });
    setActiveIndex(i + 1);
    setSelectedId(null);
  };

  const removeLabel = (i: number) => {
    if (labels.length <= 1) return;
    setLabels((ls) => ls.filter((_, idx) => idx !== i));
    setActiveIndex((j) => Math.max(0, j > i ? j - 1 : j === i ? Math.min(j, labels.length - 2) : j));
    setSelectedId(null);
  };

  const saveTemplate = () => {
    const name = tplName.trim() || `Template ${templates.length + 1}`;
    setTemplates((ts) => [
      ...ts,
      { id: uid(), name, config: clone(activeLabel) },
    ]);
    setTplName("");
  };

  const reIdTexts = (cfg: LabelConfig): LabelConfig => ({
    ...cfg,
    texts: cfg.texts.map((t) => ({ ...t, id: uid() })),
  });

  const applyTemplate = (tpl: Template) => {
    const cfg = reIdTexts(clone(tpl.config));
    setLabels((ls) => ls.map((l, i) => (i === activeIndex ? cfg : l)));
    setSelectedId(null);
  };

  const newFromTemplate = (tpl: Template) => {
    const cfg = reIdTexts(clone(tpl.config));
    setLabels((ls) => [...ls, cfg]);
    setActiveIndex(labels.length);
    setSelectedId(null);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((ts) => ts.filter((t) => t.id !== id));
  };

  const filename = (activeLabel.barcode.value || "barcode-label")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .slice(0, 40);

  const handleExport = async (kind: "png" | "pdf") => {
    if (!labelRef.current) return;
    const prevSelected = selectedId;
    setSelectedId(null);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    setBusy(kind);
    try {
      if (kind === "png") {
        await exportPng(labelRef.current, activeLabel.widthMm, filename);
      } else {
        await exportPdf(
          labelRef.current,
          activeLabel.widthMm,
          activeLabel.heightMm,
          filename,
        );
      }
    } finally {
      setBusy(null);
      setSelectedId(prevSelected);
    }
  };

  const handleSheetPrint = () => {
    window.print();
  };

  const handleSheetPdf = async () => {
    if (!sheetRef.current) return;
    setBusy("sheet-pdf");
    try {
      await exportPdf(
        sheetRef.current,
        sheet.paperWidthMm,
        sheet.paperHeightMm,
        "label-sheet",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Barcode Label Generator
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Code 128 · Multi-label · A4 sheet · Print or export
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setUnit("mm")}
              className={`px-3 h-9 ${
                unit === "mm"
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              mm
            </button>
            <button
              type="button"
              onClick={() => setUnit("in")}
              className={`px-3 h-9 border-l border-zinc-300 dark:border-zinc-700 ${
                unit === "in"
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              in
            </button>
          </div>
          <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setView("editor")}
              className={`px-4 h-9 ${
                view === "editor"
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setView("sheet")}
              className={`px-4 h-9 border-l border-zinc-300 dark:border-zinc-700 ${
                view === "sheet"
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Sheet
            </button>
          </div>
        </div>
      </header>

      {view === "editor" && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2 flex items-center gap-2 overflow-x-auto">
          {labels.map((label, i) => {
            const active = i === activeIndex;
            return (
              <div key={i} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(i);
                    setSelectedId(null);
                  }}
                  className={`pl-3 pr-2 h-8 rounded-l-md border flex items-center gap-2 text-sm whitespace-nowrap ${
                    active
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>Label {i + 1}</span>
                  <span
                    className={`text-xs ${active ? "opacity-80" : "text-zinc-500 dark:text-zinc-400"}`}
                  >
                    {label.barcode.value || "—"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => duplicateLabel(i)}
                  title="Duplicate"
                  className={`h-8 px-2 border-y text-xs ${
                    active
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-300 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  ⎘
                </button>
                <button
                  type="button"
                  onClick={() => removeLabel(i)}
                  disabled={labels.length <= 1}
                  title="Remove"
                  className={`h-8 px-2 rounded-r-md border text-xs disabled:opacity-30 ${
                    active
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-300 dark:border-zinc-700 hover:text-red-600"
                  }`}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addLabel}
            className="h-8 px-3 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            + New label
          </button>
        </div>
      )}

      {view === "editor" ? (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6 p-6">
          <section className="space-y-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
            <Group title="Templates">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Save the current label&apos;s layout to reuse later. Saved
                locally in your browser.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Template name"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={saveTemplate}
                  className="h-9 px-3 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Save
                </button>
              </div>
              {templates.length > 0 && (
                <div className="space-y-1">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-2 h-9"
                    >
                      <span className="flex-1 text-sm truncate text-zinc-700 dark:text-zinc-300">
                        {t.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => applyTemplate(t)}
                        title="Replace current label with this template"
                        className="h-7 px-2 text-xs rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => newFromTemplate(t)}
                        title="Create a new label from this template"
                        className="h-7 px-2 text-xs rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        New
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.id)}
                        title="Delete template"
                        className="h-7 w-7 text-xs text-zinc-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Group>

            <Group title="Barcode">
              <Field label="Value (Code 128)">
                <input
                  type="text"
                  value={activeLabel.barcode.value}
                  onChange={(e) => updateBarcode({ value: e.target.value })}
                  onFocus={() => setSelectedId("barcode")}
                  className={inputCls}
                  placeholder="e.g. ABC-12345"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bar height">
                  <input
                    type="number"
                    min={20}
                    max={200}
                    value={activeLabel.barcode.barHeight}
                    onChange={(e) =>
                      updateBarcode({
                        barHeight: Number(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Bar width">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    step={0.5}
                    value={activeLabel.barcode.barWidth}
                    onChange={(e) =>
                      updateBarcode({
                        barWidth: Number(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
              <Toggle
                label="Show value text below bars"
                checked={activeLabel.barcode.showValue}
                onChange={(v) => updateBarcode({ showValue: v })}
              />
              {activeLabel.barcode.showValue && (
                <StyleControls
                  style={activeLabel.barcode.valueStyle}
                  onChange={updateBarcodeValueStyle}
                />
              )}
              <PositionRow pos={activeLabel.barcode.pos} />
            </Group>

            <Group title="Title">
              <input
                type="text"
                value={activeLabel.title.text}
                onChange={(e) =>
                  updateTitleField("title", { text: e.target.value })
                }
                onFocus={() => setSelectedId("title")}
                className={inputCls}
              />
              <StyleControls
                style={activeLabel.title.style}
                onChange={(patch) => updateTitleStyle("title", patch)}
              />
              <PositionRow pos={activeLabel.title.pos} />
            </Group>

            <Group title="Subtitle">
              <input
                type="text"
                value={activeLabel.subtitle.text}
                onChange={(e) =>
                  updateTitleField("subtitle", { text: e.target.value })
                }
                onFocus={() => setSelectedId("subtitle")}
                className={inputCls}
              />
              <StyleControls
                style={activeLabel.subtitle.style}
                onChange={(patch) => updateTitleStyle("subtitle", patch)}
              />
              <PositionRow pos={activeLabel.subtitle.pos} />
            </Group>

            <Group title="Custom text">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add text and drag it anywhere on the label.
              </p>
              <div className="space-y-3">
                {activeLabel.texts.map((entry) => {
                  const selected = selectedId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      className={`space-y-2 rounded-md border p-2 cursor-pointer ${
                        selected
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Text"
                          value={entry.text}
                          onChange={(e) =>
                            updateText(entry.id, { text: e.target.value })
                          }
                          className={`${inputCls} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeText(entry.id);
                          }}
                          className="px-2 text-zinc-500 hover:text-red-600"
                          aria-label="Remove text"
                        >
                          ✕
                        </button>
                      </div>
                      <StyleControls
                        style={entry.style}
                        onChange={(patch) => updateTextStyle(entry.id, patch)}
                      />
                      <PositionRow pos={entry.pos} />
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addText}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add text
                </button>
              </div>
            </Group>

            <Group title="Label size">
              <Field label="Preset">
                <select
                  className={inputCls}
                  onChange={(e) => {
                    const preset = PRESETS[Number(e.target.value)];
                    if (preset) {
                      updateActive((l) => ({
                        ...l,
                        widthMm: preset.widthMm,
                        heightMm: preset.heightMm,
                      }));
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a preset…
                  </option>
                  {PRESETS.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name} ({formatDim(p.widthMm, unit)}×
                      {formatDim(p.heightMm, unit)} {unit})
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Width (${unit})`}>
                  <DimInput
                    valueMm={activeLabel.widthMm}
                    onChangeMm={(mm) =>
                      updateActive((l) => ({ ...l, widthMm: mm }))
                    }
                    unit={unit}
                    minMm={10}
                    maxMm={300}
                    className={inputCls}
                  />
                </Field>
                <Field label={`Height (${unit})`}>
                  <DimInput
                    valueMm={activeLabel.heightMm}
                    onChangeMm={(mm) =>
                      updateActive((l) => ({ ...l, heightMm: mm }))
                    }
                    unit={unit}
                    minMm={10}
                    maxMm={300}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Group>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleExport("png")}
                disabled={busy !== null}
                className="flex-1 h-10 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {busy === "png" ? "Exporting…" : "Export PNG"}
              </button>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={busy !== null}
                className="flex-1 h-10 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {busy === "pdf" ? "Exporting…" : "Export PDF"}
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
              Preview · Label {activeIndex + 1}
            </div>
            <div className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-md p-6 overflow-auto">
              <BarcodeLabel
                ref={labelRef}
                config={activeLabel}
                onMove={handleMove}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              Drag any element to reposition · Single-label exports render at 300 DPI.
            </p>
          </section>
        </main>
      ) : (
        <SheetPanel
          ref={sheetRef}
          labels={labels}
          sheet={sheet}
          setSheet={(updater) => setSheet((s) => updater(s))}
          onPrint={handleSheetPrint}
          onExportPdf={handleSheetPdf}
          busy={busy === "sheet-pdf"}
          unit={unit}
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300"
      />
      {label}
    </label>
  );
}

function PositionRow({ pos }: { pos: Position }) {
  return (
    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
      Position: {pos.xPct.toFixed(1)}%, {pos.yPct.toFixed(1)}% — drag on
      preview to move
    </div>
  );
}

function StyleControls({
  style,
  onChange,
}: {
  style: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>Size</span>
        <input
          type="number"
          min={6}
          max={48}
          value={style.fontSize}
          onChange={(e) =>
            onChange({ fontSize: Number(e.target.value) || 0 })
          }
          className="h-8 w-16 px-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
        />
      </label>
      <StyleToggleButton
        active={style.bold}
        onClick={() => onChange({ bold: !style.bold })}
        label="B"
        bold
      />
      <StyleToggleButton
        active={style.italic}
        onClick={() => onChange({ italic: !style.italic })}
        label="I"
        italic
      />
    </div>
  );
}

function StyleToggleButton({
  active,
  onClick,
  label,
  bold,
  italic,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 w-8 rounded-md border text-sm transition-colors ${
        active
          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
          : "border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
      style={{
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? "italic" : "normal",
      }}
    >
      {label}
    </button>
  );
}
