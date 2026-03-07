/**
 * 일본 문제 품질 검증 스크립트
 * - 학년/단원 분포가 한국 교육과정과 일치하는지
 * - 일본어가 남아있는지
 * - 샘플 문제 확인
 */

import { createClient } from '@supabase/supabase-js';
import { getAllGrades, getTopicList } from '../src/data/curriculum2022.js';

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = createClient(url, key);

async function main() {
  /** 전체 japan 문제 가져오기 */
  const allProblems: { id: number; content: string; grade: string; topic: string; answer: string; difficulty: string }[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await sb
      .from('problem_embeddings')
      .select('id,content,grade,topic,answer,difficulty')
      .like('source', 'japan-%')
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    allProblems.push(...data);
    from += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`\n총 japan 문제: ${allProblems.length}건\n`);

  /** 1. 학년별 분포 + 유효성 검사 */
  const validGrades = getAllGrades();
  const gradeCounts: Record<string, number> = {};
  const invalidGrades: string[] = [];

  for (const p of allProblems) {
    gradeCounts[p.grade] = (gradeCounts[p.grade] || 0) + 1;
    if (!validGrades.includes(p.grade) && !invalidGrades.includes(p.grade)) {
      invalidGrades.push(p.grade);
    }
  }

  console.log('=== 학년별 분포 ===');
  Object.entries(gradeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([g, c]) => {
      const valid = validGrades.includes(g) ? '✓' : '✗';
      console.log(`  ${valid} ${g}: ${c}건`);
    });

  if (invalidGrades.length > 0) {
    console.log(`\n⚠ 교육과정에 없는 학년: ${invalidGrades.join(', ')}`);
  } else {
    console.log('\n✓ 모든 학년이 교육과정에 유효');
  }

  /** 2. 단원별 분포 + 유효성 검사 */
  const topicCounts: Record<string, number> = {};
  const invalidTopics: { grade: string; topic: string }[] = [];

  for (const p of allProblems) {
    const key = `${p.grade} > ${p.topic}`;
    topicCounts[key] = (topicCounts[key] || 0) + 1;

    if (validGrades.includes(p.grade)) {
      const validTopics = getTopicList(p.grade);
      if (!validTopics.includes(p.topic)) {
        const exists = invalidTopics.find(t => t.grade === p.grade && t.topic === p.topic);
        if (!exists) invalidTopics.push({ grade: p.grade, topic: p.topic });
      }
    }
  }

  console.log('\n=== 단원별 분포 (상위 20) ===');
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([t, c]) => console.log(`  ${t}: ${c}건`));

  if (invalidTopics.length > 0) {
    console.log(`\n⚠ 교육과정에 없는 단원 (${invalidTopics.length}개):`);
    invalidTopics.forEach(t => console.log(`  ${t.grade} > ${t.topic}`));
  } else {
    console.log('\n✓ 모든 단원이 교육과정에 유효');
  }

  /** 3. 일본어 잔존 검사 */
  const jpHiragana = /[ぁ-ん]/;
  const jpKatakana = /[ァ-ヶ]/;
  const jpNames = /(太郎|花子|次郎|健太|美咲|大輔|陽菜|結衣)/;
  const jpCurrency = /円/;
  const jpPlaces = /(東京|大阪|京都|北海道|沖縄|富士山|新幹線)/;

  let hiraganaCount = 0;
  let katakanaCount = 0;
  let jpNameCount = 0;
  let jpCurrencyCount = 0;
  let jpPlaceCount = 0;

  for (const p of allProblems) {
    const text = p.content + ' ' + (p.answer || '');
    if (jpHiragana.test(text)) hiraganaCount++;
    if (jpKatakana.test(text)) katakanaCount++;
    if (jpNames.test(text)) jpNameCount++;
    if (jpCurrency.test(text)) jpCurrencyCount++;
    if (jpPlaces.test(text)) jpPlaceCount++;
  }

  console.log('\n=== 일본 흔적 검사 ===');
  console.log(`  히라가나 포함: ${hiraganaCount}건`);
  console.log(`  가타카나 포함: ${katakanaCount}건`);
  console.log(`  일본 이름 포함: ${jpNameCount}건`);
  console.log(`  엔화(円) 포함: ${jpCurrencyCount}건`);
  console.log(`  일본 지명 포함: ${jpPlaceCount}건`);

  if (hiraganaCount + katakanaCount + jpNameCount + jpCurrencyCount + jpPlaceCount === 0) {
    console.log('  ✓ 일본 흔적 없음!');
  }

  /** 4. 난이도 분포 */
  const diffCounts: Record<string, number> = {};
  for (const p of allProblems) {
    diffCounts[p.difficulty] = (diffCounts[p.difficulty] || 0) + 1;
  }
  console.log('\n=== 난이도 분포 ===');
  Object.entries(diffCounts).sort().forEach(([d, c]) => console.log(`  ${d}: ${c}건`));

  /** 5. 샘플 문제 5개 */
  console.log('\n=== 샘플 문제 (무작위 5개) ===');
  const sampleIdxs = new Set<number>();
  while (sampleIdxs.size < Math.min(5, allProblems.length)) {
    sampleIdxs.add(Math.floor(Math.random() * allProblems.length));
  }
  for (const idx of sampleIdxs) {
    const p = allProblems[idx];
    console.log(`\n[${p.grade} > ${p.topic}] (${p.difficulty})`);
    console.log(`  문제: ${p.content.slice(0, 200)}`);
    console.log(`  정답: ${p.answer.slice(0, 100)}`);
  }

  /** 6. 임베딩 존재 여부 */
  const { data: _embCheck } = await sb
    .from('problem_embeddings')
    .select('id,embedding')
    .like('source', 'japan-%')
    .not('embedding', 'is', null)
    .limit(1);

  const { count: noEmbCount } = await sb
    .from('problem_embeddings')
    .select('*', { count: 'exact', head: true })
    .like('source', 'japan-%')
    .is('embedding', null);

  console.log('\n=== 임베딩 상태 ===');
  console.log(`  임베딩 없음: ${noEmbCount}건`);
  console.log(`  임베딩 있음: ${allProblems.length - (noEmbCount || 0)}건`);
  if (noEmbCount && noEmbCount > 0) {
    console.log('  → npm run generate:embeddings 실행 필요');
  }
}

main().catch(console.error);
