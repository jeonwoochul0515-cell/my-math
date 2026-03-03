/**
 * 71716 라벨 ZIP 파일들에서 JSON을 추출하여 하나의 배열로 합치기
 * 한글 파일명 인코딩 문제를 Buffer 기반 디렉토리 스캔으로 우회
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const BASE30 = '/home/user/my-math/30.수학 교과 문제 풀이과정 데이터/3.개방데이터/1.데이터';
const OUT = '/home/user/my-math/data/aihub-labels-all.json';
const TMPDIR = '/tmp/aihub-extract-single';

const labelDirs = [
  join(BASE30, 'Training/02.라벨링데이터'),
  join(BASE30, 'Validation/02.라벨링데이터'),
];

const results = [];
const grades = {};
let total = 0;
let errors = 0;

for (const dir of labelDirs) {
  const zips = readdirSync(dir).filter(f => f.endsWith('.zip'));
  for (const zipName of zips) {
    const zipPath = join(dir, zipName);
    console.log(`Processing: ${zipName}`);

    execSync(`rm -rf "${TMPDIR}" && mkdir -p "${TMPDIR}"`);
    try {
      execSync(`unzip -o -j "${zipPath}" -d "${TMPDIR}" 2>/dev/null`, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
    } catch { /* unzip warnings */ }

    // Buffer 기반으로 파일 목록 읽기 (인코딩 문제 우회)
    const rawFiles = readdirSync(TMPDIR, { encoding: 'buffer' });
    for (const fBuf of rawFiles) {
      const fName = fBuf.toString('latin1'); // 바이트 그대로 유지
      if (!fName.endsWith('.json')) continue;
      total++;

      try {
        // join을 쓰지 않고 직접 경로 구성 (인코딩 보존)
        const fPath = TMPDIR + '/' + fName;
        const raw = readFileSync(fPath, 'utf8');
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
  }
}

console.log(`\n총 JSON: ${total}, 성공: ${results.length}, 실패: ${errors}`);
console.log('\n학년별 분포:');
Object.entries(grades).sort().forEach(([g, c]) => console.log(`  ${g}: ${c}개`));

writeFileSync(OUT, JSON.stringify(results));
const sizeMB = (readFileSync(OUT).byteLength / 1024 / 1024).toFixed(1);
console.log(`\n저장: ${OUT} (${sizeMB}MB)`);
