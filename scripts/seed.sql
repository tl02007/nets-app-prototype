-- ============================================================
-- NETS Circle Prototype — Full DB Reset + Singapore Seed Data
-- Run in Supabase SQL Editor to reset to demo state
-- ============================================================

-- 1. Wipe everything (order matters due to FK constraints)
TRUNCATE TABLE settlements         CASCADE;
TRUNCATE TABLE payment_logs        CASCADE;
TRUNCATE TABLE circle_expenses     CASCADE;
TRUNCATE TABLE circle_members      CASCADE;
TRUNCATE TABLE circles             CASCADE;
TRUNCATE TABLE transactions        CASCADE;
TRUNCATE TABLE users               CASCADE;

-- ============================================================
-- 2. User (Thanis — the demo user)
-- ============================================================
INSERT INTO users (id, name, first_name, email, handle, balance, tier, bank)
VALUES (
  'thanis',
  'Thanis',
  'Thanis',
  'thanis@nets.com.sg',
  '+65 9001 2345',
  1247.50,
  'NETS+ Gold',
  'DBS •••• 8102'
);

-- ============================================================
-- 3. Circles
-- ============================================================

-- c1: Active — Bugis Night Out (judges pay live here)
INSERT INTO circles (id, name, emoji, cover, status, date, activity_type, estimated_cost_per_person, circle_confidence, my_affordability_signal, cost_breakdown)
VALUES (
  'c1',
  'Bugis Night Out',
  'Night out',
  'var(--nets-blue)',
  'active',
  'Tonight',
  'Dinner',
  52,
  'high',
  'within',
  '[{"label":"Korean BBQ (Gen Korean BBQ House, Bugis+)","amount":35},{"label":"Bowling (Orchid Bowl, Leisure Park Kallang)","amount":17}]'
);

-- c2: Settled — Sherwin's Birthday Dinner
INSERT INTO circles (id, name, emoji, cover, status, date, activity_type, estimated_cost_per_person, circle_confidence, my_affordability_signal, cost_breakdown)
VALUES (
  'c2',
  'Sherwin''s Birthday Dinner',
  'Celebration',
  'var(--nets-red)',
  'settled',
  '28 Aug',
  'Dinner',
  42,
  'high',
  'within',
  '[{"label":"Dinner at Peach Garden (MBS)","amount":33},{"label":"Cake from Awfully Chocolate","amount":9}]'
);

-- c3: Planning — East Coast Park Outing
INSERT INTO circles (id, name, emoji, cover, status, date, activity_type, estimated_cost_per_person, circle_confidence, my_affordability_signal, cost_breakdown)
VALUES (
  'c3',
  'East Coast Park Outing',
  'Outdoors',
  'var(--nets-green)',
  'planning',
  'This Weekend',
  'Group outing',
  38,
  'high',
  'within',
  '[{"label":"Bicycle rental (PAssion Wave, ECP)","amount":8},{"label":"BBQ pit + charcoal (NParks)","amount":15},{"label":"Groceries (NTUC FairPrice)","amount":15}]'
);

-- ============================================================
-- 4. Circle Members
-- ============================================================

-- c1 members (Bugis Night Out) — all paid=0, expenses will be added live
INSERT INTO circle_members (circle_id, member_id, name, initial, color, paid) VALUES
  ('c1', 'thanis',  'Thanis (You)', 'T', 'var(--nets-red)',   0),
  ('c1', 'bryan',   'Bryan',        'B', 'var(--nets-navy)',  0),
  ('c1', 'krishna', 'Krishna',      'K', 'var(--nets-blue)',  0),
  ('c1', 'sherwin', 'Sherwin',      'S', 'var(--nets-green)', 0);

-- c2 members (Birthday Dinner) — Krishna fronted everything
INSERT INTO circle_members (circle_id, member_id, name, initial, color, paid) VALUES
  ('c2', 'thanis',  'Thanis (You)', 'T', 'var(--nets-red)',    0),
  ('c2', 'bryan',   'Bryan',        'B', 'var(--nets-navy)',   0),
  ('c2', 'krishna', 'Krishna',      'K', 'var(--nets-blue)',   168.00),
  ('c2', 'sherwin', 'Sherwin',      'S', 'var(--nets-green)',  0);

