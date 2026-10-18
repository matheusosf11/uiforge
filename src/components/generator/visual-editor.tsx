"use client";

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACCENT_FAMILIES,
  applyVisual,
  detectAccent,
  detectNeutral,
  FAMILY_HEX,
  FAMILY_LABEL,
  NEUTRAL_FAMILIES,
  ORIGINAL_SETTINGS,
  type VisualSettings,
} from "@/lib/visual-edit";
import { cn } from "@/lib/utils";

type VisualEditorProps = {
  /** Code the edits start from (the version or draft when the panel opened). */
  base: string;
  /** Receives the edited code on every change. */
  onChange: (code: string) => void;
  /** Saves the current edits as a new version. */
  onSave: () => void;
  /** True when the edits differ from the saved version. */
  canSave: boolean;
  disabled?: boolean;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-xs font-medium text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function Swatches<T extends string>({
  name,
  families,
  current,
  value,
  onChange,
  disabled,
}: {
  name: string;
  families: readonly T[];
  current: T;
  value: T | null;
  onChange: (family: T) => void;
  disabled?: boolean;
}) {
  const selected = value ?? current;
  return (
    <div className="flex flex-wrap gap-1.5">
      {families.map((family) => {
        const label = FAMILY_LABEL[family as keyof typeof FAMILY_LABEL];
        return (
          <label key={family} className="relative" title={label}>
            <input
              type="radio"
              name={name}
              value={family}
              checked={selected === family}
              disabled={disabled}
              onChange={() => onChange(family)}
              className="peer sr-only"
              aria-label={family === current ? `${label} (atual)` : label}
            />
            <span
              aria-hidden
              className="flex size-7 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring max-md:size-10"
              style={{ backgroundColor: FAMILY_HEX[family as keyof typeof FAMILY_HEX] }}
            >
              {selected === family ? <Check className="size-3.5 text-white" /> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function Options<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={disabled}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="inline-flex cursor-pointer items-center rounded-md border border-border px-2 py-1 text-xs text-muted-foreground peer-checked:border-transparent peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring max-md:min-h-11">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function Steps({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const text = value === 0 ? "Original" : value > 0 ? `+${value}` : `${value}`;
  return (
    <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 text-xs">
      <label htmlFor={id} className="text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-valuetext={text}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary max-md:h-11"
      />
      <span className="text-right tabular-nums text-muted-foreground" aria-hidden>
        {text}
      </span>
    </div>
  );
}

export function VisualEditor({ base: baseProp, onChange, onSave, canSave, disabled }: VisualEditorProps) {
  // Frozen at mount: the edits themselves change the draft the parent passes.
  const [base] = useState(baseProp);
  const [settings, setSettings] = useState<VisualSettings>(ORIGINAL_SETTINGS);
  const accent = useMemo(() => detectAccent(base), [base]);
  const neutral = useMemo(() => detectNeutral(base), [base]);
  const prefix = useId();

  function update(patch: Partial<VisualSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    onChange(applyVisual(base, next));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">
        Ajuste o visual sem escrever prompts. O preview acompanha cada mudança; salve
        como versão quando gostar.
      </p>
      <Section title="Cor de destaque">
        {accent ? (
          <Swatches
            name={`${prefix}-accent`}
            families={ACCENT_FAMILIES}
            current={accent}
            value={settings.accent}
            disabled={disabled}
            onChange={(family) => update({ accent: family === accent ? null : family })}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Este componente não usa uma cor de destaque.
          </p>
        )}
      </Section>
      {neutral ? (
        <Section title="Tons neutros">
          <Swatches
            name={`${prefix}-neutral`}
            families={NEUTRAL_FAMILIES}
            current={neutral}
            value={settings.neutral}
            disabled={disabled}
            onChange={(family) => update({ neutral: family === neutral ? null : family })}
          />
        </Section>
      ) : null}
      <Section title="Tamanhos">
        <Steps
          label="Cantos"
          value={settings.radius}
          min={-3}
          max={3}
          disabled={disabled}
          onChange={(radius) => update({ radius })}
        />
        <Steps
          label="Espaçamento"
          value={settings.spacing}
          min={-3}
          max={3}
          disabled={disabled}
          onChange={(spacing) => update({ spacing })}
        />
        <Steps
          label="Texto"
          value={settings.text}
          min={-2}
          max={2}
          disabled={disabled}
          onChange={(text) => update({ text })}
        />
      </Section>
      <Section title="Bordas">
        <Options
          name={`${prefix}-border`}
          value={settings.border}
          disabled={disabled}
          onChange={(border) => update({ border })}
          options={[
            { value: "original", label: "Original" },
            { value: "none", label: "Sem borda" },
            { value: "thick", label: "Grossas" },
          ]}
        />
      </Section>
      <Section title="Fonte">
        <Options
          name={`${prefix}-font`}
          value={settings.font}
          disabled={disabled}
          onChange={(font) => update({ font })}
          options={[
            { value: "original", label: "Original" },
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serifada" },
            { value: "mono", label: "Mono" },
          ]}
        />
      </Section>
      <div className={cn("mt-auto flex flex-wrap justify-end gap-2 pt-2")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs max-md:min-h-11"
          disabled={disabled}
          onClick={() => {
            setSettings(ORIGINAL_SETTINGS);
            onChange(base);
          }}
        >
          <RotateCcw aria-hidden />
          Restaurar original
        </Button>
        <Button
          type="button"
          size="sm"
          className="text-xs max-md:min-h-11"
          disabled={disabled || !canSave}
          onClick={onSave}
        >
          <Save aria-hidden />
          Salvar como versão
        </Button>
      </div>
    </div>
  );
}
