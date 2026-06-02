-- Historical data import: April – June 2026
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Replace 'YOUR_USER_ID_HERE' on the next line with the real UUID
--      (Dashboard → Authentication → Users → copy the user's UUID)
--   3. Execute the script; it is one transaction — all rows insert or none do.
--
-- ASSUMPTIONS & NOTES:
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

  -- =========================================================================
  -- 2. APRIL 2026  (32 клиента)
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
  -- 3. MAY 2026  (19 клиентов + Настя)
  -- Commission earned: 942.60 zł  |  Tips: 70 zł  |  Настя: 140 zł
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

  -- May — Настя: прямая оплата 140 zł (не входит в 19 клиентов; полностью мастеру)
  -- Date unknown; using 2026-05-31 as placeholder.
  INSERT INTO appointments (user_id, provided_on, customer, note, source)
    VALUES (v_uid, '2026-05-31', 'Настя', 'Прямая оплата', 'import')
    RETURNING id INTO v_appt;
  INSERT INTO income_entries (user_id, appointment_id, service_id, price_snapshot, commission_pct_snapshot, amount_earned)
    VALUES (v_uid, v_appt, v_svc_combo, 140, 100, 140.00);

  -- =========================================================================
  -- 4. JUNE 2026  (4 клиента)
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
