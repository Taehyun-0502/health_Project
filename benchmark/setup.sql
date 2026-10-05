\set ON_ERROR_STOP on
-- Run only in the dedicated empty haru_readme_bench database.
CREATE TABLE h_member (
    username bigint PRIMARY KEY,
    gym_id bigint NOT NULL
);
CREATE TABLE h_payment (
    pay_id bigint PRIMARY KEY,
    username bigint NOT NULL,
    gym_id bigint NOT NULL,
    installment integer NOT NULL,
    pay_price bigint NOT NULL,
    pay_date date NOT NULL,
    pay_name text NOT NULL,
    data_id bigint
);
INSERT INTO h_member
SELECT 90000000 + g, g FROM generate_series(1, 50) AS g;
-- 50 gyms x 10,000 payments, dates spread over 2025-01-01..2026-12-31.
-- The arithmetic generator is deterministic; no seed-dependent random data.
INSERT INTO h_payment
SELECT i,
       10000000 + (i % 100000),
       1 + ((i - 1) % 50),
       0,
       30000 + ((i * 7919) % 470001),
       DATE '2025-01-01' + (((((i - 1) / 50) * 37) + ((i - 1) % 50) * 13) % 730)::integer,
       'Synthetic payment ' || i,
       i
FROM generate_series(1::bigint, 500000::bigint) AS i;
VACUUM (ANALYZE) h_member;
VACUUM (ANALYZE) h_payment;
