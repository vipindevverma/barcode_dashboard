"use client";

import { useRef, useState } from "react";
import BarcodeLabel, { ExtraField, LabelConfig } from "./BarcodeLabel";
import { exportPdf, exportPng } from "@/lib/exporters";

const PRESETS: { name: string; widthMm: number; heightMm: number }[] = [
  { name: "Small (50×30 mm)", widthMm: 50, heightMm: 30 },
  { name: "Medium (70×40 mm)", widthMm: 70, heightMm: 40 },
  { name: "Large (100×60 mm)", widthMm: 100, heightMm: 60 },
  { name: "Shipping (100×150 mm)", widthMm: 100, heightMm: 150 },
];

const initialConfig: LabelConfig = {
  value: "ABC-12345",
  title: "Product Name",
  subtitle: "SKU: ABC-12345",
  extras: [],
  widthMm: 70,
  heightMm: 40,
  showValue: true,
  barHeight: 50,
  fontSize: 12,
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Dashboard() {
  const [config, setConfig] = useState<LabelConfig>(initialConfig);
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof LabelConfig>(key: K, value: LabelConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const addExtra = () =>
    setConfig((c) => ({
      ...c,
      extras: [...c.extras, { id: uid(), label: "", value: "" }],
    }));

  const updateExtra = (id: string, patch: Partial<ExtraField>) =>
    setConfig((c) => ({
      ...c,
      extras: c.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const removeExtra = (id: string) =>
    setConfig((c) => ({ ...c, extras: c.extras.filter((e) => e.id !== id) }));

  const filename = (config.value || "barcode-label")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .slice(0, 40);

  const handleExport = async (kind: "png" | "pdf") => {
    if (!labelRef.current) return;
    setBusy(kind);
    try {
      if (kind === "png") {
        await exportPng(labelRef.current, config.widthMm, filename);
      } else {
        await exportPdf(
          labelRef.current,
          config.widthMm,
          config.heightMm,
          filename,
        );
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Barcode Label Generator
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Code 128 · Live preview · Export as PNG or PDF
        </p>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 p-6">
        <section className="space-y-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
          <Group title="Barcode">
            <Field label="Value (Code 128)">
              <input
                type="text"
                value={config.value}
                onChange={(e) => update("value", e.target.value)}
                className={inputCls}
                placeholder="e.g. ABC-12345"
              />
            </Field>
            <Toggle
              label="Show value text below bars"
              checked={config.showValue}
              onChange={(v) => update("showValue", v)}
            />
          </Group>

          <Group title="Text">
            <Field label="Title (top)">
              <input
                type="text"
                value={config.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Subtitle (bottom)">
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                className={inputCls}
              />
            </Field>
          </Group>

          <Group title="Extra fields">
            <div className="space-y-2">
              {config.extras.map((extra) => (
                <div key={extra.id} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Label"
                    value={extra.label}
                    onChange={(e) =>
                      updateExtra(extra.id, { label: e.target.value })
                    }
                    className={`${inputCls} w-1/3`}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={extra.value}
                    onChange={(e) =>
                      updateExtra(extra.id, { value: e.target.value })
                    }
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeExtra(extra.id)}
                    className="px-2 text-zinc-500 hover:text-red-600"
                    aria-label="Remove field"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addExtra}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                + Add field
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
                    update("widthMm", preset.widthMm);
                    update("heightMm", preset.heightMm);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a preset…
                </option>
                {PRESETS.map((p, i) => (
                  <option key={p.name} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width (mm)">
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={config.widthMm}
                  onChange={(e) =>
                    update("widthMm", Number(e.target.value) || 0)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Height (mm)">
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={config.heightMm}
                  onChange={(e) =>
                    update("heightMm", Number(e.target.value) || 0)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Bar height">
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={config.barHeight}
                  onChange={(e) =>
                    update("barHeight", Number(e.target.value) || 0)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Font size">
                <input
                  type="number"
                  min={8}
                  max={32}
                  value={config.fontSize}
                  onChange={(e) =>
                    update("fontSize", Number(e.target.value) || 0)
                  }
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
            Preview
          </div>
          <div className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-md p-6 overflow-auto">
            <BarcodeLabel ref={labelRef} config={config} />
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Exports render at 300 DPI for sharp printing.
          </p>
        </section>
      </main>
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
