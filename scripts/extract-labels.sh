#!/bin/bash
# 모든 라벨링 ZIP에서 JSON을 추출해 하나의 JSON 배열로 합치기
# 한글 파일명 인코딩 문제를 shell 레벨에서 우회

BASE30="/home/user/my-math/30.수학 교과 문제 풀이과정 데이터/3.개방데이터/1.데이터"
OUT="/home/user/my-math/data/aihub-labels-all.json"
TMPDIR="/tmp/aihub-single"
MERGED="/tmp/aihub-merged"

rm -rf "$MERGED" && mkdir -p "$MERGED"
COUNT=0

for LABELDIR in "$BASE30/Training/02.라벨링데이터" "$BASE30/Validation/02.라벨링데이터"; do
  for ZIP in "$LABELDIR"/*.zip; do
    echo "Processing: $(basename "$ZIP")"
    rm -rf "$TMPDIR" && mkdir -p "$TMPDIR"
    unzip -o -j "$ZIP" -d "$TMPDIR" > /dev/null 2>&1

    # shell glob으로 JSON 파일 처리 (파일명 인코딩 무관)
    for JSON in "$TMPDIR"/*.json; do
      [ -f "$JSON" ] || continue
      COUNT=$((COUNT + 1))
      cp "$JSON" "$MERGED/${COUNT}.json"
    done
  done
done

echo "총 JSON 파일: $COUNT"

# Node.js로 합치기 (숫자 파일명이라 인코딩 문제 없음)
node -e "
const fs = require('fs');
const dir = '$MERGED';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort((a,b) => parseInt(a)-parseInt(b));
console.log('합칠 파일:', files.length);
const results = [];
const grades = {};
let err = 0;
for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
    results.push(d);
    const key = (d.raw_data_info?.school||'?') + ' ' + (d.raw_data_info?.grade||'?');
    grades[key] = (grades[key]||0) + 1;
  } catch(e) { err++; }
}
console.log('성공:', results.length, '실패:', err);
console.log('학년별:');
Object.entries(grades).sort().forEach(([g,c]) => console.log('  ' + g + ': ' + c));
fs.writeFileSync('$OUT', JSON.stringify(results));
console.log('저장:', '$OUT', ((fs.statSync('$OUT').size/1024/1024).toFixed(1)) + 'MB');
"
