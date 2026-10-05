"""Reproduce the README benchmark with native PostgreSQL and psql.

Usage: python measure.py --psql PATH --port 55439 --database haru_readme_bench
Uses a dedicated database. setup.sql must have been run exactly once beforehand.
The script refuses to proceed if a non-primary index already exists on h_payment.
"""
import argparse
import json
import os
import platform
import statistics
import subprocess
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--psql', required=True)
p.add_argument('--port', default='55439')
p.add_argument('--database', default='haru_readme_bench')
p.add_argument('--user', default='haru_bench')
a = p.parse_args()
command = [a.psql, '-X', '-A', '-t', '-h', '127.0.0.1', '-p', a.port,
           '-U', a.user, '-d', a.database, '-v', 'ON_ERROR_STOP=1']

def sql(text):
    r = subprocess.run(command, input=text, text=True, capture_output=True, encoding='utf-8')
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()

queries = {
    'to_char': "SELECT COALESCE(SUM(p.pay_price), 0) FROM h_payment p "
               "WHERE p.gym_id = (SELECT gym_id FROM h_member WHERE username = 90000007) "
               "AND TO_CHAR(p.pay_date, 'YYYY-MM') = '2026-07'",
    'range': "SELECT COALESCE(SUM(p.pay_price), 0) FROM h_payment p "
             "WHERE p.gym_id = (SELECT gym_id FROM h_member WHERE username = 90000007) "
             "AND p.pay_date >= DATE '2026-07-01' AND p.pay_date < DATE '2026-08-01'"
}

indexes = json.loads(sql("SELECT coalesce(json_agg(indexdef), '[]') FROM pg_indexes "
                        "WHERE tablename = 'h_payment' AND indexname <> 'h_payment_pkey';"))
if indexes:
    raise RuntimeError('Use a fresh dedicated database: secondary indexes already exist.')

result = {
    'measured_at': sql("SELECT now() AT TIME ZONE 'Asia/Seoul';"),
    'version': sql('SELECT version();'),
    'os': platform.platform(),
    'cpu': platform.processor(),
    'logical_processors': os.cpu_count(),
    'settings': json.loads(sql("SELECT json_object_agg(name, setting) FROM pg_settings "
       "WHERE name IN ('shared_buffers','work_mem','effective_cache_size','random_page_cost',"
       "'seq_page_cost','max_parallel_workers_per_gather','jit','TimeZone');")),
    'rows': int(sql('SELECT count(*) FROM h_payment;')),
    'target_rows': int(sql("SELECT count(*) FROM h_payment WHERE gym_id=7 AND "
                          "pay_date >= DATE '2026-07-01' AND pay_date < DATE '2026-08-01';")),
    'queries': queries,
    'protocol': 'Native PostgreSQL, no forced scan settings; 2 warmups per query per index state; '
                '10 measured runs, alternating query order; each run EXPLAIN ANALYZE BUFFERS JSON; '
                'warm-cache microbenchmark, no concurrent workload.',
    'variants': {}
}
for indexed in [False, True]:
    if indexed:
        sql('CREATE INDEX idx_h_payment_gym_date ON h_payment (gym_id, pay_date); ANALYZE h_payment;')
    label = 'index' if indexed else 'no_index'
    for _ in range(2):
        for query in queries.values():
            sql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + query)
    records = {key: [] for key in queries}
    for run in range(10):
        for key in (list(queries) if run % 2 == 0 else list(reversed(queries))):
            records[key].append(json.loads(sql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + queries[key]))[0])
    for key, plans in records.items():
        times = [plan['Execution Time'] for plan in plans]
        result['variants'][label + '_' + key] = {
            'result_sum': sql(queries[key]),
            'median_ms': statistics.median(times), 'min_ms': min(times), 'max_ms': max(times),
            'execution_times_ms': times, 'plans': plans
        }

assert len({v['result_sum'] for v in result['variants'].values()}) == 1, 'Query results differ!'
result['table_bytes'] = int(sql("SELECT pg_relation_size('h_payment');"))
result['index_bytes'] = int(sql("SELECT pg_relation_size('idx_h_payment_gym_date');"))
out = Path(__file__).parent / 'results.json'
out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
for name, value in result['variants'].items():
    print(name, value['median_ms'], 'ms; min', value['min_ms'], 'max', value['max_ms'])
print('Matching rows:', result['target_rows'], 'Output:', out)
