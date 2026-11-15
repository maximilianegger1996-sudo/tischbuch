import { useMemo, useState, type CSSProperties } from "react";
import { BookingProvider, useBooking, type StepId } from "./state/booking";
import { formatMoney } from "./lib/money";
import { BRANCHES } from "./api/branches";
import {
  PACKAGES,
  findPackageForLines,
  packageDailyLabel,
  type RentalPackage,
} from "./lib/packages";
import { curatedExtras } from "./lib/catalog";
import { assetUrl } from "./api/assets";
import type { Product } from "./api";

const DOW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function euroDaily(product: Product, kind: string) {
  return formatMoney(product.displayDaily[kind] || product.displayDaily["1"]);
}

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: string, to: string) {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86400000) + 1;
}

function earlyBirdPercent(day: Date, today: Date) {
  const ahead = Math.floor((day.getTime() - today.getTime()) / 86400000);
  if (ahead < 1) return 0;
  if (ahead >= 60) return 20;
  return 10;
}

function personSummary(draft: ReturnType<typeof useBooking>["draft"]) {
  const adults = draft.persons.filter((p) => p.kind === "adult").length;
  const kids = draft.persons.length - adults;
  const parts = [];
  if (adults) parts.push(`${adults}× Erwachsen`);
  if (kids) parts.push(`${kids}× Kind/Jugend`);
  return { detail: parts.join(" · ") || "—" };
}

function TopBar() {
  const { draft, quote, locations, setStep, step } = useBooking();
  const people = personSummary(draft);
  const loc = locations.find((l) => l.id === draft.locationId) || BRANCHES.find((b) => b.id === draft.locationId);
  const dayCount = draft.from && draft.to ? `${daysBetween(draft.from, draft.to)} Tage` : "0 Tage";
  const products = draft.persons.reduce((n, p) => n + p.lines.length, 0);
  const range =
    draft.from && draft.to
      ? `${draft.from.slice(8)}.${draft.from.slice(5, 7)}. – ${draft.to.slice(8)}.${draft.to.slice(5, 7)}.`
      : dayCount;

  const slots: Array<{ id: string; label: string; value: string; unlock: boolean; go?: StepId }> = [
    { id: "people", label: "Personen", value: people.detail, unlock: true, go: "people" },
    { id: "dates", label: range === dayCount ? "Tage" : "Zeitraum", value: range, unlock: draft.persons.length > 0, go: "dates" },
    { id: "location", label: "Abholort", value: loc?.title || "wählen", unlock: !!(draft.from && draft.to), go: "location" },
    { id: "products", label: "Paket", value: products ? `${products} Teile` : "wählen", unlock: !!(draft.from && draft.to && draft.locationId), go: "products" },
    {
      id: "cart",
      label: "Summe",
      value: formatMoney(quote?.cartTotal) || "—",
      unlock: draft.persons.some((p) => p.lines.length > 0),
      go: draft.persons.some((p) => p.lines.length > 0) ? "review" : undefined,
    },
  ];

  if (step === "people") return null;

  return (
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => setStep("people")}>
        <img src={assetUrl("brand/logo-mark.svg")} alt="FREUDENHAUS" />
        <span className="brand-mark">Rentfreudenhaus</span>
      </a>
      <div className="progress-slots">
        {slots.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`progress-slot${step === s.go ? " active" : ""}`}
            disabled={!s.unlock || !s.go}
            onClick={() => s.go && s.unlock && setStep(s.go)}
          >
            <span className="label">{s.label}</span>
            <span className="value">{s.value}</span>
          </button>
        ))}
      </div>
      <div className="topbar-meta">Obertauern</div>
    </header>
  );
}

