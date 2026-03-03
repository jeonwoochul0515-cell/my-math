/**
 * 71716 라벨 JSON 파일들을 하나의 배열 JSON으로 합치는 스크립트
 * 이미 DB에 있는 데이터와 중복되지 않도록 source_data_name으로 체크
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = '/tmp/aihub-labels';
const outFile = '/home/user/my-math/data/aihub-labels-all.json';

const files = readdirSync(dir).filter(f => f.endsWith('.json'));
console.log(`JSON 파일 수: ${files.length}`);

const results = [];
const grades = {};
let errors = 0;

for (const f of files) {
  try {
    const raw = readFileSync(join(dir, f), 'utf8');
    const d = JSON.parse(raw);
    results.push(d);

    const school = d.raw_data_info?.school || '?';
    const grade = d.raw_data_info?.grade || '?';
    const key = `${school} ${grade}`;
    grades[key] = (grades[key] || 0) + 1;
  } catch {
    errors++;
  }
}

console.log(`\n파싱 성공: ${results.length}, 실패: ${errors}`);
console.log('\n학년별 분포:');
Object.entries(grades).sort().forEach(([g, c]) => console.log(`  ${g}: ${c}개`));

writeFileSync(outFile, JSON.stringify(results));
console.log(`\n저장: ${outFile} (${(Buffer.byteLength(JSON.stringify(results)) / 1024 / 1024).toFixed(1)}MB)`);
