-- Historical data import: December 2025 – June 2026
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Replace 'YOUR_USER_ID_HERE' on the next line with the real UUID
--      (Dashboard → Authentication → Users → copy the user's UUID)
--   3. Execute the script; it is one transaction — all rows insert or none do.
--
-- NOTE: the file name still says apr_jun but it now also covers December 2025.
--   January–March 2026 chunks are expected next; April–June will be re-supplied
--   from source and may then need reconciling (they currently use 40%).
--
-- DECEMBER 2025 conventions (differ from Apr–Jun):
--   • Commission: 35%. The source listed a take-home in parentheses ("84 (42)")
--     that worked out to 50%, but per the data owner we IGNORE the parenthetical
--     and compute amount_earned = price_snapshot × 0.35 ourselves.
--   • price_snapshot = the listed (big) number — the discount is already baked
--     into it. Section "скидка 40%" = base × 0.60, "скидка 20%" = base × 0.80.
--     Each entry carries a note recording which discount applied.
--   • "короткие с улицы" (walk-in) is charged full 90 zł — no discount.
--   • "стрижка Себастьяна" 100 zł has no take-home in the source and is kept
--     entirely by the worker (100%); recorded with service_id NULL, customer
--     "Себастьян" (no matching standard service / price).
--   • New service created: "Воск (уши и нос)" (base 30 zł; 24 = 30 × 0.80).
--   • Tips ("чай") are attached to the immediately preceding appointment (the
--     source interleaves them per cut); daily totals are unchanged either way.
--   • Tally mismatch — VERIFY MANUALLY: 37 service lines ✓ (matches "37 человек"),
--     but earnings sum to 1082.10 zł (incl. Себастьян 100) vs stated "1300 zł",
--     and tips sum to 146 zł vs stated "88 zł чай". The source summary line does
--     not reconcile; entries are recorded faithfully, not bent to hit the totals.
--
-- JANUARY 2026 conventions:
--   • Two rate blocks: Section A "стандартный прайс, ставка 35%" (05–10 Jan) and
--     Section B "ставка 40%, изменённый прайс" (13–30 Jan). amount_earned is
--     computed as price_snapshot × rate; here the source parentheticals already
--     match that exactly, so they agree.
--   • Section B prices are the (lower) "changed" prices actually charged; stored
--     as price_snapshot as-is. Walk-ins ("улица"/"с улицы") carry note "С улицы".
--   • New services created: "Мытьё головы" (40 zł), "Стрижка бороды" (70 zł, a
--     beard trim distinct from "Борода с бритвой" 80 zł).
--   • Reconciles cleanly ✓: 22 service lines = "22 человека", earnings 837.30 zł
--     = "837,3 zł", tips 70 zł = "70 zł чай".
--
-- APRIL–JUNE 2026 conventions (unchanged from the original import):
--   • Standard commission throughout: 40%
--   • Exceptions: 10-Apr combo explicitly marked 50%; two June "на руки" entries
--     are kept entirely by the worker (100%); May "Настя" is a direct payment (100%).
--   • Tips ("чай") are attached to the last appointment of the stated day.
--   • "ребенок" entry (child haircut, 80 zł) has no date — assigned 2026-04-17.
--   • "Продажа пасты" (23 Apr) skipped — no amount recorded.
--   • "Настя" (May) assigned placeholder date 2026-05-31 with note "Прямая оплата".
--   • April individual entries sum to 1345.20 zł; the original tally says 1450 zł
--     (Δ 104.80 zł — possibly the paste sale or a tallying error). Verify manually.
--   • May individual entries sum to 942.60 zł ✓ matches tally.
--   • June individual entries sum to 84.00 zł + 100 zł на руки ✓ matches tally.

DO $$
DECLARE
  v_uid UUID := 'YOUR_USER_ID_HERE';  -- ← REPLACE THIS

  -- Service IDs (found or created)
  v_svc_short       UUID;  -- Короткие               90  zł
  v_svc_medium      UUID;  -- Средние                120 zł
  v_svc_long        UUID;  -- Длинные                120 zł
  v_svc_combo       UUID;  -- Комбо                  140 zł
  v_svc_combo_razor UUID;  -- Комбо с бритвой        150 zł
  v_svc_combo_peel  UUID;  -- Комбо + пилинг         170 zł
  v_svc_cbr_peel    UUID;  -- Комбо с бритвой+пилинг 180 zł
  v_svc_beard_razor UUID;  -- Борода с бритвой        80 zł
  v_svc_child       UUID;  -- Детская стрижка         80 zł
  v_svc_wax         UUID;  -- Воск (уши и нос)        30 zł
  v_svc_wash        UUID;  -- Мытьё головы            40 zł
  v_svc_beard       UUID;  -- Стрижка бороды          70 zł
  v_svc_headshave   UUID;  -- Бритьё головы           60 zł

  v_appt UUID;
BEGIN

  -- =========================================================================
  -- 1. Find or create services for this user
  -- =========================================================================
  SELECT id INTO v_svc_short FROM services WHERE user_id = v_uid AND name = 'Короткие' LIMIT 1;
  IF v_svc_short IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Короткие', 90) RETURNING id INTO v_svc_short;
  END IF;

  SELECT id INTO v_svc_medium FROM services WHERE user_id = v_uid AND name = 'Средние' LIMIT 1;
  IF v_svc_medium IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Средние', 120) RETURNING id INTO v_svc_medium;
  END IF;

  SELECT id INTO v_svc_long FROM services WHERE user_id = v_uid AND name = 'Длинные' LIMIT 1;
  IF v_svc_long IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Длинные', 120) RETURNING id INTO v_svc_long;
  END IF;

  SELECT id INTO v_svc_combo FROM services WHERE user_id = v_uid AND name = 'Комбо' LIMIT 1;
  IF v_svc_combo IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Комбо', 140) RETURNING id INTO v_svc_combo;
  END IF;

  SELECT id INTO v_svc_combo_razor FROM services WHERE user_id = v_uid AND name = 'Комбо с бритвой' LIMIT 1;
  IF v_svc_combo_razor IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Комбо с бритвой', 150) RETURNING id INTO v_svc_combo_razor;
  END IF;

  SELECT id INTO v_svc_combo_peel FROM services WHERE user_id = v_uid AND name = 'Комбо + пилинг' LIMIT 1;
  IF v_svc_combo_peel IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Комбо + пилинг', 170) RETURNING id INTO v_svc_combo_peel;
  END IF;

  SELECT id INTO v_svc_cbr_peel FROM services WHERE user_id = v_uid AND name = 'Комбо с бритвой + пилинг' LIMIT 1;
  IF v_svc_cbr_peel IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Комбо с бритвой + пилинг', 180) RETURNING id INTO v_svc_cbr_peel;
  END IF;

  SELECT id INTO v_svc_beard_razor FROM services WHERE user_id = v_uid AND name = 'Борода с бритвой' LIMIT 1;
  IF v_svc_beard_razor IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Борода с бритвой', 80) RETURNING id INTO v_svc_beard_razor;
  END IF;

  SELECT id INTO v_svc_child FROM services WHERE user_id = v_uid AND name = 'Детская стрижка' LIMIT 1;
  IF v_svc_child IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Детская стрижка', 80) RETURNING id INTO v_svc_child;
  END IF;

  SELECT id INTO v_svc_wax FROM services WHERE user_id = v_uid AND name = 'Воск (уши и нос)' LIMIT 1;
  IF v_svc_wax IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Воск (уши и нос)', 30) RETURNING id INTO v_svc_wax;
  END IF;

  SELECT id INTO v_svc_wash FROM services WHERE user_id = v_uid AND name = 'Мытьё головы' LIMIT 1;
  IF v_svc_wash IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Мытьё головы', 40) RETURNING id INTO v_svc_wash;
  END IF;

  SELECT id INTO v_svc_beard FROM services WHERE user_id = v_uid AND name = 'Стрижка бороды' LIMIT 1;
  IF v_svc_beard IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Стрижка бороды', 70) RETURNING id INTO v_svc_beard;
  END IF;

  SELECT id INTO v_svc_headshave FROM services WHERE user_id = v_uid AND name = 'Бритьё головы' LIMIT 1;
  IF v_svc_headshave IS NULL THEN
    INSERT INTO services (user_id, name, price) VALUES (v_uid, 'Бритьё головы', 60) RETURNING id INTO v_svc_headshave;
  END IF;

  -- =========================================================================
  -- 2. DECEMBER 2025  (37 service lines)
  -- Commission 35% on the listed price (parenthetical take-home ignored).
  -- Earnings sum: 1082.10 zł (incl. Себастьян 100) | Tips: 146 zł
  -- Section A "скидка 40%" (13–20 Dec) · Section B "скидка 20%" (22–30 Dec)
  -- =========================================================================

  -- ---- Section A: скидка 40% --------------------------------------------

  -- 13 Dec — Комбо 84 + Средние 72
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-13', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 84, 35, 29.40);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-13', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 72, 35, 25.20);

  -- 15 Dec — Короткие 54
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-15', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  -- 16 Dec — Комбо 84 + Короткие 54
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-16', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 84, 35, 29.40);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-16', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  -- 19 Dec — Короткие 54 × 2 + Комбо с бритвой 90 + Себастьян 100 (kept fully)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-19', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-19', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-19', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 90, 35, 31.50);

  -- Себастьян: flat 100 zł, no standard service, kept entirely by worker (100%)
  INSERT INTO appointments (user_id, provided_on, customer, source) VALUES (v_uid, '2025-12-19', 'Себастьян', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, NULL, 100, 100, 100.00);

  -- 20 Dec — Короткие 54 × 3  |  tips 6 then 46 on first two cuts
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-20', 'Скидка 40%', 6, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-20', 'Скидка 40%', 46, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-20', 'Скидка 40%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 54, 35, 18.90);

  -- ---- Section B: скидка 20% --------------------------------------------

  -- 22 Dec — Комбо 112 + Короткие 90 (с улицы, без скидки) + Комбо 112 + Короткие 72 × 3
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-22', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 112, 35, 39.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-22', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 35, 31.50);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-22', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 112, 35, 39.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-22', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-22', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-22', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  -- 23 Dec — Борода с бритвой 64 (tip 16) + Короткие 72 + Дети 64 + Комбо с бритвой 120 + Короткие 72 + Комбо с бритвой 120
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-23', 'Скидка 20%', 16, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard_razor, 64, 35, 22.40);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-23', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-23', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_child, 64, 35, 22.40);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-23', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 120, 35, 42.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-23', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-23', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 120, 35, 42.00);

  -- 24 Dec — Комбо с бритвой 120 + Короткие 72 × 2
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-24', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 120, 35, 42.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-24', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-24', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  -- 29 Dec — Короткие 72 + Воск 24 (tip 4) + Короткие 72 (tip 10) + Короткие 72 + Короткие 72 (tip 28) + Комбо 112 (tip 8)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-29', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-29', 'Скидка 20%', 4, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_wax, 24, 35, 8.40);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-29', 'Скидка 20%', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-29', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-29', 'Скидка 20%', 28, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-29', 'Скидка 20%', 8, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 112, 35, 39.20);

  -- 30 Dec — Короткие 72 (tip 20) + Короткие 72 + Комбо 112 + Комбо 112 (tip 8)
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-30', 'Скидка 20%', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-30', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 35, 25.20);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2025-12-30', 'Скидка 20%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 112, 35, 39.20);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2025-12-30', 'Скидка 20%', 8, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 112, 35, 39.20);

  -- =========================================================================
  -- 3. JANUARY 2026  (22 человека)
  -- Section A "стандартный прайс, ставка 35%" (05–10 Jan)
  -- Section B "ставка 40%, изменённый прайс"  (13–30 Jan)
  -- Earnings sum: 837.30 zł ✓ | Tips: 70 zł ✓
  -- =========================================================================

  -- ---- Section A: стандартный прайс, ставка 35% --------------------------

  -- 05 Jan — Комбо 140 + Длинные 120
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-05', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 35, 49.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-05', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_long, 120, 35, 42.00);

  -- 06 Jan — Мытьё головы 40 + Стрижка бороды 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-06', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_wash, 40, 35, 14.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-06', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard, 70, 35, 24.50);

  -- 08 Jan — Комбо 140
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-08', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 35, 49.00);

  -- 10 Jan — Комбо 140 × 2
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-10', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 35, 49.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-10', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 35, 49.00);

  -- ---- Section B: ставка 40%, изменённый прайс --------------------------

  -- 13 Jan — Короткие 72  |  tip 10
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-01-13', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 72, 40, 28.80);

  -- 14 Jan — Стрижка бороды 70 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-01-14', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard, 70, 40, 28.00);

  -- 16 Jan — Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-16', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 17 Jan — Короткие 90 (с улицы) + Комбо 140 (с улицы)  |  tip 30 on combo
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-01-17', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-01-17', 'С улицы', 30, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 22 Jan — Короткие 90 (с улицы, tip 10) + Короткие 70
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-01-22', 'С улицы', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-22', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 23 Jan — Короткие 70  |  tip 10
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-01-23', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 24 Jan — Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-24', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 26 Jan — Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-26', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 28 Jan — Борода с бритвой 80 (с улицы, tip 10) + Комбо 110 + Комбо 140 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-01-28', 'С улицы', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard_razor, 80, 40, 32.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-01-28', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 110, 40, 44.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-01-28', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 29 Jan — Комбо 140 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-01-29', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 30 Jan — Средние 120 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-01-30', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 120, 40, 48.00);

  -- =========================================================================
  -- 4. FEBRUARY 2026  (18 человек)
  -- "Ставка 40% и изменённый прайс" — commission 40% throughout.
  -- Earnings sum (18 client lines): 664.00 zł | Tips: 30 zł ✓
  -- Stated tally "680 zł" — Δ16 unresolved, treated as a rough total. VERIFY.
  -- Skipped per owner decision: "покраска типсов" 100 zł (no date/take-home) and
  -- "Продажа пудры 26 ?" (uncertain amount) — neither is in the 18-line count.
  -- =========================================================================

  -- 03 Feb — Комбо 110
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-02-03', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 110, 40, 44.00);

  -- 04 Feb — Короткие 90 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-04', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- SKIPPED (owner decision): "100 zł - покраска типсов" — no date/take-home.
  -- SKIPPED (owner decision): "Продажа пудры - 26 ?" — uncertain amount.

  -- 10 Feb — Комбо 140 (по звонку)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-10', 'По звонку', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 11 Feb — Короткие 90 (с улицы) + Короткие 70
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-11', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-02-11', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 13 Feb — Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-02-13', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 14 Feb — Средние 100 + Короткие 90 (с улицы)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-02-14', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 100, 40, 40.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-14', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 17 Feb — Короткие 90 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-17', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 18 Feb — Комбо 110
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-02-18', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 110, 40, 44.00);

  -- 19 Feb — Короткие 90 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-19', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 20 Feb — Короткие 90 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-20', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 21 Feb — Комбо 140 + Детская 80 (ребёнок, с улицы)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-02-21', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-21', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_child, 80, 40, 32.00);

  -- 26 Feb — Короткие 70 (tip 10) + Мытьё 40 (с улицы) + Комбо с бритвой 120 (tip 20)
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-02-26', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-26', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_wash, 40, 40, 16.00);

  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-02-26', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 120, 40, 48.00);

  -- 27 Feb — Стрижка бороды 70 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-02-27', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard, 70, 40, 28.00);

  -- =========================================================================
  -- 5. MARCH 2026  (23 человека)
  -- "Ставка 40% и изменённый прайс" — commission 40% throughout.
  -- Earnings sum (23 client lines): 824.00 zł | Tips: 110 zł ✓
  -- Stated tally "1000 zł" — Δ176 unresolved, treated as a rough total. VERIFY.
  -- Skipped per established precedent: "Косметика 50 zł" — a product sale, not a
  -- service line; excluded from the 23-person count.
  -- =========================================================================

  -- 03 Mar — Средние 100
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-03', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 100, 40, 40.00);

  -- 04 Mar — Комбо 140 (улица, tip 50)
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-03-04', 'С улицы', 50, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 05 Mar — Короткие 70 (tip 20)
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-03-05', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 07 Mar — Короткие 70 + Комбо 110 + Бритьё головы 60 + Борода с бритвой 60
  --          (Косметика 50 skipped — product sale)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-07', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-07', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 110, 40, 44.00);

  -- SKIPPED (established precedent): "Косметика 50 zł" — product sale, not a service.

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-07', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_headshave, 60, 40, 24.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-07', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard_razor, 60, 40, 24.00);

  -- 13 Mar — Комбо 140 (улица) + Короткие 70 + Ребёнок 80
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-03-13', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-13', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-13', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_child, 80, 40, 32.00);

  -- 14 Mar — Короткие 90 (улица) + Комбо 140 (улица, tip 10)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-03-14', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-03-14', 'С улицы', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 17 Mar — Комбо с бритвой 120 + Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-17', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 120, 40, 48.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-17', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 18 Mar — Короткие 90 (с улицы)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-03-18', 'С улицы', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 19 Mar — Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-19', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 20 Mar — Короткие 70
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-20', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 21 Mar — Короткие 70 (tip 10) + Короткие 70
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-03-21', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-21', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  -- 24 Mar — Комбо 110
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-24', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 110, 40, 44.00);

  -- 25 Mar — Короткие 90 (улица, tip 10)
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-03-25', 'С улицы', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 28 Mar — Короткие 90 (улица, tip 10) + Ребёнок 80
  INSERT INTO appointments (user_id, provided_on, note, tip, source) VALUES (v_uid, '2026-03-28', 'С улицы', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-03-28', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_child, 80, 40, 32.00);

  -- =========================================================================
  -- 6. APRIL 2026  (32 клиента)
  -- Commission earned per entry: 1345.20 zł  |  Tips: 149 zł
  -- =========================================================================

  -- 01 Apr — Короткие × 2 (no tip)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-01', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-01', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 02 Apr — Короткие × 3 (no tip)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-02', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-02', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-02', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 03 Apr — Короткие × 1
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-03', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 04 Apr — Комбо с бритвой 150 zł
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-04', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 150, 40, 60.00);

  -- 07 Apr — Комбо 140 + Короткие 90
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-07', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-07', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 08 Apr — Короткие × 2  |  tip 10 on last
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-08', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-08', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 10 Apr — Короткие 81 zł (скидка) + Комбо 140 zł @ 50%  |  tip 20 on last
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-04-10', 'Скидка', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 81, 40, 32.40);

  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-10', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 50, 70.00);

  -- 11 Apr — Комбо 126 zł (-10% от 140)  |  tip 14
  INSERT INTO appointments (user_id, provided_on, tip, note, source) VALUES (v_uid, '2026-04-11', 14, 'Скидка 10%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 126, 40, 50.40);

  -- 13 Apr — Комбо 140 zł
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-13', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 14 Apr — Комбо с бритвой 150 + Средние 120
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-14', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 150, 40, 60.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-14', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 120, 40, 48.00);

  -- 16 Apr — Короткие 90  |  tip 10
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-16', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 17 Apr — Детская стрижка 80 zł (no date in source; assigned 17 Apr)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-17', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_child, 80, 40, 32.00);

  -- 18 Apr — Средние 120 (tip 15) + Средние 120 + Короткие 90
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-18', 15, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 120, 40, 48.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-18', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 120, 40, 48.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-18', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 20 Apr — Комбо 140 zł
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-20', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 22 Apr — Короткие 90 + Борода с бритвой 80  |  tip 20 on last
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-22', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-22', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_beard_razor, 80, 40, 32.00);

  -- 23 Apr — Комбо с бритвой 150  |  tip 50
  -- Note: "Продажа пасты" had no price — skipped.
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-23', 50, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 150, 40, 60.00);

  -- 24 Apr — Короткие 90  |  tip 10
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-04-24', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 25 Apr — Короткие Диана 70 + Короткие 90
  INSERT INTO appointments (user_id, provided_on, customer, source) VALUES (v_uid, '2026-04-25', 'Диана', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 70, 40, 28.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-25', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 28 Apr — Короткие 90
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-28', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 30 Apr — Короткие 90 + Короткие 81 (скидка)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-04-30', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-04-30', 'Скидка', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 81, 40, 32.40);

  -- =========================================================================
  -- 7. MAY 2026  (19 клиентов)
  -- Commission earned: 942.60 zł  |  Tips: 70 zł
  -- =========================================================================

  -- 06 May — Комбо × 2 + Короткие × 1
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-06', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-06', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-06', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 08 May — Комбо+пилинг 170 + Короткие 90  |  tip 20 on last
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-08', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_peel, 170, 40, 68.00);

  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-05-08', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 12 May — Короткие × 2
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-12', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-12', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 15 May — Комбо+пилинг 170  |  tip 30
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-05-15', 30, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_peel, 170, 40, 68.00);

  -- 20 May — Короткие 76.50 (-15% от 90)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-05-20', 'Скидка 15%', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 76.50, 40, 30.60);

  -- 21 May — Короткие (tip 10) + Короткие
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-05-21', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-21', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 22 May — Комбо × 2  |  tip 10 on last
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-22', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-05-22', 10, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 23 May — Комбо × 2
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-23', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-23', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 26 May — Комбо с бритвой 150 + Короткие 90
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-26', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo_razor, 150, 40, 60.00);

  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-26', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 28 May — Комбо 140
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-28', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 40, 56.00);

  -- 29 May — Комбо с бритвой + пилинг 180
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-05-29', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_cbr_peel, 180, 40, 72.00);

  -- =========================================================================
  -- 8. JUNE 2026  (4 клиента)
  -- Commission earned: 84 zł  |  Tips: 20 zł  |  На руки: 100 zł
  -- =========================================================================

  -- 01 Jun — Короткие «на руки» 40 zł (full amount kept by worker → 100%)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-06-01', 'На руки', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 40, 100, 40.00);

  -- 01 Jun — Короткие 90 (regular 40%)
  INSERT INTO appointments (user_id, provided_on, source) VALUES (v_uid, '2026-06-01', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_short, 90, 40, 36.00);

  -- 01 Jun — Длинные 120 (regular 40%)  |  tip 20
  INSERT INTO appointments (user_id, provided_on, tip, source) VALUES (v_uid, '2026-06-01', 20, 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_long, 120, 40, 48.00);

  -- 01 Jun — Средние «на руки» 60 zł (full amount kept by worker → 100%)
  INSERT INTO appointments (user_id, provided_on, note, source) VALUES (v_uid, '2026-06-01', 'На руки', 'import') RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_medium, 60, 100, 60.00);

END $$;
