import { useMemo, useState, type CSSProperties } from "react";
import { BookingProvider, useBooking, type StepId } from "./state/booking";
import { formatMoney } from "./lib/money";
import type { Product } from "./api";

const STEP_LABEL: Record<StepId, string> = {
  people: "Personen",
  dates: "Zeitraum",
  location: "Filiale",
  products: "Ausrüstung",
  details: "Daten",
  review: "Abschluss",
};

function euroDaily(product: Product, kind: string) {
  return formatMoney(product.displayDaily[kind] || product.displayDaily["1"]);
}

function TopBar() {
  const { site, draft, quote, providerLabel } = useBooking();
  const loc = draft.locationId;
  return (
    <header className="topbar">
      <a className="brand" href="#top">
        {site?.logo ? <img src={site.logo} alt={site?.name || "FREUDENHAUS"} /> : null}
        <span className="brand-mark">FREUDENHAUS RENT</span>
      </a>
      <div className="summary-chip">
        <span>
          <strong>{draft.persons.length}</strong> Personen
        </span>
        <span>
          <strong>
            {draft.from && draft.to
              ? `${draft.from.slice(8)}.${draft.from.slice(5, 7)}. – ${draft.to.slice(8)}.${draft.to.slice(5, 7)}.`
              : "–"}
          </strong>
        </span>
        <span>
          <strong>{loc ? `#${loc}` : "Filiale"}</strong>
        </span>
        <span>
          <strong>{formatMoney(quote?.cartTotal)}</strong>
        </span>
      </div>
      <div className="provider-tag">{providerLabel}</div>
    </header>
  );
}

function Stepper() {
  const { step, steps, setStep, draft } = useBooking();
  const unlocked = (id: StepId) => {
    if (id === "people") return true;
    if (id === "dates") return draft.persons.length > 0;
    if (id === "location") return !!(draft.from && draft.to);
    if (id === "products") return !!(draft.from && draft.to && draft.locationId);
    if (id === "details") return draft.persons.some((p) => p.lines.length > 0);
    return draft.persons.some((p) => p.lines.length > 0);
  };
  return (
    <nav className="stepper" aria-label="Buchungsschritte">
      {steps.map((id) => {
        const i = steps.indexOf(id);
        const active = step === id;
        const done = steps.indexOf(step) > i;
        return (
          <button
            key={id}
            type="button"
            className={`step-pill${active ? " active" : ""}${done ? " done" : ""}`}
            disabled={!unlocked(id)}
            onClick={() => unlocked(id) && setStep(id)}
          >
            {i + 1}. {STEP_LABEL[id]}
          </button>
        );
      })}
    </nav>
  );
}