-- c3 members (ECP Outing) — all $0, just planning
INSERT INTO circle_members (circle_id, member_id, name, initial, color, paid) VALUES
  ('c3', 'thanis',  'Thanis (You)', 'T', 'var(--nets-red)',   0),
  ('c3', 'bryan',   'Bryan',        'B', 'var(--nets-navy)',  0),
  ('c3', 'sherwin', 'Sherwin',      'S', 'var(--nets-green)', 0);

-- ============================================================
-- 5. Circle Expenses (only c2 is settled — real expenses recorded)
-- ============================================================
INSERT INTO circle_expenses (id, circle_id, title, merchant, category, amount, paid_by_id, time) VALUES
  ('e-c2-1', 'c2', 'Dinner',        'Peach Garden (MBS)',  'Food & Drink', 132.00, 'krishna', '19:30'),
  ('e-c2-2', 'c2', 'Birthday cake', 'Bengawan Solo',       'Food & Drink',  36.00, 'krishna', '20:45');

-- ============================================================
-- 6. Settlements (c2 settled)
-- ============================================================
INSERT INTO settlements (id, circle_id, from_member_id, to_member_id, amount, status) VALUES
  ('s-c2-1', 'c2', 'thanis',  'krishna', 42.00, 'settled'),
  ('s-c2-2', 'c2', 'bryan',   'krishna', 42.00, 'settled'),
  ('s-c2-3', 'c2', 'sherwin', 'krishna', 42.00, 'settled');

-- ============================================================
-- 7. Transactions (recent Singapore transaction history)
-- ============================================================
INSERT INTO transactions (id, merchant, category, amount, type, date, icon, color) VALUES
  ('t1',  'FairPrice Xtra (Raffles City)', 'Groceries',       28.40, 'out', '30 Aug, 09:14', 'F', 'var(--nets-green)'),
  ('t2',  'Bengawan Solo (ION)',            'Food & Drink',    24.50, 'out', '29 Aug, 15:32', 'B', 'var(--nets-navy)'),
  ('t3',  'DBS Cashback',                  'Cashback',       150.00, 'in',  '29 Aug, 00:00', 'D', 'var(--nets-green)'),
  ('t4',  'Ya Kun Kaya Toast (CBD)',        'Food & Drink',     8.80, 'out', '28 Aug, 08:05', 'Y', 'var(--nets-navy)'),
  ('t5',  'Cathay Cineplexes (JEM)',        'Entertainment',   26.00, 'out', '27 Aug, 19:45', 'C', 'var(--nets-blue)'),
  ('t6',  'SMRT TopUp',                    'Transport',       30.00, 'out', '27 Aug, 07:55', 'S', 'var(--nets-navy)'),
  ('t7',  'Koufu (Toa Payoh)',              'Food & Drink',     5.50, 'out', '26 Aug, 12:20', 'K', 'var(--nets-green)'),
  ('t8',  'Watsons (Bugis Junction)',       'Health & Beauty', 18.90, 'out', '25 Aug, 16:10', 'W', 'var(--nets-blue)'),
  ('t9',  'Salary Credit',                 'Income',        3800.00, 'in',  '25 Aug, 00:00', '$', 'var(--nets-green)'),
  ('t10', 'Uniqlo (Orchard)',              'Shopping',        59.90, 'out', '24 Aug, 14:00', 'U', 'var(--nets-navy)'),
  ('t11', 'Awfully Chocolate',             'Food & Drink',    36.00, 'out', '22 Aug, 20:45', 'A', 'var(--nets-red)'),
  ('t12', 'Peach Garden (MBS)',            'Food & Drink',    42.00, 'out', '22 Aug, 19:30', 'P', 'var(--nets-red)'),
  ('t13', 'Grab (home to Orchard)',        'Transport',        9.20, 'out', '21 Aug, 18:30', 'G', 'var(--nets-blue)'),
  ('t14', 'McDelivery',                    'Food & Drink',    14.60, 'out', '20 Aug, 21:10', 'M', 'var(--nets-red)'),
  ('t15', 'Popular Bookstore (Plaza Sing)','Shopping',        22.00, 'out', '19 Aug, 11:45', 'P', 'var(--nets-navy)');
