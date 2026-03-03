import { useEffect, useRef, useId } from 'react';
import type { FigureSpec, FigureElement } from '../../types';

/** JSXGraph CSS를 한 번만 로드 (로컬 파일) */
let cssLoaded = false;
function loadJSXGraphCSS() {
  if (cssLoaded) return;
  cssLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/jsxgraph.css';
  document.head.appendChild(link);
}

/** functiongraph fn 문자열 허용 토큰 검증 (C5: new Function() 보안) */
const ALLOWED_FN_PATTERN = /^[\d\s+\-*/().^x,eE]+$|^[\d\s+\-*/().^x,eE]*(Math\.(sin|cos|tan|abs|sqrt|log|exp|PI|pow|floor|ceil|round|min|max)[\d\s+\-*/().^x,eE]*)+$/;

function isSafeFnString(fn: string): boolean {
  /** Math 함수명을 임시로 제거하고 남은 토큰이 안전한지 확인 */
  const stripped = fn
    .replace(/Math\.(sin|cos|tan|abs|sqrt|log|exp|PI|pow|floor|ceil|round|min|max)/g, '')
    .replace(/\b(sin|cos|tan|abs|sqrt|log|exp|PI)\b/g, '');
  /** 남은 토큰: 숫자, 연산자, x, 공백, 괄호, 콤마만 허용 */
  return /^[\d\s+\-*/().^x,eE]*$/.test(stripped);
}

/** JSXGraph 도형/그래프 렌더러 */
export default function MathFigure({ spec, className }: { spec: FigureSpec; className?: string }) {
  const containerId = useId().replace(/:/g, '_');
  const boardId = `jxg${containerId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<JXG.Board | null>(null);

  useEffect(() => {
    loadJSXGraphCSS();

    let cancelled = false;

    void (async () => {
      const JXG = await import('jsxgraph');
      if (cancelled || !containerRef.current) return;

      /** 기존 보드 제거 */
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }

      const board = JXG.JSXGraph.initBoard(boardId, {
        boundingbox: spec.boundingBox,
        axis: spec.axis ?? false,
        grid: spec.grid ?? false,
        showCopyright: false,
        showNavigation: false,
        keepaspectratio: true,
      });

      boardRef.current = board;

      /** 이름으로 포인트 참조하기 위한 맵 */
      const pointMap = new Map<string, JXG.Point>();

      /** 1단계: 모든 point를 먼저 생성 */
      for (const el of spec.elements) {
        if (el.type === 'point') {
          const p = board.create('point', el.coords, {
            name: el.name,
            size: 3,
            withLabel: el.label !== false,
            label: { fontSize: 14, offset: [8, 8] },
          });
          pointMap.set(el.name, p);
        }
      }

      /** 2단계: 나머지 요소 생성 */
      for (const el of spec.elements) {
        renderElement(board, el, pointMap);
      }
    })();

    return () => {
      cancelled = true;
      /** H1: cleanup 시 현재 boardRef 캡처하여 레이스 컨디션 방지 */
      const boardToFree = boardRef.current;
      boardRef.current = null;
      if (boardToFree) {
        void import('jsxgraph').then((JXG) => {
          JXG.JSXGraph.freeBoard(boardToFree);
        });
      }
    };
  }, [boardId, spec]);

  return (
    <div
      ref={containerRef}
      id={boardId}
      className={`mx-auto w-[280px] h-[280px] ${className ?? ''}`}
    />
  );
}

/** 개별 요소 렌더링 (point 제외) */
function renderElement(
  board: JXG.Board,
  el: FigureElement,
  pointMap: Map<string, JXG.Point>
) {
  const getPoint = (name: string) => pointMap.get(name);

  switch (el.type) {
    case 'point':
      break;

    case 'segment': {
      const from = getPoint(el.from);
      const to = getPoint(el.to);
      if (from && to) {
        board.create('segment', [from, to], {
          strokeColor: '#333',
          strokeWidth: 1.5,
        });
      }
      break;
    }

    case 'line': {
      const from = getPoint(el.from);
      const to = getPoint(el.to);
      if (from && to) {
        board.create('line', [from, to], {
          strokeColor: '#333',
          strokeWidth: 1.5,
          dash: el.dash ? 2 : 0,
          straightFirst: true,
          straightLast: true,
        });
      }
      break;
    }

    case 'circle': {
      const center = getPoint(el.center);
      if (!center) break;
      if (el.radius != null) {
        board.create('circle', [center, el.radius], {
          strokeColor: '#2563eb',
          strokeWidth: 1.5,
          fillColor: 'none',
        });
      } else if (el.through) {
        const through = getPoint(el.through);
        if (through) {
          board.create('circle', [center, through], {
            strokeColor: '#2563eb',
            strokeWidth: 1.5,
            fillColor: 'none',
          });
        }
      }
      break;
    }

    case 'polygon': {
      const pts = el.vertices.map((v) => getPoint(v)).filter(Boolean) as JXG.Point[];
      if (pts.length >= 3) {
        board.create('polygon', pts, {
          fillColor: '#dbeafe',
          fillOpacity: 0.3,
          borders: { strokeColor: '#333', strokeWidth: 1.5 },
        });
      }
      break;
    }

    case 'angle': {
      const [a, b, c] = el.points;
      const pa = getPoint(a);
      const pb = getPoint(b);
      const pc = getPoint(c);
      if (pa && pb && pc) {
        board.create('angle', [pa, pb, pc], {
          radius: 0.8,
          fillColor: '#fef08a',
          fillOpacity: 0.4,
          name: el.label ?? '',
          withLabel: !!el.label,
          label: { fontSize: 12 },
        });
      }
      break;
    }

    case 'functiongraph': {
      const bb = board.getBoundingBox() as number[];
      const range = el.range ?? [bb[0], bb[2]];
      try {
        const fnBody = el.fn
          .replace(/\bsin\b/g, 'Math.sin')
          .replace(/\bcos\b/g, 'Math.cos')
          .replace(/\btan\b/g, 'Math.tan')
          .replace(/\babs\b/g, 'Math.abs')
          .replace(/\bsqrt\b/g, 'Math.sqrt')
          .replace(/\blog\b/g, 'Math.log')
          .replace(/\bexp\b/g, 'Math.exp')
          .replace(/\bPI\b/g, 'Math.PI')
          .replace(/\^/g, '**');

        /** C5: 허용 토큰 화이트리스트 검증 — 악의적 코드 실행 차단 */
        if (!isSafeFnString(fnBody)) {
          console.warn('MathFigure: 허용되지 않는 함수 문자열 차단:', el.fn);
          break;
        }

        const fn = new Function('x', `return ${fnBody}`) as (x: number) => number;
        board.create('functiongraph', [fn, range[0], range[1]], {
          strokeColor: '#2563eb',
          strokeWidth: 2,
        });
      } catch {
        /** 함수 파싱 실패 시 무시 */
      }
      break;
    }

    case 'text': {
      board.create('text', [el.coords[0], el.coords[1], el.value], {
        fontSize: 14,
        anchorX: 'middle',
      });
      break;
    }
  }
}
