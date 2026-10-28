"use client";
import { useState } from "react";
import { ApiForm } from "./forms";
import { targetBrands } from "@/lib/vehicle-coverage";
import {
  fuelTypes,
  inductionTypes,
  transmissionTypes,
} from "@/lib/vehicle-input";

type Model = { id: string; brand: string; name: { en: string } };
type Generation = {
  id: string;
  model_id: string;
  name: string;
  year_start: number;
  year_end: number | null;
};
export function VehicleConfigurationEditor({
  initial,
  models,
  generations,
}: {
  initial: Record<string, any>;
  models: Model[];
  generations: Generation[];
}) {
  const [value, setValue] = useState(initial);
  const [brand, setBrand] = useState(
    models.find((m) => m.id === initial.model_id)?.brand ?? "opel",
  );
  const set = (key: string, next: unknown) =>
    setValue((v: typeof initial) => ({ ...v, [key]: next }));
  const input = (
    key: string,
    label: string,
    numeric = false,
    required = false,
  ) => (
    <label key={key}>
      {label}
      <input
        type={numeric ? "number" : "text"}
        value={value[key] ?? ""}
        required={required}
        min={numeric ? (key === "year" ? 1950 : 1) : undefined}
        max={numeric ? (key === "year" ? 2100 : 20000) : undefined}
        onChange={(e) =>
          set(
            key,
            numeric
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    </label>
  );
  const select = (key: string, label: string, options: readonly string[]) => (
    <label key={key}>
      {label}
      <select
        value={value[key] ?? ""}
        onChange={(e) => set(key, e.target.value || null)}
      >
        <option value="">Not supplied / unknown</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
  const matchingModels = models.filter((m) => m.brand === brand);
  return (
    <section className="panel stack">
      <h2>Exact vehicle configuration</h2>
      <p className="muted">
        Save the brand/model first, then its generation and year range. Create
        one exact configuration per model year. Leave optional details blank
        when unknown; this does not confirm any product fitment.
      </p>
      <ApiForm
        action="admin-vehicle"
        label="Save vehicle configuration"
        extra={{ json: JSON.stringify(value) }}
      >
        {input("id", "Configuration identifier", false, true)}
        <label>
          Vehicle brand
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setValue({
                ...value,
                model_id:
                  models.find((m) => m.brand === e.target.value)?.id ?? "",
                generation_id: null,
              });
            }}
          >
            {targetBrands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vehicle model
          <select
            required
            value={value.model_id ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                model_id: e.target.value,
                generation_id: null,
              })
            }
          >
            <option value="">Choose a model</option>
            {matchingModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name.en}
              </option>
            ))}
          </select>
        </label>
        {!matchingModels.length && <p>Create a model for this brand first.</p>}
        <label>
          Generation / chassis code
          <select
            value={value.generation_id ?? ""}
            onChange={(e) => set("generation_id", e.target.value || null)}
          >
            <option value="">Not supplied</option>
            {generations
              .filter((g) => g.model_id === value.model_id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.year_start}–{g.year_end ?? "ongoing"}
                </option>
              ))}
          </select>
        </label>
        {input("year", "Exact model year", true, true)}
        {input(
          "engine",
          "Engine description (e.g. 1.4 petrol turbo)",
          false,
          true,
        )}
        {input(
          "engine_capacity",
          "Engine capacity · cc (1400 = 1.4 litres)",
          true,
        )}
        {select("fuel_type", "Fuel / powertrain", fuelTypes)}
        {select("forced_induction", "Turbo / forced induction", inductionTypes)}
        {input("engine_code", "Engine code (optional)")}
        {select("transmission", "Transmission", transmissionTypes)}
        {input("body", "Body style (sedan, hatchback, SUV…)")}
        {input("trim", "Trim / equipment version (when relevant)")}
      </ApiForm>
    </section>
  );
}
