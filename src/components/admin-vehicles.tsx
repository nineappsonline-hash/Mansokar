"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CarFront,
  ChevronRight,
  Plus,
  Pencil,
  CalendarDays,
  Search,
} from "lucide-react";
import { VehiclePhotoUpload } from "./vehicle-photo-upload";
import { modelPhoto } from "@/lib/visuals";
import { ApiForm } from "./forms";
import { VehicleConfigurationEditor } from "./admin-vehicle-configuration";
import styles from "./admin-vehicles.module.css";
type Model = {
  id: string;
  brand: string;
  slug: string;
  name: { ar: string; en: string };
  image: string | null;
};
type Generation = {
  id: string;
  model_id: string;
  name: string;
  year_start: number;
  year_end: number | null;
};
export function AdminVehicles({
  models,
  media,
  brands,
  modelYears,
  configs,
  generations,
  initialId,
}: {
  media: Record<string, { url: string; alt: { ar: string; en: string } }>;
  models: Model[];
  brands: { slug: string; name: string; ar?: string }[];
  modelYears: { model_id: string; year: number }[];
  configs: Record<string, any>[];
  generations: Generation[];
  initialId?: string;
}) {
  const initialModel = models.find(
    (m) =>
      m.id ===
      (configs.find((c) => c.id === initialId)?.model_id ??
        generations.find((g) => g.id === initialId)?.model_id ??
        initialId),
  );
  const [brand, setBrand] = useState(
    initialModel?.brand || brands[0]?.slug || "",
  );
  const [modelId, setModelId] = useState(initialModel?.id || "");
  const [query, setQuery] = useState("");
  const [addingModel, setAddingModel] = useState(false);
  const [editingModel, setEditingModel] = useState(false);
  const [config, setConfig] = useState<Record<string, any> | null>(
    configs.find((c) => c.id === initialId) ?? null,
  );
  const model = models.find((m) => m.id === modelId);
  const selectedBrand = brands.find((b) => b.slug === brand);
  const matching = models.filter(
    (m) =>
      m.brand === brand &&
      `${m.name.en} ${m.name.ar}`.toLowerCase().includes(query.toLowerCase()),
  );
  const years = configs
    .filter((c) => c.model_id === modelId)
    .sort((a, b) => b.year - a.year || a.engine.localeCompare(b.engine));
  return (
    <div className="stack">
      <div className={styles.intro}>
        <CarFront size={24} />
        <div>
          <h2>Add the cars you sell parts for</h2>
          <p>
            Choose a make and model, then add each year and engine. These cars
            will appear when you create a product.
          </p>
        </div>
      </div>
      <section className="panel stack">
        <div className={styles.stepHeading}>
          <span>1</span>
          <div>
            <h2>Choose the car make</h2>
            <p>For example, Opel or Chevrolet.</p>
          </div>
        </div>
        <div className={styles.makes}>
          {brands.map((b) => (
            <button
              key={b.slug}
              type="button"
              aria-pressed={brand === b.slug}
              onClick={() => {
                setBrand(b.slug);
                setModelId("");
                setConfig(null);
                setAddingModel(false);
                setEditingModel(false);
                setQuery("");
              }}
            >
              <strong>{b.name}</strong>
              <small lang="ar" dir="rtl">
                {b.ar}
              </small>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        {selectedBrand && (
          <VehiclePhotoUpload
            key={`brand-${brand}`}
            slot={`brand-${brand}-photo`}
            title="Car make photo"
            name={{
              en: selectedBrand.name,
              ar: selectedBrand.ar || selectedBrand.name,
            }}
            initial={media[`brand-${brand}-photo`]}
            fallback={
              ["opel", "mg", "chevrolet", "peugeot", "citroen"].includes(brand)
                ? `/images/cinematic/${brand}-v2.webp`
                : undefined
            }
          />
        )}
      </section>
      <div className={styles.columns}>
        <section className="panel stack">
          <div className={styles.stepHeading}>
            <span>2</span>
            <div>
              <h2>Choose the model</h2>
              <p>
                {selectedBrand?.ar && selectedBrand.ar !== selectedBrand.name
                  ? `${selectedBrand.name} — ${selectedBrand.ar} models`
                  : `${selectedBrand?.name ?? brand} models`}
              </p>
            </div>
          </div>
          <label className={styles.search}>
            <Search size={16} />
            <input
              aria-label="Search car models"
              placeholder="Search models…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className={styles.modelList}>
            {matching.map((m) => (
              <button
                type="button"
                key={m.id}
                aria-pressed={modelId === m.id}
                onClick={() => {
                  setModelId(m.id);
                  setConfig(null);
                  setAddingModel(false);
                  setEditingModel(false);
                }}
              >
                <div>
                  <strong>{m.name.en}</strong>
                  <small lang="ar" dir="rtl">
                    {m.name.ar}
                  </small>
                </div>
                <span>
                  {configs.filter((c) => c.model_id === m.id).length} saved
                </span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          {!matching.length && (
            <p>No models found. Add the model below to get started.</p>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setAddingModel(!addingModel);
              setEditingModel(false);
              setConfig(null);
            }}
          >
            <Plus size={15} /> Add a model
          </button>
          {addingModel && <ModelForm key={brand} brand={brand} />}
        </section>
        <section className="panel stack">
          <div className={styles.stepHeading}>
            <span>3</span>
            <div>
              <h2>Years & engines</h2>
              <p>
                {model
                  ? `${brands.find((b) => b.slug === brand)?.name} ${model.name.en}`
                  : "Choose a model to see its cars."}
              </p>
            </div>
          </div>
          {!model ? (
            <div className={styles.empty}>
              <CarFront size={38} />
              <h3>Which model are you adding?</h3>
              <p>Select a model on the left, then add its year and engine.</p>
            </div>
          ) : (
            <>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setConfig({
                      id: crypto.randomUUID(),
                      model_id: model.id,
                      year: new Date().getFullYear(),
                      engine: "",
                      generation_id: null,
                    });
                    setEditingModel(false);
                  }}
                >
                  <Plus size={16} /> Add year & engine
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEditingModel(!editingModel);
                    setConfig(null);
                  }}
                >
                  <Pencil size={14} /> Edit model name
                </button>
                <DeleteRecord
                  kind="model"
                  id={model.id}
                  label={`model ${model.name.en}`}
                  onDeleted={() => {
                    setModelId("");
                    setConfig(null);
                    setEditingModel(false);
                  }}
                />
              </div>
              <VehiclePhotoUpload
                key={`model-${model.id}`}
                slot={`model-${model.brand}-${model.slug}`}
                title="Car model photo"
                name={{
                  en: `${selectedBrand?.name || model.brand} ${model.name.en}`,
                  ar: `${selectedBrand?.ar || model.brand} ${model.name.ar}`,
                }}
                initial={media[`model-${model.brand}-${model.slug}`]}
                fallback={
                  model.image || modelPhoto(`${model.brand}-${model.slug}`)
                }
              />
              {editingModel && (
                <ModelForm key={model.id} brand={brand} initial={model} />
              )}
              {config && (
                <VehicleConfigurationEditor
                  key={config.id}
                  initial={config}
                  models={models}
                  generations={generations}
                  fixedModel
                />
              )}
              {!!modelYears.filter((y) => y.model_id === model.id).length && (
                <div className="panel">
                  <h3>Registered model years</h3>
                  <p>
                    {modelYears
                      .filter((y) => y.model_id === model.id)
                      .map((y) => y.year)
                      .sort((a, b) => a - b)
                      .join(", ")}
                  </p>
                  <p>
                    Imported and product year ranges are registered here. Engine
                    configurations below are optional and added separately.
                  </p>
                </div>
              )}
              {!years.length && !config && (
                <div className={styles.empty}>
                  <CalendarDays size={34} />
                  <h3>No engine configurations added yet</h3>
                  <p>
                    Click “Add year & engine”. For example: 2021, 1.4 petrol
                    turbo. Add only the years and engines you have verified.
                  </p>
                </div>
              )}
              {years.length > 0 && (
                <div className={styles.yearList}>
                  {years.map((c) => (
                    <div key={c.id}>
                      <span className={styles.year}>{c.year}</span>
                      <div>
                        <strong>{c.engine}</strong>
                        <small>
                          {[
                            c.transmission?.replaceAll("_", " "),
                            c.body,
                            c.trim,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No additional details"}
                        </small>
                      </div>
                      <button
                        type="button"
                        aria-label={`Edit ${c.year} ${c.engine}`}
                        onClick={() => {
                          setConfig(c);
                          setEditingModel(false);
                        }}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <DeleteRecord
                        kind="car"
                        id={c.id}
                        label={`${model.name.en} ${c.year} · ${c.engine}`}
                        onDeleted={() => {
                          if (config?.id === c.id) setConfig(null);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <details>
                <summary>Optional: generations & chassis codes</summary>
                <p>
                  Use this only when you know the model’s generation (for
                  example, Astra J). It is optional when adding a year and
                  engine.
                </p>
                <GenerationForm modelId={model.id} />
                {generations
                  .filter((g) => g.model_id === model.id)
                  .map((g) => (
                    <details key={g.id}>
                      <summary>
                        {g.name} · {g.year_start}–{g.year_end ?? "present"}
                      </summary>
                      <GenerationForm modelId={model.id} initial={g} />
                      <DeleteRecord
                        kind="generation"
                        id={g.id}
                        label={`generation ${g.name}`}
                      />
                    </details>
                  ))}
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
function DeleteRecord({
  kind,
  id,
  label,
  onDeleted,
}: {
  kind: "car" | "model" | "generation";
  id: string;
  label: string;
  onDeleted?: () => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className={styles.deleteControl}>
      {!confirm ? (
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`Delete ${label}`}
          onClick={() => {
            setConfirm(true);
            setError("");
          }}
        >
          Delete
        </button>
      ) : (
        <div
          className={styles.confirm}
          role="group"
          aria-label={`Confirm deletion of ${label}`}
        >
          <p>Delete {label}? This cannot be undone.</p>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const response = await fetch(
                    "/api/admin-delete-vehicle-record",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ kind, id }),
                    },
                  );
                  const result = await response.json();
                  if (!response.ok) throw Error(result.error);
                  setConfirm(false);
                  onDeleted?.();
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to delete");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
function ModelForm({ brand, initial }: { brand: string; initial?: Model }) {
  const [name, setName] = useState(initial?.name || { ar: "", en: "" });
  const slug = name.en
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <div className={styles.inlineForm}>
      <h3>{initial ? "Edit model name" : "New model"}</h3>
      <ApiForm
        action="admin-model"
        label="Save model"
        extra={{
          json: JSON.stringify({
            id: initial?.id || `${brand}-${slug}`,
            brand,
            slug: initial?.slug || slug,
            name,
            image: initial?.image || null,
          }),
        }}
      >
        {(["en", "ar"] as const).map((lang) => (
          <label key={lang}>
            Model name · {lang === "en" ? "English" : "Arabic"}
            <input
              required
              maxLength={100}
              placeholder={lang === "en" ? "e.g. Astra" : "مثال: أسترا"}
              dir={lang === "ar" ? "rtl" : "ltr"}
              value={name[lang]}
              onChange={(e) => setName({ ...name, [lang]: e.target.value })}
            />
          </label>
        ))}
      </ApiForm>
    </div>
  );
}
function GenerationForm({
  modelId,
  initial,
}: {
  modelId: string;
  initial?: Generation;
}) {
  const [value, setValue] = useState(
    initial || {
      id: "",
      model_id: modelId,
      name: "",
      year_start: new Date().getFullYear(),
      year_end: null as number | null,
    },
  );
  return (
    <div className={styles.inlineForm}>
      <ApiForm
        action="admin-generation"
        label="Save generation"
        extra={{
          json: JSON.stringify({
            ...value,
            id:
              value.id ||
              `${modelId}-${value.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${value.year_start}`,
          }),
        }}
      >
        <label>
          Generation name
          <input
            required
            maxLength={100}
            placeholder="e.g. Astra J"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label>
          First year
          <input
            required
            type="number"
            min={1950}
            max={2100}
            value={value.year_start}
            onChange={(e) =>
              setValue({ ...value, year_start: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Last year (leave blank if still produced)
          <input
            type="number"
            min={value.year_start}
            max={2100}
            value={value.year_end ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                year_end: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
      </ApiForm>
    </div>
  );
}