function StepPeople() {
  const { draft, site, setAdults, setKids, next, resetBooking } = useBooking();
  const [open, setOpen] = useState(false);
  const adults = draft.persons.filter((p) => p.kind === "adult").length;
  const kidPersons = draft.persons.filter((p) => p.kind !== "adult");
  const max = site?.maxPersons ?? 20;
  const summary = personSummary(draft).detail;

  return (
    <section
      className="people-hero"
      style={
        {
          "--hero-image": `url(${site?.bgImage || "https://www.skirent-obertauern.at/img/hero-video-poster.jpg"})`,
        } as CSSProperties
      }
    >
      <div className="brand-float">
        <img src={assetUrl("brand/logo-white.svg")} alt="FREUDENHAUS" />
      </div>
      <div className="people-center anim-rise">
        <p className="hero-kicker">Mehr Piste. Weniger Gepäck.</p>
        <h1>Wie viele Personen möchten leihen?</h1>
        <button type="button" className="people-picker" onClick={() => setOpen((v) => !v)}>
          <span>{summary}</span>
          <span className="chev">{open ? "▴" : "▾"}</span>
        </button>
        <button type="button" className="people-reset" onClick={resetBooking}>
          Neu starten?
        </button>
        <button type="button" className="btn accent" onClick={next}>
          Weiter zum Zeitraum
        </button>
        <div className="hero-trust">Online −20 % / −10 % · Abholung am Vortag · 4,8★</div>
      </div>
      {open ? (
        <div className="people-sheet anim-rise">
          <div className="row-line">
            <div>
              <strong>Erwachsene</strong>
              <div className="muted">ab {site?.adultAge ?? 17} Jahren</div>
            </div>
            <div className="counter">
              <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))}>
                −
              </button>
              <span>{adults}</span>
              <button type="button" onClick={() => setAdults(Math.min(max, adults + 1))}>
                +
              </button>
            </div>
          </div>
          <div className="row-line">
            <div>
              <strong>Kinder / Jugend</strong>
              <div className="muted">Alter am ersten Leihtag · unter 11 oft gratis*</div>
            </div>
            <div className="counter">
              <button type="button" onClick={() => setKids(kidPersons.slice(0, -1).map((p) => p.age || 10))}>
                −
              </button>
              <span>{kidPersons.length}</span>
              <button
                type="button"
                onClick={() =>
                  setKids([...kidPersons.map((p) => p.age || 10), 10].slice(0, max - adults))
                }
              >
                +
              </button>
            </div>
          </div>
          {kidPersons.length > 0 && (
            <div className="grid-2">
              {kidPersons.map((p, i) => (
                <div className="field" key={p.id}>
                  <label>Alter Kind {i + 1}</label>
                  <select
                    value={p.age || 10}
                    onChange={(e) => {
                      const ages = kidPersons.map((x) => x.age || 10);
                      ages[i] = Number(e.target.value);
                      setKids(ages);
                    }}
                  >
                    {Array.from({ length: (site?.adultAge ?? 17) - 1 }, (_, n) => n + 1).map((age) => (
                      <option key={age} value={age}>
                        {age} Jahre
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("de-AT", { month: "long", year: "numeric" });
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function StepDates() {
  const { draft, setDates, site } = useBooking();
  const seasonStart = site?.seasonStart ? new Date(site.seasonStart) : new Date(2026, 10, 20);
  const seasonEnd = site?.seasonEnd ? new Date(site.seasonEnd) : new Date(2027, 3, 14);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = seasonStart > today ? seasonStart : today;

  const [viewStart, setViewStart] = useState(() => new Date(minDate));
  const WINDOW = 14;
  const days = Array.from({ length: WINDOW }, (_, i) => addDays(viewStart, i)).filter(
    (d) => d <= seasonEnd,
  );

  const canPrev = addDays(viewStart, -7) >= addDays(minDate, -6);
  const canNext = addDays(viewStart, WINDOW) <= seasonEnd;

  const onPick = (d: Date) => {
    const v = iso(d);
    if (!draft.from || (draft.from && draft.to)) {
      setDates(v, null);
      return;
    }
    if (v < draft.from) setDates(v, draft.from);
    else setDates(draft.from, v);
  };

  const inRange = (d: Date) => {
    if (!draft.from) return false;
    const v = iso(d);
    if (!draft.to) return v === draft.from;
    return v >= draft.from && v <= draft.to;
  };

  const bird =
    draft.from && draft.to ? earlyBirdPercent(parseIso(draft.from), today) : 0;

  const rangeLabel =
    days.length > 0
      ? `${days[0].toLocaleDateString("de-AT", { day: "numeric", month: "short" })} – ${days[days.length - 1].toLocaleDateString("de-AT", { day: "numeric", month: "short" })}`
      : monthLabel(viewStart);

  return (
    <>
      <div
        className="hero-strip"
        style={
          {
            "--hero-image": `url(${site?.bgImage || "https://www.skirent-obertauern.at/img/hero-video-poster.jpg"})`,
          } as CSSProperties
        }
      />
      <section className="step-stage anim-rise">
        <div className="stage-head">
          <h2>Wähle deinen Leihzeitraum</h2>
          <p>Start- und Endtag tippen — Online-Rabatt siehst du direkt auf den Tagen.</p>
        </div>
        <div className="date-nav">
          <button
            type="button"
            className="btn ghost"
            disabled={!canPrev}
            onClick={() => setViewStart(addDays(viewStart, -7))}
          >
            ←
          </button>
          <strong>{rangeLabel}</strong>
          <button
            type="button"
            className="btn ghost"
            disabled={!canNext}
            onClick={() => setViewStart(addDays(viewStart, 7))}
          >
            →
          </button>
        </div>
        <div className="day-grid day-grid-compact">
          {days.map((d) => {
            const disabled = d < minDate || d > seasonEnd;
            const pct = disabled ? 0 : earlyBirdPercent(d, today);
            const selected = draft.from === iso(d) || draft.to === iso(d);
            return (
              <button
                key={iso(d)}
                type="button"
                className={`day-card${inRange(d) ? " in-range" : ""}${selected ? " selected" : ""}`}
                disabled={disabled}
                onClick={() => onPick(d)}
              >
                <span className="dow">{DOW[(d.getDay() + 6) % 7]}</span>
                <span className="num">{d.getDate()}</span>
                <span className="badge">
                  {selected && draft.from === iso(d) && !draft.to
                    ? "Start"
                    : selected && draft.to === iso(d)
                      ? `${daysBetween(draft.from!, draft.to)} T`
                      : pct
                        ? `−${pct}%`
                        : "·"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="range-note">
          {draft.from && draft.to
            ? `${daysBetween(draft.from, draft.to)} Tage${bird ? ` · −${bird}% Online` : ""}`
            : draft.from
              ? "Endtag tippen"
              : "Starttag tippen"}
        </div>
      </section>
    </>
  );
}

function StepLocation() {
  const { locations, draft, setLocation, setPickupDayBefore, site, next } = useBooking();
  const [q, setQ] = useState("");
  const merged = BRANCHES.map((b) => {
    const live = locations.find((l) => l.id === b.id);
    return { ...b, title: live?.title || b.title, image: live?.image || b.image };
  });
  const filtered = merged.filter((b) => {
    const hay = `${b.title} ${b.short} ${b.address}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <section className="step-stage anim-rise">
      <div className="stage-head">
        <h2>Wähle deinen Abholort</h2>
        <p>Fünf Stationen an der Piste — Abholung dort, wo du in den Lift steigst.</p>
      </div>
      <div className="field loc-search">
        <label>Suche Hotel / Ort</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="z. B. Edelweiss, Ringstraße…"
        />
      </div>
      <div className="loc-grid">
        {filtered.map((L) => (
          <div key={L.id} className={`loc-card${draft.locationId === L.id ? " selected" : ""}`}>
            {L.image ? <img src={L.image} alt="" /> : <div style={{ height: 160, background: "#eee" }} />}
            <div className="body">
              {L.highlight ? <span className="tag">{L.highlight}</span> : null}
              <h3>{L.title}</h3>
              <div className="muted">{L.address}</div>
              <div className="loc-meta">
                <span>{L.hours}</span>
                {L.opensFrom ? <span>{L.opensFrom}</span> : null}
              </div>
              <button
                type="button"
                className={`btn${draft.locationId === L.id ? " accent" : ""}`}
                style={{ padding: "12px 22px", marginTop: "0.75rem" }}
                onClick={() => {
                  setLocation(L.id);
                  next();
                }}
              >
                Hier leihen
              </button>
            </div>
          </div>
        ))}
      </div>
      {!filtered.length && <div className="notice">Keine Filiale gefunden — Suche leeren.</div>}
      <label className="check" style={{ marginTop: "1.25rem" }}>
        <input
          type="checkbox"
          checked={draft.pickupDayBefore}
          onChange={(e) => setPickupDayBefore(e.target.checked)}
        />
        <span>Am Vortag abholen (ab {site?.pickupTime || "15:00"} Uhr) — entspannter erster Skitag.</span>
      </label>
    </section>
  );
}

function personLabel(
  person: { id: string; kind: string },
  persons: Array<{ id: string; kind: string }>,
) {
  if (person.kind === "adult") {
    const n = persons.filter((p) => p.kind === "adult").findIndex((p) => p.id === person.id) + 1;
    return `Erwachsener ${n}`;
  }
  const kids = persons.filter((p) => p.kind !== "adult");
  const n = kids.findIndex((p) => p.id === person.id) + 1;
  return person.kind === "youth" ? `Jugendliche/r ${n}` : `Kind ${n}`;
}

function hasPackage(person: { lines: Array<{ productId: string }> }) {
  return !!findPackageForLines(person.lines.map((l) => l.productId));
}

function PackageCard({
  pack,
  active,
  products,
  kindCode,
  onSelect,
}: {
  pack: RentalPackage;
  active: boolean;
  products: Product[];
  kindCode: string;
  onSelect: () => void;
}) {
  const ski = products.find((p) => p.id === pack.skiProductId);
  // Prefer a single model photo over the product collage (less visual clutter).
  const img = ski?.models.find((m) => m.image)?.image || ski?.image;
  return (
    <button
      type="button"
      className={`pack-card${active ? " active" : ""}`}
      onClick={onSelect}
    >
      {img ? <img src={img} alt="" /> : <div className="pack-ph" />}
      <div className="pack-body">
        {pack.highlight ? <span className="tag">{pack.highlight}</span> : null}
        <h3>{pack.title}</h3>
        <p className="muted">{pack.subtitle}</p>
        <div className="price">{packageDailyLabel(pack, products, kindCode)}</div>
        <span className="pack-cta">{active ? "Zugewiesen · tippen zum Ändern" : "Auswählen"}</span>
      </div>
    </button>
  );
}

function StepProducts() {
  const {
    quoteLoading,
    draft,
    products,
    applyPackageToPersons,
    clearPackage,
    setModel,
    clearModel,
    toggleProduct,
    activePersonId,
    setActivePersonId,
  } = useBooking();
  const [showExtras, setShowExtras] = useState(false);
  const [assignPack, setAssignPack] = useState<RentalPackage | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);

  const person = draft.persons.find((p) => p.id === activePersonId) || draft.persons[0];
  const kindCode = person?.kind === "youth" ? "2" : person?.kind === "kid" ? "3" : "1";
  const activePack = findPackageForLines(person?.lines.map((l) => l.productId) || []);
  const skiLine = person?.lines.find((l) =>
    PACKAGES.some((p) => p.skiProductId === l.productId),
  );
  const skiProduct = products.find((p) => p.id === skiLine?.productId);
  const extras = curatedExtras(products);
  const missing = draft.persons.filter((p) => !hasPackage(p));
  const nextMissing = missing.find((p) => p.id !== person?.id) || missing[0];

  const openAssign = (pack: RentalPackage) => {
    const without = draft.persons.filter((p) => !hasPackage(p)).map((p) => p.id);
    const initial =
      without.length > 0
        ? without
        : person
          ? [person.id]
          : draft.persons.map((p) => p.id);
    setAssignIds(initial);
    setAssignPack(pack);
  };

  const confirmAssign = () => {
    if (!assignPack || !assignIds.length) return;
    applyPackageToPersons(assignIds, assignPack, products);
    const stillOpen = draft.persons.find((p) => !assignIds.includes(p.id) && !hasPackage(p));
    const focus =
      stillOpen || draft.persons.find((p) => assignIds.includes(p.id)) || draft.persons[0];
    if (focus) setActivePersonId(focus.id);
    setAssignPack(null);
  };

  const toggleAssignId = (id: string) => {
    setAssignIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  return (
    <section className="step-stage anim-rise">
      <div className="stage-head">
        <h2>Dein Paket</h2>
        <p>Paket wählen und den Personen zuweisen — wie bei Rent Buddy.</p>
      </div>

      <div className="person-tabs" id="rfh-person-tabs">
        {draft.persons.map((p) => {
          const packTitle = findPackageForLines(p.lines.map((l) => l.productId))?.title.replace(
            "Paket ",
            "",
          );
          const label = personLabel(p, draft.persons);
          return (
            <button
              key={p.id}
              type="button"
              className={`${p.id === person?.id ? "active" : ""}${hasPackage(p) ? " done" : " todo"}`}
              onClick={() => setActivePersonId(p.id)}
            >
              {packTitle ? `${label} · ${packTitle}` : label}
            </button>
          );
        })}
      </div>

      {missing.length > 0 && hasPackage(person!) && nextMissing && nextMissing.id !== person?.id && (
        <div className="person-handoff anim-rise">
          <div>
            <strong>{personLabel(person!, draft.persons)} ist ausgerüstet</strong>
            <p className="muted">Als Nächstes: {personLabel(nextMissing, draft.persons)}</p>
          </div>
          <button
            type="button"
            className="btn accent"
            onClick={() => setActivePersonId(nextMissing.id)}
          >
            Weiter zu {personLabel(nextMissing, draft.persons)}
          </button>
        </div>
      )}

      {quoteLoading && <div className="muted">Preise werden geladen…</div>}
      <div className="pack-grid">
        {PACKAGES.map((pack) => (
          <PackageCard
            key={pack.id}
            pack={pack}
            active={activePack?.id === pack.id}
            products={products}
            kindCode={kindCode}
            onSelect={() => openAssign(pack)}
          />
        ))}
      </div>

      {activePack && (
        <button
          type="button"
          className="linkish"
          onClick={() => person && clearPackage(person.id)}
        >
          Paket von {personLabel(person!, draft.persons)} entfernen
        </button>
      )}

      {activePack && skiProduct && skiProduct.models.length > 0 && (
        <div className="model-panel anim-rise">
          <div className="model-head">
            <strong>Modell für {personLabel(person!, draft.persons)} (optional)</strong>
            <span className="muted">max. {skiProduct.models.length}</span>
          </div>
          <div className="model-grid">
            {skiProduct.models.map((m) => {
              const on = skiLine?.modelId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`model-card${on ? " active" : ""}`}
                  onClick={() => {
                    if (!person || !skiLine) return;
                    if (on) {
                      clearModel(person.id, skiLine.productId);
                      return;
                    }
                    const variant = m.variants.find((v) => !v.disabled) || m.variants[0];
                    setModel(
                      person.id,
                      skiLine.productId,
                      m.id,
                      variant?.property1 || "",
                      m.title,
                      m.image,
                    );
                  }}
                >
                  {m.image ? <img src={m.image} alt="" /> : <div className="model-ph" />}
                  <span className="model-brand">{m.brand || " "}</span>
                  <span className="model-title">{m.title}</span>
                </button>
              );
            })}
          </div>
          {skiLine?.modelId && (
            <div className="chip-row" style={{ marginTop: "0.75rem" }}>
              {(skiProduct.models.find((m) => m.id === skiLine.modelId)?.variants || []).map((v) => (
                <button
                  key={v.property1}
                  type="button"
                  className={`chip${skiLine.property1 === v.property1 ? " active" : ""}`}
                  disabled={v.disabled}
                  onClick={() => {
                    const m = skiProduct.models.find((x) => x.id === skiLine.modelId);
                    if (!person || !m) return;
                    setModel(person.id, skiLine.productId, m.id, v.property1, m.title, m.image);
                  }}
                >
                  {v.property1}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                onClick={() => person && skiLine && clearModel(person.id, skiLine.productId)}
              >
                Modell entfernen
              </button>
            </div>
          )}
        </div>
      )}

      {extras.length > 0 && (
        <>
          <button type="button" className="linkish" onClick={() => setShowExtras((v) => !v)}>
            {showExtras
              ? "Extras ausblenden"
              : `Extras für ${personLabel(person!, draft.persons)} (${extras.length})`}
          </button>
          {showExtras && (
            <div className="product-grid" style={{ marginTop: "0.75rem" }}>
              {extras.map((product) => {
                const selected = person?.lines.some((l) => l.productId === product.id);
                return (
                  <div key={product.id} className={`product-card${selected ? " is-on" : ""}`}>
                    {product.image ? <img src={product.image} alt="" /> : <div className="ph" />}
                    <div className="body">
                      <h3>{product.title}</h3>
                      <div className="price">ab {euroDaily(product, kindCode)} / Tag</div>
                      <button
                        type="button"
                        className={`btn${selected ? " accent" : ""}`}
                        style={{ padding: "12px 20px", marginTop: "0.35rem" }}
                        onClick={() => person && toggleProduct(person.id, product)}
                      >
                        {selected ? "Entfernen" : "Hinzufügen"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {assignPack && (
        <div className="assign-overlay" role="dialog" aria-modal="true">
          <div className="assign-panel anim-rise">
            <div className="assign-kicker">Personen zuweisen</div>
            <h3>{assignPack.title}</h3>
            <p className="muted">
              Wähle bitte die gewünschten Personen für dieses Paket aus. Modell kannst du danach
              optional festlegen.
            </p>
            <div className="assign-list">
              {draft.persons.map((p) => {
                const on = assignIds.includes(p.id);
                const k = p.kind === "youth" ? "2" : p.kind === "kid" ? "3" : "1";
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`assign-row${on ? " active" : ""}`}
                    onClick={() => toggleAssignId(p.id)}
                  >
                    <span className={`assign-check${on ? " on" : ""}`} aria-hidden />
                    <span className="assign-name">{personLabel(p, draft.persons)}</span>
                    <span className="assign-price">
                      {packageDailyLabel(assignPack, products, k)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="assign-actions">
              <button type="button" className="btn ghost" onClick={() => setAssignPack(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn accent"
                disabled={!assignIds.length}
                onClick={confirmAssign}
              >
                Weiter
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StepDetails() {
  const { draft, updatePerson, setRemark, setDiscount, setNewsletter, setTerms, next, specials } =
    useBooking();
  const main = draft.persons[0];
  const insurance = specials.find((s) => s.type === 1);

  return (
    <section className="step-stage stack anim-rise">
      <div className="stage-head">
        <h2>Fast geschafft</h2>
        <p>Nur die wichtigsten Daten — Zahlung folgt im nächsten Schritt.</p>
      </div>
      {draft.persons.map((p, i) => (
        <div
          key={p.id}
          className="stack"
          style={{ borderTop: i ? "1px solid var(--line)" : undefined, paddingTop: i ? "1rem" : 0 }}
        >
          <strong>
            Person {i + 1}
            {i === 0 ? " · Hauptgast" : ""}
          </strong>
          <div className="grid-2">
            <div className="field">
              <label>Vorname</label>
              <input
                value={p.firstName}
                onChange={(e) => updatePerson(p.id, { firstName: e.target.value })}
                autoComplete="given-name"
              />
            </div>
            <div className="field">
              <label>Nachname</label>
              <input
                value={p.lastName}
                onChange={(e) => updatePerson(p.id, { lastName: e.target.value })}
                autoComplete="family-name"
              />
            </div>
            {i === 0 && (
              <>
                <div className="field">
                  <label>E-Mail</label>
                  <input
                    type="email"
                    value={p.email || ""}
                    onChange={(e) => updatePerson(p.id, { email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label>Telefon</label>
                  <input
                    value={p.phone || ""}
                    onChange={(e) => updatePerson(p.id, { phone: e.target.value })}
                    autoComplete="tel"
                  />
                </div>
              </>
            )}
          </div>
          {insurance && (
            <label className="check">
              <input
                type="checkbox"
                checked={p.coverage}
                onChange={(e) => updatePerson(p.id, { coverage: e.target.checked })}
              />
              <span>
                {insurance.title} (empfohlen)
                <span className="muted"> — Diebstahl & Bruch ohne Selbstbehalt</span>
              </span>
            </label>
          )}
        </div>
      ))}
      <details className="more-details">
        <summary>Rabattcode / Anmerkung</summary>
        <div className="stack" style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label>Rabattcode</label>
            <input value={draft.discountCode} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="field">
            <label>Anmerkung</label>
            <textarea rows={2} value={draft.remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
        </div>
      </details>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
        />
        <span>Neues vom Freudenhaus per E-Mail</span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.termsAccepted}
          onChange={(e) => setTerms(e.target.checked)}
        />
        <span>AGB und Datenschutz akzeptieren</span>
      </label>
      <div className="center-cta">
        <button
          type="button"
          className="btn accent"
          disabled={!main?.firstName || !main?.lastName || !main?.email || !draft.termsAccepted}
          onClick={next}
        >
          Zur Zahlung / Übersicht
        </button>
      </div>
      <div className="pay-brands muted">Bald: Karte · PayPal · Apple Pay · Google Pay</div>
    </section>
  );
}

function StepReview() {
  const { draft, quote, locations, submit, submitting, products, resetBooking } = useBooking();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    bookingId?: string;
  } | null>(null);
  const loc =
    locations.find((l) => l.id === draft.locationId) ||
    BRANCHES.find((b) => b.id === draft.locationId);

  const onSubmit = async () => {
    const res = await submit();
    setResult(res);
  };

  if (result?.ok) {
    return (
      <section className="step-stage anim-rise">
        <div className="success-card stack">
          <div className="success-badge">Reserviert</div>
          <h2>Danke — wir sehen uns auf der Piste</h2>
          <p className="muted">
            Vorgang <strong>{result.bookingId}</strong>
          </p>
          <div className="confirm-code">{(result.bookingId || "RFH").slice(-8)}</div>
          <div className="notice">
            <strong>Was jetzt?</strong>
            <ol className="next-list">
              <li>Bestätigung kommt per E-Mail</li>
              <li>
                Abholung {loc?.title || "Filiale"}
                {draft.pickupDayBefore ? " — gern schon am Vortag ab 15:00" : ""}
              </li>
              <li>Code / Name an der Theke nennen</li>
            </ol>
          </div>
          <button type="button" className="btn" onClick={resetBooking}>
            Neue Buchung
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="step-stage stack anim-rise">
      <div className="stage-head">
        <h2>Prüfen & zahlen</h2>
        <p>
          {loc?.title} · {draft.from} → {draft.to}
        </p>
      </div>
      <div className="review-total">
        <span>Summe</span>
        <strong>{formatMoney(quote?.cartTotal)}</strong>
      </div>
      {draft.persons.map((p, i) => (
        <div key={p.id}>
          <strong>
            {p.firstName} {p.lastName} · Person {i + 1}
          </strong>
          <ul className="bullets">
            {p.lines.map((l) => {
              const prod = products.find((x) => x.id === l.productId);
              return (
                <li key={`${l.productId}-${l.modelId || ""}`}>
                  {prod?.title || l.title}
                  {l.modelTitle ? ` · ${l.modelTitle}` : ""}
                  {l.property1 ? ` · ${l.property1}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {result && !result.ok && <div className="error">{result.message}</div>}
      <div className="center-cta">
        <button type="button" className="btn accent" disabled={submitting} onClick={onSubmit}>
          {submitting ? "Wird gesendet…" : "Jetzt verbindlich reservieren"}
        </button>
      </div>
      <p className="muted center">Zahlungspartner folgt mit dem Verleih-Backend (Stripe/Mollie).</p>
    </section>
  );
}

function FooterBar() {
  const { step, back, next, draft, quote, setActivePersonId } = useBooking();
  const missingProducts = draft.persons.filter((p) => !hasPackage(p));
  const nextMissing = missingProducts[0];
  const allEquipped = missingProducts.length === 0;

  const canNext = useMemo(() => {
    if (step === "people") return draft.persons.length > 0;
    if (step === "dates") return !!(draft.from && draft.to);
    if (step === "location") return !!draft.locationId;
    if (step === "products") return draft.persons.some((p) => hasPackage(p));
    if (step === "details") {
      const m = draft.persons[0];
      return !!(m?.firstName && m?.lastName && m?.email && draft.termsAccepted);
    }
    return false;
  }, [step, draft]);

  const productsNextLabel =
    step === "products" && !allEquipped && nextMissing
      ? `Weiter zu ${personLabel(nextMissing, draft.persons)}`
      : "Weiter";

  const onNext = () => {
    if (step === "products" && !allEquipped && nextMissing) {
      setActivePersonId(nextMissing.id);
      document.getElementById("rfh-person-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    next();
  };

  if (step === "review" || step === "people") return null;

  return (
    <div className="footer-bar">
      <div className="footer-inner">
        <div>
          <div className="muted tiny-label">Summe</div>
          <strong className="sum-pulse">{formatMoney(quote?.cartTotal)}</strong>
        </div>
        <div className="row">
          <button type="button" className="btn ghost" onClick={back}>
            Zurück
          </button>
          <button type="button" className="btn" disabled={!canNext} onClick={onNext}>
            {productsNextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Flow() {
  const { step } = useBooking();
  return (
    <div className="app-shell">
      <TopBar />
      <main>
        {step === "people" && <StepPeople />}
        {step === "dates" && <StepDates />}
        {step === "location" && <StepLocation />}
        {step === "products" && <StepProducts />}
        {step === "details" && <StepDetails />}
        {step === "review" && <StepReview />}
      </main>
      <FooterBar />
    </div>
  );
}

export default function App() {
  return (
    <BookingProvider>
      <Flow />
    </BookingProvider>
  );
}
