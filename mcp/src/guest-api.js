import { assertSlug, createDb } from './supabase.js';

const db = createDb();

function rpcErr(error, fallback) {
  const m = error?.message || fallback;
  if (m.includes('slot_unavailable')) throw new Error('Diese Uhrzeit ist nicht mehr frei. Bitte andere Zeit wählen.');
  if (m.includes('too_many_bookings')) throw new Error('Mit diesen Kontaktdaten gibt es bereits mehrere offene Reservierungen. Bitte anrufen.');
  if (m.includes('booking_not_possible')) throw new Error('Online-Buchung derzeit nicht möglich. Bitte anrufen.');
  if (m.includes('invalid_input')) throw new Error('Angaben ungültig — bitte prüfen.');
  throw new Error(m);
}

export async function getVenueConfig(slug) {
  const s = assertSlug(slug);
  const { data, error } = await db.rpc('public_config', { p_slug: s });
  if (error || !data) rpcErr(error, 'public_config fehlgeschlagen');
  return data;
}

export async function checkAvailability(opts) {
  const s = assertSlug(opts.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error('date muss YYYY-MM-DD sein');
  if (!Number.isFinite(opts.pax) || opts.pax < 1 || opts.pax > 50) throw new Error('pax muss 1–50 sein');
  const { data, error } = await db.rpc('public_availability', {
    p_slug: s,
    p_date: opts.date,
    p_pax: opts.pax,
    p_room: opts.room_id || null,
  });
  if (error) rpcErr(error, 'public_availability fehlgeschlagen');
  const slots = data || [];
  return {
    slug: s,
    date: opts.date,
    pax: opts.pax,
    room_id: opts.room_id || null,
    slots,
    available_count: slots.filter((x) => x.available).length,
  };
}

export async function proposeSlots(opts) {
  const cfg = await getVenueConfig(opts.slug);
  if (cfg.open_from && opts.date < cfg.open_from) {
    return {
      slug: assertSlug(opts.slug),
      date: opts.date,
      pax: opts.pax,
      open_from: cfg.open_from,
      proposals: [],
      message_de: `Online-Reservierungen bei ${cfg.name} sind ab ${cfg.open_from} möglich.`,
    };
  }
  if (opts.pax > cfg.max_pax) {
    return {
      slug: assertSlug(opts.slug),
      date: opts.date,
      pax: opts.pax,
      open_from: cfg.open_from,
      proposals: [],
      message_de: `Für Gruppen ab ${cfg.max_pax + 1} Personen bitte telefonisch anfragen (Online max. ${cfg.max_pax}).`,
    };
  }
  const avail = await checkAvailability(opts);
  const open = avail.slots.filter((s) => s.available);
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 20);
  const proposals = open.slice(0, limit).map((s) => {
    const time = String(s.slot).slice(0, 5);
    return { time, period: s.period, label_de: `${time} Uhr · ${s.period}` };
  });
  return {
    slug: avail.slug,
    date: opts.date,
    pax: opts.pax,
    open_from: cfg.open_from,
    proposals,
    message_de: proposals.length
      ? `${proposals.length} freie Zeit(en) bei ${cfg.name} am ${opts.date}.`
      : `Am ${opts.date} ist online bei ${cfg.name} nichts frei. Anderen Tag wählen oder anrufen.`,
  };
}

export async function createReservation(opts) {
  const s = assertSlug(opts.slug);
  let start = opts.start;
  if (start.length === 5) start = `${start}:00`;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(start)) throw new Error('start muss HH:MM oder HH:MM:SS sein');
  const name = String(opts.name || '').trim();
  const phone = String(opts.phone || '').trim();
  const email = String(opts.email || '').trim();
  if (!name) throw new Error('Name fehlt');
  if (phone.replace(/\D/g, '').length < 6) throw new Error('Telefonnummer ungültig');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('E-Mail ungültig');

  const { data, error } = await db.rpc('public_book', {
    p_slug: s,
    p_date: opts.date,
    p_start: start.slice(0, 5),
    p_pax: opts.pax,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_note: opts.note || '',
    p_room: opts.room_id || null,
    p_source: opts.source || 'mcp',
  });
  if (error || !data) rpcErr(error, 'public_book fehlgeschlagen');
  return {
    ok: true,
    reservation: data,
    hinweis_de:
      'Reservierung angelegt. Buchungscode und Schlüssel (Telefon oder E-Mail) für Storno aufbewahren. E-Mail-Versand geht aktuell nur in den Personal-Postausgang (kein SMTP).',
  };
}

export async function getReservation(opts) {
  const code = String(opts.code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const key = String(opts.key || '').trim();
  if (!code || !key) throw new Error('code und key (Telefon oder E-Mail) sind nötig');
  const { data, error } = await db.rpc('public_get', { p_code: code, p_key: key });
  if (error || !data) throw new Error('Keine Reservierung mit diesen Angaben gefunden.');
  return data;
}

export async function cancelReservation(opts) {
  const code = String(opts.code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const key = String(opts.key || '').trim();
  const { error } = await db.rpc('public_cancel', { p_code: code, p_key: key });
  if (error) throw new Error(error.message || 'Storno nicht möglich (Frist abgelaufen oder Angaben falsch).');
  const { data } = await db.rpc('public_get', { p_code: code, p_key: key });
  return { ok: true, reservation: data, message_de: 'Reservierung wurde storniert.' };
}

/** No public_modify — cancel then book. Requires confirm_replace=true. */
export async function modifyReservation(opts) {
  if (!opts.confirm_replace) {
    throw new Error('Änderung = Storno + Neubuchung. Setze confirm_replace=true nach Bestätigung durch den Gast.');
  }
  await cancelReservation({ code: opts.code, key: opts.key });
  const created = await createReservation({
    slug: opts.slug,
    date: opts.date,
    start: opts.start,
    pax: opts.pax,
    name: opts.name,
    phone: opts.phone,
    email: opts.email,
    note: opts.note,
    room_id: opts.room_id,
    source: 'mcp-modify',
  });
  return {
    ok: true,
    previous_code: String(opts.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''),
    reservation: created.reservation,
    message_de: 'Alte Reservierung storniert und neu gebucht. Neuer Buchungscode gilt.',
  };
}