function StepPeople() {
  const { draft, site, setAdults, setKids, next } = useBooking();
  const adults = draft.persons.filter((p) => p.kind === "adult").length;
  const kidPersons = draft.persons.filter((p) => p.kind !== "adult");
  const max = site?.maxPersons ?? 20;

  return (
    <section className="stack">
      <div
        className="hero-panel"
        style={
          {
            "--hero-image": `url(${site?.bgImage || "https://www.skirent-obertauern.at/img/hero-video-poster.jpg"})`,
          } as CSSProperties
        }
      >
        <div className="hero-copy">
          <span className="eyebrow">Obertauern · Online reservieren</span>
          <h1>Mehr Piste. Weniger Gepäck.</h1>
          <p>Neue Buchungsstrecke für FREUDENHAUS — angebunden an Easyrent.</p>
          <button type="button" className="btn" onClick={next}>
            Jetzt starten
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Wer leiht?</h2>
        <p className="lede">Erwachsene und Kinder festlegen. Jugend ab {site?.youthAge ?? 11} Jahren wird automatisch erkannt.</p>
        <div className="stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>Erwachsene</strong>
              <div className="muted">ab {site?.adultAge ?? 17} Jahren</div>
            </div>
            <div className="counter">
              <button type="button" aria-label="weniger" onClick={() => setAdults(Math.max(1, adults - 1))}>
                −
              </button>
              <span>{adults}</span>
              <button
                type="button"
                aria-label="mehr"
                onClick={() => setAdults(Math.min(max, adults + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between" }}>
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
      </div>
    </section>
  );
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StepDates() {
  const { draft, setDates, site, next } = useBooking();
  const seasonStart = site?.seasonStart ? new Date(site.seasonStart) : new Date(2026, 10, 20);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = seasonStart > today ? seasonStart : today;

  const [cursor, setCursor] = useState(() => new Date(minDate.getFullYear(), minDate.getMonth(), 1));
  const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth());
  const monthLabel = cursor.toLocaleDateString("de-AT", { month: "long", year: "numeric" });

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
    <section className="panel stack">
      <div>
        <h2>Leihzeitraum</h2>
        <p className="lede">
          Zeitraum wählen. Onlinebonus und Frühbucher werden über die Live-Preise berechnet.
          {site?.pickupTime ? ` Abholung am Vortag ab ${site.pickupTime} Uhr möglich.` : ""}
        </p>
      </div>
      <div className="month-nav">
        <button
          type="button"
          className="btn ghost"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          ←
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          →
        </button>
      </div>
      <div className="calendar" aria-label="Kalender">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div className="cal-head" key={d}>
            {d}
          </div>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              className={`day${inRange(d) ? " in-range" : ""}${
                draft.from === iso(d) || draft.to === iso(d) ? " selected" : ""
              }`}
              disabled={d < minDate}
              onClick={() => onPick(d)}
            >
              {d.getDate()}
              {draft.from === iso(d) && !draft.to ? <small>von</small> : null}
              {draft.to === iso(d) ? <small>bis</small> : null}
            </button>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
      <div className="notice">
        Gewählt:{" "}
        <strong>
          {draft.from || "–"}
          {draft.to ? ` → ${draft.to}` : draft.from ? " (Enddatum tippen)" : ""}
        </strong>
      </div>
      <button type="button" className="btn" disabled={!draft.from || !draft.to} onClick={next}>
        Weiter zur Filiale
      </button>
    </section>
  );
}

function StepLocation() {
  const { locations, draft, setLocation, setPickupDayBefore, site, next } = useBooking();
  return (
    <section className="panel stack">
      <div>
        <h2>Abholfiliale</h2>
        <p className="lede">Fünf Standorte direkt an der Piste — dort abholen, wo du in den Lift steigst.</p>
      </div>
      <div className="loc-grid">
        {locations.map((L) => (
          <button
            key={L.id}
            type="button"
            className={`loc-card${draft.locationId === L.id ? " selected" : ""}`}
            onClick={() => setLocation(L.id)}
          >
            {L.image ? <img src={L.image} alt="" /> : <div style={{ height: 150, background: "#ddd" }} />}
            <div className="body">
              {L.highlight ? <span className="badge">{L.highlight}</span> : null}
              <h3>{L.title}</h3>
              <div className="muted" dangerouslySetInnerHTML={{ __html: (L.addressHtml || "").slice(0, 180) }} />
            </div>
          </button>
        ))}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.pickupDayBefore}
          onChange={(e) => setPickupDayBefore(e.target.checked)}
        />
        <span>
          Am Vortag abholen (ab {site?.pickupTime || "15:00"} Uhr) — entspannter erster Skitag.
        </span>
      </label>
      <button type="button" className="btn" disabled={!draft.locationId} onClick={next}>
        Weiter zur Ausrüstung
      </button>
    </section>
  );
}

function StepProducts() {
  const { quote, quoteLoading, draft, toggleProduct, setModel, next } = useBooking();
  const [activePerson, setActivePerson] = useState(draft.persons[0]?.id);
  const person = draft.persons.find((p) => p.id === activePerson) || draft.persons[0];
  const kindCode = person?.kind === "youth" ? "2" : person?.kind === "kid" ? "3" : "1";

  return (
    <section className="panel stack">
      <div>
        <h2>Ausrüstung wählen</h2>
        <p className="lede">
          Pro Person Pakete zusammenstellen. Preise inkl. aktueller Online-Konditionen
          {quote?.rate ? ` (${quote.rate.title})` : ""}.
        </p>
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
        <div key={cat.id} className="stack">
          <strong>{cat.title}</strong>
          <div className="product-grid">
            {cat.products.map((product) => {
              const selected = person?.lines.some((l) => l.productId === product.id);
              const line = person?.lines.find((l) => l.productId === product.id);
              return (
                <div key={product.id} className="product-card">
                  {product.image ? <img src={product.image} alt="" /> : <div />}
                  <div className="body">
                    {product.highlight ? <span className="badge">{product.highlight}</span> : null}
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
                      className={`btn${selected ? " sage" : ""}`}
                      onClick={() => person && toggleProduct(person.id, product)}
                    >
                      {selected ? "Ausgewählt" : "Hinzufügen"}
                    </button>
                    {selected && product.models.length > 0 && (
                      <div className="model-box">
                        <div className="muted">Modell & Länge (optional, Easyrent-Verfügbarkeit)</div>
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
      <button
        type="button"
        className="btn"
        disabled={!draft.persons.some((p) => p.lines.length)}
        onClick={next}
      >
        Weiter zu den Kontaktdaten
      </button>
    </section>
  );
}

function StepDetails() {
  const { draft, updatePerson, setRemark, setDiscount, setNewsletter, setTerms, next, specials } =
    useBooking();
  const main = draft.persons[0];
  const insurance = specials.find((s) => s.type === 1);

  return (
    <section className="panel stack">
      <div>
        <h2>Deine Daten</h2>
        <p className="lede">Für die Übergabe an Easyrent brauchen wir korrekte Gästedaten.</p>
      </div>
      {draft.persons.map((p, i) => (
        <div key={p.id} className="stack" style={{ borderTop: i ? "1px solid var(--line)" : undefined, paddingTop: i ? "1rem" : 0 }}>
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
        <span>Neuigkeiten von FREUDENHAUS per E-Mail erhalten</span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.termsAccepted}
          onChange={(e) => setTerms(e.target.checked)}
        />
        <span>AGB und Datenschutz akzeptieren</span>
      </label>
      <button
        type="button"
        className="btn"
        disabled={
          !main?.firstName ||
          !main?.lastName ||
          !main?.email ||
          !draft.termsAccepted
        }
        onClick={next}
      >
        Zur Übersicht
      </button>
    </section>
  );
}

function StepReview() {
  const { draft, quote, locations, submit, submitting, products, providerLabel } = useBooking();
  const [result, setResult] = useState<{ ok: boolean; message: string; bookingId?: string; raw?: unknown } | null>(
    null,
  );
  const loc = locations.find((l) => l.id === draft.locationId);

  const onSubmit = async () => {
    const res = await submit();
    setResult(res);
  };

  if (result?.ok) {
    return (
      <section className="panel success-card stack">
        <h2>Easyrent</h2>
        <p className="lede">
          Vorgang {result.bookingId} · {providerLabel}
        </p>
        <div className="notice">
          Katalog/Preise/Verfügbarkeit laufen über die Easyrent-API (Proxy). Ohne{" "}
          <code>EASYREST_LIVE_BOOK=1</code> bleibt der Abschluss ein Dry-Run (keine Live-Buchung in
          Easyrent).
        </div>
        <pre
          style={{
            textAlign: "left",
            overflow: "auto",
            fontSize: "0.75rem",
            background: "#f3f1ed",
            padding: "1rem",
            borderRadius: 12,
          }}
        >
          {JSON.stringify(result.raw, null, 2)}
        </pre>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <h2>Prüfen & absenden</h2>
        <p className="lede">
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
      {quote?.rate && (
        <div className="notice">
          <strong>{quote.rate.title}</strong>
          {quote.rate.description ? ` — ${quote.rate.description}` : ""}
        </div>
      )}
      {result && !result.ok && <div className="error">{result.message}</div>}
      <button type="button" className="btn" disabled={submitting} onClick={onSubmit}>
        {submitting ? "Wird übertragen…" : "An Easyrent senden"}
      </button>
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

  if (step === "review") return null;

  return (
    <div className="footer-bar">
      <div className="footer-inner">
        <div>
          <div className="muted">{STEP_LABEL[step]}</div>
          <strong>{formatMoney(quote?.cartTotal)}</strong>
        </div>
        <div className="row">
          {step !== "people" && (
            <button type="button" className="btn ghost" onClick={back}>
              Zurück
            </button>
          )}
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
      <Stepper />
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
