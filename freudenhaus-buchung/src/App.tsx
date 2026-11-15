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

function TrustStrip() {
  return (
    <div className="trust-strip">
      <span>−20 % / −10 % online</span>
      <span>Vortag ab 15:00</span>
      <span>4,8★ Google</span>
      <span>Kinder &lt;11 gratis*</span>
    </div>
  );
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
        <img src="/brand/logo-mark.svg" alt="FREUDENHAUS" />
        <span className="brand-mark">
          Rent
          <br />
          freudenhaus
        </span>
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
        <img src="/brand/logo-white.svg" alt="FREUDENHAUS" />
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

function StepDates() {
  const { draft, setDates, site, next } = useBooking();
  const seasonStart = site?.seasonStart ? new Date(site.seasonStart) : new Date(2026, 10, 20);
  const seasonEnd = site?.seasonEnd ? new Date(site.seasonEnd) : new Date(2027, 3, 14);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = seasonStart > today ? seasonStart : today;

  const months: Date[] = [];
  {
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const last = new Date(seasonEnd.getFullYear(), seasonEnd.getMonth(), 1);
    while (cur <= last && months.length < 8) {
      months.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  const [cursor, setCursor] = useState(() => months[0] || new Date(minDate.getFullYear(), minDate.getMonth(), 1));
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const days: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

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
          <p>Tippe Start- und Endtag. Online-Frühbucher siehst du direkt auf den Tagen.</p>
        </div>
        <TrustStrip />
        <div className="month-rail">
          {months.map((m) => (
            <button
              key={iso(m)}
              type="button"
              className={
                m.getFullYear() === cursor.getFullYear() && m.getMonth() === cursor.getMonth()
                  ? "active"
                  : ""
              }
              onClick={() => setCursor(m)}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
        <div className="day-grid">
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
                  {disabled
                    ? "nicht verfügbar"
                    : selected && draft.from === iso(d) && !draft.to
                      ? "1. Tag"
                      : selected && draft.to === iso(d)
                        ? `${daysBetween(draft.from!, draft.to)}. Tag`
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
              ? "2. Tag tippen"
              : "1. Tag tippen"}
        </div>
        <div className="center-cta">
          <button type="button" className="btn" disabled={!draft.from || !draft.to} onClick={next}>
            Weiter zum Abholort
          </button>
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
      <TrustStrip />
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

function PackageCard({
  pack,
  active,
  products,
  kindCode,
  onSelect,
  onClear,
}: {
  pack: RentalPackage;
  active: boolean;
  products: Product[];
  kindCode: string;
  onSelect: () => void;
  onClear: () => void;
}) {
  const ski = products.find((p) => p.id === pack.skiProductId);
  return (
    <div className={`pack-card${active ? " active" : ""}`}>
      {ski?.image ? <img src={ski.image} alt="" /> : <div className="pack-ph" />}
      <div className="pack-body">
        {pack.highlight ? <span className="tag">{pack.highlight}</span> : null}
        <h3>{pack.title}</h3>
        <p className="muted">{pack.subtitle}</p>
        <div className="price">{packageDailyLabel(pack, products, kindCode)}</div>
        <ul className="bullets">
          <li>Ski/Board + Schuh + Helm</li>
          <li>Modell optional im nächsten Schritt</li>
          <li>Online-Rabatt schon eingerechnet*</li>
        </ul>
        <button
          type="button"
          className={`btn${active ? " accent" : ""}`}
          style={{ padding: "12px 20px" }}
          onClick={() => (active ? onClear() : onSelect())}
        >
          {active ? "Paket entfernen" : "Paket wählen"}
        </button>
      </div>
    </div>
  );
}

function StepProducts() {
  const {
    quote,
    quoteLoading,
    draft,
    products,
    applyPackage,
    clearPackage,
    setModel,
    clearModel,
    toggleProduct,
    next,
  } = useBooking();
  const [activePerson, setActivePerson] = useState(draft.persons[0]?.id);
  const [showExtras, setShowExtras] = useState(false);
  const person = draft.persons.find((p) => p.id === activePerson) || draft.persons[0];
  const kindCode = person?.kind === "youth" ? "2" : person?.kind === "kid" ? "3" : "1";
  const activePack = findPackageForLines(person?.lines.map((l) => l.productId) || []);
  const skiLine = person?.lines.find((l) =>
    PACKAGES.some((p) => p.skiProductId === l.productId),
  );
  const skiProduct = products.find((p) => p.id === skiLine?.productId);

  const extras = (quote?.categories || [])
    .flatMap((c) => c.products)
    .filter((p) => !PACKAGES.some((pack) => [pack.skiProductId, pack.bootProductId, pack.helmProductId].includes(p.id)));

  return (
    <section className="step-stage anim-rise">
      <div className="stage-head">
        <h2>Dein Paket</h2>
        <p>Ein Klick: Ski/Board + Schuh + Helm. Modell kannst du optional dazunehmen.</p>
      </div>
      <TrustStrip />
      <div className="person-tabs">
        {draft.persons.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={p.id === person?.id ? "active" : ""}
            onClick={() => setActivePerson(p.id)}
          >
            Person {i + 1}
            {p.lines.length ? ` · Paket` : ""}
          </button>
        ))}
      </div>
      {quoteLoading && <div className="muted">Preise werden geladen…</div>}
      <div className="pack-grid">
        {PACKAGES.map((pack) => (
          <PackageCard
            key={pack.id}
            pack={pack}
            active={activePack?.id === pack.id}
            products={products}
            kindCode={kindCode}
            onSelect={() => person && applyPackage(person.id, pack, products)}
            onClear={() => person && clearPackage(person.id)}
          />
        ))}
      </div>

      {activePack && skiProduct && skiProduct.models.length > 0 && (
        <div className="model-panel anim-rise">
          <div className="model-head">
            <strong>Ski-/Board-Modell</strong>
            <span className="muted">optional — tippen zum Abwählen</span>
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
                  {on ? <span className="model-off">Abwählen</span> : null}
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

      <button type="button" className="linkish" onClick={() => setShowExtras((v) => !v)}>
        {showExtras ? "Extras ausblenden" : "Extras / einzeln dazu (Brille, Protektor…)"}
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

      <div className="conv-cta">
        <div>
          <div className="muted tiny-label">Aktuelle Summe</div>
          <strong className="sum-pulse">{formatMoney(quote?.cartTotal)}</strong>
        </div>
        <button
          type="button"
          className="btn accent"
          disabled={!draft.persons.some((p) => p.lines.length)}
          onClick={next}
        >
          Weiter zu den Daten
        </button>
      </div>
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
      <TrustStrip />
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
  const { step, back, next, draft, quote } = useBooking();
  const canNext = useMemo(() => {
    if (step === "people") return draft.persons.length > 0;
    if (step === "dates") return !!(draft.from && draft.to);
    if (step === "location") return !!draft.locationId;
    if (step === "products") return draft.persons.some((p) => p.lines.length);
    if (step === "details") {
      const m = draft.persons[0];
      return !!(m?.firstName && m?.lastName && m?.email && draft.termsAccepted);
    }
    return false;
  }, [step, draft]);

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
          <button type="button" className="btn" disabled={!canNext} onClick={next}>
            Weiter
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
