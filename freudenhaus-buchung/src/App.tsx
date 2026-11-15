import { useMemo, useState, type CSSProperties } from "react";
import { BookingProvider, useBooking, type StepId } from "./state/booking";
import { formatMoney } from "./lib/money";
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

/** Online-Frühbucher laut skirent-obertauern.at */
function earlyBirdPercent(day: Date, today: Date) {
  const ms = day.getTime() - today.getTime();
  const ahead = Math.floor(ms / 86400000);
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
  return {
    count: `${draft.persons.length} Personen`,
    detail: parts.join(" · ") || "—",
  };
}

function TopBar() {
  const { draft, quote, locations, setStep, step, providerLabel } = useBooking();
  const people = personSummary(draft);
  const loc = locations.find((l) => l.id === draft.locationId);
  const dayCount =
    draft.from && draft.to ? `${daysBetween(draft.from, draft.to)} Tage` : "0 Tage";
  const products = draft.persons.reduce((n, p) => n + p.lines.length, 0);
  const range =
    draft.from && draft.to
      ? `${draft.from.slice(8)}.${draft.from.slice(5, 7)}. – ${draft.to.slice(8)}.${draft.to.slice(5, 7)}.`
      : dayCount;

  const slots: Array<{
    id: StepId | "cart";
    label: string;
    value: string;
    unlock: boolean;
    go?: StepId;
  }> = [
    {
      id: "people",
      label: "Personen",
      value: people.detail,
      unlock: true,
      go: "people",
    },
    {
      id: "dates",
      label: range === dayCount ? "Tage" : "Zeitraum",
      value: range,
      unlock: draft.persons.length > 0,
      go: "dates",
    },
    {
      id: "location",
      label: "Abholort",
      value: loc?.title || "wählen",
      unlock: !!(draft.from && draft.to),
      go: "location",
    },
    {
      id: "products",
      label: "Produkte",
      value: `${products} Produkte`,
      unlock: !!(draft.from && draft.to && draft.locationId),
      go: "products",
    },
    {
      id: "cart",
      label: "Warenkorb",
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
      <div className="topbar-meta">{providerLabel}</div>
    </header>
  );
}

function StepPeople() {
  const { draft, site, setAdults, setKids, next, setStep } = useBooking();
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
      <div className="people-center">
        <h1>Wie viele Personen möchten leihen?</h1>
        <button type="button" className="people-picker" onClick={() => setOpen((v) => !v)}>
          <span>{summary}</span>
          <span className="chev">{open ? "▴" : "▾"}</span>
        </button>
        <button
          type="button"
          className="people-reset"
          onClick={() => {
            setAdults(2);
            setKids([]);
            setStep("people");
          }}
        >
          Neu starten?
        </button>
        <button type="button" className="btn accent" onClick={next}>
          Weiter zum Zeitraum
        </button>
      </div>
      {open ? (
        <div className="people-sheet">
          <div className="row-line">
            <div>
              <strong>Erwachsene</strong>
              <div className="muted">ab {site?.adultAge ?? 17} Jahren</div>
            </div>
            <div className="counter">
              <button type="button" aria-label="weniger" onClick={() => setAdults(Math.max(1, adults - 1))}>
                −
              </button>
              <span>{adults}</span>
              <button type="button" aria-label="mehr" onClick={() => setAdults(Math.min(max, adults + 1))}>
                +
              </button>
            </div>
          </div>
          <div className="row-line">
            <div>
              <strong>Kinder / Jugend</strong>
              <div className="muted">Alter am ersten Leihtag</div>
            </div>
            <div className="counter">
              <button
                type="button"
                onClick={() => setKids(kidPersons.slice(0, -1).map((p) => p.age || 10))}
              >
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
      <section className="step-stage">
        <div className="stage-head">
          <h2>Wähle deinen Leihzeitraum:</h2>
          <p>Online-Frühbucher: −20&nbsp;% ab 60 Tage, −10&nbsp;% bis 1 Tag vorher.</p>
        </div>
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
        <div className="day-grid" aria-label="Kalender">
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
            ? `${draft.from} → ${draft.to} · ${daysBetween(draft.from, draft.to)} Tage`
            : draft.from
              ? "2. Tag tippen"
              : "1. Tag tippen"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
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
  return (
    <section className="step-stage">
      <div className="stage-head">
        <h2>Wähle deinen Abholort:</h2>
        <p>Fünf Standorte direkt an der Piste — dort abholen, wo du in den Lift steigst.</p>
      </div>
      <div className="loc-grid">
        {locations.map((L) => (
          <div
            key={L.id}
            className={`loc-card${draft.locationId === L.id ? " selected" : ""}`}
          >
            {L.image ? <img src={L.image} alt="" /> : <div style={{ height: 160, background: "#eee" }} />}
            <div className="body">
              {L.highlight ? <span className="tag">{L.highlight}</span> : null}
              <h3>{L.title}</h3>
              <div className="muted" dangerouslySetInnerHTML={{ __html: (L.addressHtml || "").slice(0, 180) }} />
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

function StepProducts() {
  const { quote, quoteLoading, draft, toggleProduct, setModel, next } = useBooking();
  const [activePerson, setActivePerson] = useState(draft.persons[0]?.id);
  const person = draft.persons.find((p) => p.id === activePerson) || draft.persons[0];
  const kindCode = person?.kind === "youth" ? "2" : person?.kind === "kid" ? "3" : "1";

  return (
    <section className="step-stage">
      <div className="stage-head">
        <h2>Ausrüstung</h2>
        <p>Pro Person Pakete zusammenstellen — Platin · Gold · Silber und mehr.</p>
      </div>
      <div className="person-tabs">
        {draft.persons.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={p.id === person?.id ? "active" : ""}
            onClick={() => setActivePerson(p.id)}
          >
            Person {i + 1}
            {p.lines.length ? ` · ${p.lines.length}` : ""}
          </button>
        ))}
      </div>
      {quoteLoading && <div className="muted">Preise werden geladen…</div>}
      {(quote?.categories || []).map((cat) => (
        <div key={cat.id}>
          <span className="cat-title">{cat.title}</span>
          <div className="product-grid">
            {cat.products.map((product) => {
              const selected = person?.lines.some((l) => l.productId === product.id);
              const line = person?.lines.find((l) => l.productId === product.id);
              return (
                <div key={product.id} className="product-card">
                  {product.image ? <img src={product.image} alt="" /> : <div className="ph" />}
                  <div className="body">
                    {product.highlight ? <span className="tag">{product.highlight}</span> : null}
                    <h3>{product.title}</h3>
                    <div className="muted">{product.subtitle}</div>
                    <div className="price">ab {euroDaily(product, kindCode)} / Tag</div>
                    {product.bullets?.length ? (
                      <ul className="bullets">
                        {product.bullets.slice(0, 3).map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                    <button
                      type="button"
                      className={`btn${selected ? " accent" : ""}`}
                      style={{ padding: "12px 20px", marginTop: "0.35rem" }}
                      onClick={() => person && toggleProduct(person.id, product)}
                    >
                      {selected ? "Ausgewählt" : "Hinzufügen"}
                    </button>
                    {selected && product.models.length > 0 && (
                      <div className="model-box">
                        <div className="muted">Modell & Länge (optional)</div>
                        <select
                          value={line?.modelId || ""}
                          onChange={(e) => {
                            const model = product.models.find((m) => m.id === e.target.value);
                            if (!model || !person) return;
                            const variant =
                              model.variants.find((v) => !v.disabled) || model.variants[0];
                            setModel(
                              person.id,
                              product.id,
                              model.id,
                              variant?.property1 || "",
                              model.title,
                            );
                          }}
                        >
                          <option value="">Modell wählen…</option>
                          {product.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.brand ? `${m.brand} · ` : ""}
                              {m.title}
                            </option>
                          ))}
                        </select>
                        {line?.modelId && (
                          <div className="chip-row">
                            {product.models
                              .find((m) => m.id === line.modelId)
                              ?.variants.map((v) => (
                                <button
                                  key={v.property1}
                                  type="button"
                                  className={`chip${line.property1 === v.property1 ? " active" : ""}`}
                                  disabled={v.disabled}
                                  onClick={() =>
                                    person &&
                                    setModel(
                                      person.id,
                                      product.id,
                                      line.modelId!,
                                      v.property1,
                                      line.modelTitle || "",
                                    )
                                  }
                                >
                                  {v.property1}
                                  {typeof v.stock === "number" ? ` (${v.stock})` : ""}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
        <button
          type="button"
          className="btn"
          disabled={!draft.persons.some((p) => p.lines.length)}
          onClick={next}
        >
          Weiter zu den Kontaktdaten
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
    <section className="step-stage stack">
      <div className="stage-head">
        <h2>Deine Daten</h2>
        <p>Für die Übergabe brauchen wir korrekte Gästedaten.</p>
      </div>
      {draft.persons.map((p, i) => (
        <div
          key={p.id}
          className="stack"
          style={{ borderTop: i ? "1px solid var(--line)" : undefined, paddingTop: i ? "1rem" : 0 }}
        >
          <strong>
            Person {i + 1} · {p.kind === "adult" ? "Erwachsen" : p.kind === "youth" ? "Jugend" : "Kind"}
          </strong>
          <div className="grid-2">
            <div className="field">
              <label>Vorname</label>
              <input
                value={p.firstName}
                onChange={(e) => updatePerson(p.id, { firstName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Nachname</label>
              <input
                value={p.lastName}
                onChange={(e) => updatePerson(p.id, { lastName: e.target.value })}
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
                  />
                </div>
                <div className="field">
                  <label>Telefon</label>
                  <input
                    value={p.phone || ""}
                    onChange={(e) => updatePerson(p.id, { phone: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>Größe (cm)</label>
              <input
                type="number"
                value={p.height || ""}
                onChange={(e) => updatePerson(p.id, { height: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="field">
              <label>Gewicht (kg)</label>
              <input
                type="number"
                value={p.weight || ""}
                onChange={(e) => updatePerson(p.id, { weight: Number(e.target.value) || undefined })}
              />
            </div>
          </div>
          {insurance && (
            <label className="check">
              <input
                type="checkbox"
                checked={p.coverage}
                onChange={(e) => updatePerson(p.id, { coverage: e.target.checked })}
              />
              <span>
                {insurance.title} hinzufügen
                <span className="muted"> — Diebstahl- & Bruchschutz</span>
              </span>
            </label>
          )}
        </div>
      ))}
      <div className="field">
        <label>Rabattcode</label>
        <input value={draft.discountCode} onChange={(e) => setDiscount(e.target.value)} />
      </div>
      <div className="field">
        <label>Anmerkung</label>
        <textarea rows={3} value={draft.remark} onChange={(e) => setRemark(e.target.value)} />
      </div>
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
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          className="btn"
          disabled={!main?.firstName || !main?.lastName || !main?.email || !draft.termsAccepted}
          onClick={next}
        >
          Zur Übersicht
        </button>
      </div>
    </section>
  );
}

function StepReview() {
  const { draft, quote, locations, submit, submitting, products, providerLabel } = useBooking();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    bookingId?: string;
    raw?: unknown;
  } | null>(null);
  const loc = locations.find((l) => l.id === draft.locationId);

  const onSubmit = async () => {
    const res = await submit();
    setResult(res);
  };

  if (result?.ok) {
    return (
      <section className="step-stage">
        <div className="success-card stack">
          <h2>Reservierung vorbereitet</h2>
          <p className="muted">
            Rentfreudenhaus · Vorgang {result.bookingId} · {providerLabel}
          </p>
          <div className="notice">
            Ohne <code>EASYREST_LIVE_BOOK=1</code> bleibt der Abschluss ein Dry-Run.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="step-stage stack">
      <div className="stage-head">
        <h2>Prüfen & absenden</h2>
        <p>
          {loc?.title} · {draft.from} → {draft.to} · {formatMoney(quote?.cartTotal)}
        </p>
      </div>
      {draft.persons.map((p, i) => (
        <div key={p.id}>
          <strong>
            {p.firstName} {p.lastName} (Person {i + 1})
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
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button type="button" className="btn accent" disabled={submitting} onClick={onSubmit}>
          {submitting ? "Wird übertragen…" : "Reservierung senden"}
        </button>
      </div>
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
          <div className="muted" style={{ fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Summe
          </div>
          <strong>{formatMoney(quote?.cartTotal)}</strong>
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
