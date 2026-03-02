/**
 * 여러 AIHub 라벨 zip 파일들을 읽어서 단일 JSON 배열로 병합
 * 사용법: node scripts/extract-zips.cjs
 */
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', '30.수학 교과 문제 풀이과정 데이터', '3.개방데이터', '1.데이터');
const OUTPUT = path.join(__dirname, '..', 'data', 'aihub-all.json');

/** 중/고등학교 라벨 zip 파일 경로 수집 */
function findLabelZips(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findLabelZips(fullPath));
    } else if (
      item.name.endsWith('.zip') &&
      (item.name.startsWith('TL_') || item.name.startsWith('VL_')) &&
      (item.name.includes('중학교') || item.name.includes('고등학교'))
    ) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

async function main() {
  const zipFiles = findLabelZips(BASE);
  console.log(`라벨 zip 파일 ${zipFiles.length}개 발견:\n`);

  const allProblems = [];

  for (const zipPath of zipFiles) {
    const name = path.basename(zipPath);
    process.stdout.write(`  ${name} ... `);

    const zipData = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipData);
    const jsonFiles = Object.keys(zip.files).filter(f => f.endsWith('.json'));

    let ok = 0;
    let fail = 0;
    for (const f of jsonFiles) {
      try {
        const content = await zip.files[f].async('string');
        const json = JSON.parse(content);
        allProblems.push(json);
        ok++;
      } catch {
        fail++;
      }
    }

    console.log(`${ok}건 성공${fail > 0 ? `, ${fail}건 실패` : ''}`);
  }

  console.log(`\n총 ${allProblems.length}건 추출`);

  fs.writeFileSync(OUTPUT, JSON.stringify(allProblems));
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`저장: ${OUTPUT} (${sizeMB}MB)`);
}

main().catch(console.error);
