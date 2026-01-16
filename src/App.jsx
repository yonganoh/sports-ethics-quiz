import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SUBJECT } from './data.js';
import { renderPdfPage } from './pdf.js';

const LS_KEY = 'se-quiz-v1';
const QUESTION_COUNT = SUBJECT.questionCount;
const CHOICES = [1, 2, 3, 4];

function nowISO() {
  return new Date().toISOString();
}

function defaultDraftAnswers() {
  const obj = {};
  for (let i = 1; i <= QUESTION_COUNT; i++) obj[String(i)] = null;
  return obj;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function gradeOne(qNo, userAnswer) {
  const correct = SUBJECT.answerKey[String(qNo)];
  if (userAnswer == null) return { isCorrect: false, isBlank: true, correct };
  return {
    isCorrect: correct.includes(Number(userAnswer)),
    isBlank: false,
    correct,
  };
}

function makeAttempt(draftAnswers) {
  const items = [];
  let correctCount = 0;
  for (let q = 1; q <= QUESTION_COUNT; q++) {
    const ua = draftAnswers[String(q)];
    const g = gradeOne(q, ua);
    const isCorrect = g.isCorrect;
    if (isCorrect) correctCount++;
    items.push({ qNo: q, userAnswer: ua, correct: g.correct, isCorrect, isBlank: g.isBlank });
  }
  const score = Math.round((correctCount / QUESTION_COUNT) * 100);
  return { id: `a_${Date.now()}`, createdAt: nowISO(), subjectId: SUBJECT.id, score, correctCount, total: QUESTION_COUNT, items };
}

function computeWrongNoteUpdate(prevWrongNote, attempt) {
  const next = { ...prevWrongNote };
  for (const it of attempt.items) {
    const key = String(it.qNo);
    const prev = next[key] || {
      qNo: it.qNo,
      status: 'NEW', // NEW | LEARNING | MASTERED
      wrongCount: 0,
      correctStreak: 0,
      lastWrongAt: null,
      lastReviewAt: null,
      memo: '',
      tags: [],
    };

    if (!it.isCorrect) {
      prev.wrongCount += 1;
      prev.correctStreak = 0;
      prev.status = prev.status === 'MASTERED' ? 'LEARNING' : prev.status;
      prev.lastWrongAt = nowISO();
      prev.lastReviewAt = nowISO();
      next[key] = prev;
    }
  }
  return next;
}

function applyReviewResult(prevWrongNote, qNo, wasCorrect, masteryStreak = 2) {
  const key = String(qNo);
  const prev = prevWrongNote[key];
  if (!prev) return prevWrongNote;
  const next = { ...prevWrongNote };
  const item = { ...prev };
  item.lastReviewAt = nowISO();
  if (wasCorrect) {
    item.correctStreak = (item.correctStreak || 0) + 1;
    item.status = item.correctStreak >= masteryStreak ? 'MASTERED' : 'LEARNING';
  } else {
    item.wrongCount = (item.wrongCount || 0) + 1;
    item.correctStreak = 0;
    item.status = 'LEARNING';
    item.lastWrongAt = nowISO();
  }
  next[key] = item;
  return next;
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function TabButton({ active, onClick, children }) {
  return (
    <button className={`tab ${active ? 'tab-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function QuestionPill({ qNo, state, onClick }) {
  const ua = state.draftAnswers[String(qNo)];
  const hasAnswer = ua != null;
  const last = state.lastAttempt;
  let tone = 'neutral';
  if (last) {
    const item = last.items.find((x) => x.qNo === qNo);
    if (item?.isCorrect) tone = 'ok';
    else if (item && !item.isCorrect) tone = 'bad';
  } else {
    tone = hasAnswer ? 'info' : 'neutral';
  }
  return (
    <button className={`q-pill q-pill-${tone}`} onClick={onClick}>
      {qNo}
    </button>
  );
}

function PdfPanel({ qNo }) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const page = SUBJECT.qToPage(qNo);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        if (!canvasRef.current) return;
        await renderPdfPage({ url: SUBJECT.pdfUrl, pageNumber: page, canvas: canvasRef.current, scale: 1.35 });
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, qNo]);

  return (
    <div className="pdf-panel">
      <div className="pdf-header">
        <div>
          <b>원문 PDF</b> <span className="muted">(페이지 {page}/3)</span>
        </div>
        <a className="link" href={SUBJECT.pdfUrl} target="_blank" rel="noreferrer">
          PDF 열기
        </a>
      </div>
      {busy ? <div className="muted">렌더링 중...</div> : null}
      <canvas ref={canvasRef} className="pdf-canvas" />
      <div className="muted" style={{ marginTop: 6 }}>
        문항 <b>{qNo}</b>를 PDF에서 찾아 읽고, 오른쪽에 답을 입력하세요.
      </div>
    </div>
  );
}

function AnswerBox({ qNo, draftAnswers, setDraftAnswers, lastAttempt }) {
  const ua = draftAnswers[String(qNo)];
  const correct = SUBJECT.answerKey[String(qNo)];
  const lastItem = lastAttempt?.items?.find((x) => x.qNo === qNo) || null;

  return (
    <div className="answer-box">
      <div className="row">
        <div>
          <div className="h2">문항 {qNo}</div>
          <div className="muted">객관식 (1~4)</div>
        </div>
        {lastItem ? (
          lastItem.isCorrect ? <Badge tone="ok">정답</Badge> : <Badge tone="bad">오답</Badge>
        ) : null}
      </div>

      <div className="choices">
        {CHOICES.map((c) => (
          <label key={c} className={`choice ${ua === c ? 'choice-active' : ''}`}>
            <input
              type="radio"
              name={`q_${qNo}`}
              checked={ua === c}
              onChange={() => setDraftAnswers((prev) => ({ ...prev, [String(qNo)]: c }))}
            />
            <span>{c}</span>
          </label>
        ))}
        <button className="btn btn-ghost" onClick={() => setDraftAnswers((prev) => ({ ...prev, [String(qNo)]: null }))}>
          지우기
        </button>
      </div>

      <div className="divider" />

      <div className="muted">정답 기준: {qNo === 8 ? '1~4 모두 정답 처리' : correct.join(', ')}</div>
      {lastItem ? (
        <div style={{ marginTop: 8 }}>
          <div>
            내 답: <b>{lastItem.userAnswer ?? '-'}</b>
          </div>
          <div>
            정답: <b>{lastItem.correct.join(', ')}</b>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultView({ lastAttempt, onGoWrong }) {
  if (!lastAttempt) return <div className="muted">제출 기록이 없습니다.</div>;
  const wrong = lastAttempt.items.filter((x) => !x.isCorrect);
  return (
    <div>
      <div className="h1">채점 결과</div>
      <div className="cards">
        <div className="card">
          <div className="h2">점수</div>
          <div className="score">{lastAttempt.score}</div>
          <div className="muted">
            정답 {lastAttempt.correctCount}/{lastAttempt.total}
          </div>
        </div>
        <div className="card">
          <div className="h2">오답</div>
          <div className="score">{wrong.length}</div>
          <div className="muted">오답노트에 자동 반영됩니다.</div>
        </div>
      </div>

      <div className="divider" />
      <div className="row" style={{ alignItems: 'center' }}>
        <div className="h2">오답 리스트</div>
        <button className="btn" onClick={onGoWrong}>
          오답노트로 이동
        </button>
      </div>
      {wrong.length === 0 ? (
        <div className="muted">오답이 없습니다.</div>
      ) : (
        <div className="table">
          <div className="t-head">
            <div>문항</div>
            <div>내 답</div>
            <div>정답</div>
          </div>
          {wrong.map((w) => (
            <div key={w.qNo} className="t-row">
              <div>{w.qNo}</div>
              <div>{w.userAnswer ?? '-'}</div>
              <div>{w.correct.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WrongNoteView({ state, setState, onJumpToQuestion }) {
  const wrongNote = state.wrongNote || {};
  const [filter, setFilter] = useState('active'); // active|all|mastered
  const [sort, setSort] = useState('recent'); // recent|wrongCount
  const [reviewCount, setReviewCount] = useState(10);

  const items = useMemo(() => {
    let arr = Object.values(wrongNote);
    if (filter === 'active') arr = arr.filter((x) => x.status !== 'MASTERED');
    if (filter === 'mastered') arr = arr.filter((x) => x.status === 'MASTERED');
    if (sort === 'recent') {
      arr.sort((a, b) => (b.lastWrongAt || b.lastReviewAt || '').localeCompare(a.lastWrongAt || a.lastReviewAt || ''));
    } else {
      arr.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));
    }
    return arr;
  }, [wrongNote, filter, sort]);

  const startReview = () => {
    const pool = items.map((x) => x.qNo);
    if (pool.length === 0) {
      alert('복습할 오답이 없습니다.');
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.max(1, Math.min(reviewCount, shuffled.length)));
    setState((s) => ({ ...s, reviewMode: { active: true, queue: picked, index: 0 } }));
    onJumpToQuestion(picked[0], true);
  };

  return (
    <div>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div className="h1">오답노트</div>
        <span className="muted">(자동 저장/누적)</span>
      </div>

      <div className="toolbar">
        <div className="tool">
          <label>필터</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">미마스터(추천)</option>
            <option value="all">전체</option>
            <option value="mastered">마스터</option>
          </select>
        </div>
        <div className="tool">
          <label>정렬</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">최근 오답/복습</option>
            <option value="wrongCount">오답 횟수</option>
          </select>
        </div>
        <div className="tool">
          <label>재풀이 개수</label>
          <input type="number" min="1" max="20" value={reviewCount} onChange={(e) => setReviewCount(Number(e.target.value || 10))} />
        </div>
        <button className="btn" onClick={startReview}>
          오답 재풀이 시작
        </button>
      </div>

      <div className="divider" />

      {items.length === 0 ? (
        <div className="muted">표시할 항목이 없습니다.</div>
      ) : (
        <div className="wrong-grid">
          {items.map((it) => (
            <WrongCard key={it.qNo} it={it} state={state} setState={setState} onJump={onJumpToQuestion} />
          ))}
        </div>
      )}
    </div>
  );
}

function WrongCard({ it, state, setState, onJump }) {
  const key = String(it.qNo);
  const [memo, setMemo] = useState(it.memo || '');

  useEffect(() => {
    setMemo(it.memo || '');
  }, [key]);

  const saveMemo = () => {
    setState((s) => {
      const next = { ...s.wrongNote };
      next[key] = { ...next[key], memo };
      return { ...s, wrongNote: next };
    });
  };

  const toggleMaster = () => {
    setState((s) => {
      const next = { ...s.wrongNote };
      const cur = next[key];
      if (!cur) return s;
      const status = cur.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';
      next[key] = { ...cur, status };
      return { ...s, wrongNote: next };
    });
  };

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <div className="h2">문항 {it.qNo}</div>
        {it.status === 'MASTERED' ? <Badge tone="ok">MASTERED</Badge> : <Badge tone="info">{it.status}</Badge>}
      </div>
      <div className="muted">오답 {it.wrongCount}회 · 연속정답 {it.correctStreak}회</div>
      <div className="muted">마지막 오답: {it.lastWrongAt ? new Date(it.lastWrongAt).toLocaleString() : '-'}</div>

      <div style={{ marginTop: 10 }}>
        <label className="muted">메모(내 해설)</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="왜 틀렸는지, 핵심 개념, 함정 포인트" />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => onJump(it.qNo)}>
            문제로 이동
          </button>
          <button className="btn btn-ghost" onClick={saveMemo}>
            메모 저장
          </button>
          <button className="btn btn-ghost" onClick={toggleMaster}>
            마스터 토글
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('exam');

  const [state, setState] = useState(() => {
    const saved = loadState();
    return (
      saved || {
        subjectId: SUBJECT.id,
        currentQ: 1,
        draftAnswers: defaultDraftAnswers(),
        attempts: [],
        lastAttempt: null,
        wrongNote: {},
        reviewMode: { active: false, queue: [], index: 0 },
      }
    );
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const unanswered = useMemo(() => {
    let c = 0;
    for (let i = 1; i <= QUESTION_COUNT; i++) if (state.draftAnswers[String(i)] == null) c++;
    return c;
  }, [state.draftAnswers]);

  const isInReview = state.reviewMode?.active === true;

  const setCurrentQ = (qNo) => setState((s) => ({ ...s, currentQ: qNo }));

  const jumpToQuestion = (qNo, forceExam = false) => {
    setCurrentQ(qNo);
    if (forceExam) setTab('exam');
  };

  const submit = () => {
    const attempt = makeAttempt(state.draftAnswers);
    const newWrong = computeWrongNoteUpdate(state.wrongNote, attempt);
    setState((s) => ({
      ...s,
      attempts: [...s.attempts, attempt],
      lastAttempt: attempt,
      wrongNote: newWrong,
      reviewMode: { active: false, queue: [], index: 0 },
    }));
    setTab('result');
  };

  const resetDraft = () => {
    if (!confirm('현재 작성한 답안을 초기화할까요?')) return;
    setState((s) => ({ ...s, draftAnswers: defaultDraftAnswers(), currentQ: 1, reviewMode: { active: false, queue: [], index: 0 } }));
    setTab('exam');
  };

  const reviewSubmitOne = () => {
    const qNo = state.currentQ;
    const ua = state.draftAnswers[String(qNo)];
    const g = gradeOne(qNo, ua);
    setState((s) => ({
      ...s,
      wrongNote: applyReviewResult(s.wrongNote, qNo, g.isCorrect, 2),
    }));

    // next in queue
    setState((s) => {
      if (!s.reviewMode.active) return s;
      const nextIndex = s.reviewMode.index + 1;
      if (nextIndex >= s.reviewMode.queue.length) {
        return { ...s, reviewMode: { active: false, queue: [], index: 0 } };
      }
      const nextQ = s.reviewMode.queue[nextIndex];
      return { ...s, reviewMode: { ...s.reviewMode, index: nextIndex }, currentQ: nextQ };
    });
  };

  const qNo = state.currentQ;

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="title">{SUBJECT.title}</div>
          <div className="muted">채점 + 오답노트(메모/재풀이/필터) · 로컬 저장</div>
        </div>
        <div className="tabs">
          <TabButton active={tab === 'exam'} onClick={() => setTab('exam')}>
            문제풀이
          </TabButton>
          <TabButton active={tab === 'result'} onClick={() => setTab('result')}>
            결과
          </TabButton>
          <TabButton active={tab === 'wrong'} onClick={() => setTab('wrong')}>
            오답노트
          </TabButton>
        </div>
      </header>

      <main className="main">
        {tab === 'exam' ? (
          <div className="layout">
            <div className="left">
              <div className="panel">
                <div className="row" style={{ alignItems: 'center' }}>
                  <div>
                    <div className="h2">문항 선택</div>
                    <div className="muted">
                      진행: {QUESTION_COUNT - unanswered}/{QUESTION_COUNT} · 미답 {unanswered}
                      {isInReview ? <span> · <b>오답 재풀이 모드</b></span> : null}
                    </div>
                  </div>
                  <div className="row">
                    <button className="btn btn-ghost" onClick={resetDraft}>
                      초기화
                    </button>
                    {!isInReview ? (
                      <button className="btn" onClick={submit}>
                        제출/채점
                      </button>
                    ) : (
                      <button className="btn" onClick={reviewSubmitOne}>
                        이 문항 채점 후 다음
                      </button>
                    )}
                  </div>
                </div>

                <div className="pill-grid">
                  {Array.from({ length: QUESTION_COUNT }, (_, i) => i + 1).map((n) => (
                    <QuestionPill key={n} qNo={n} state={state} onClick={() => jumpToQuestion(n)} />
                  ))}
                </div>
              </div>

              <PdfPanel qNo={qNo} />
            </div>

            <div className="right">
              <AnswerBox
                qNo={qNo}
                draftAnswers={state.draftAnswers}
                setDraftAnswers={(updater) =>
                  setState((s) => ({ ...s, draftAnswers: typeof updater === 'function' ? updater(s.draftAnswers) : updater }))
                }
                lastAttempt={state.lastAttempt}
              />
            </div>
          </div>
        ) : null}

        {tab === 'result' ? <ResultView lastAttempt={state.lastAttempt} onGoWrong={() => setTab('wrong')} /> : null}

        {tab === 'wrong' ? (
          <WrongNoteView
            state={state}
            setState={setState}
            onJumpToQuestion={(n, forceExam=false) => jumpToQuestion(n, forceExam)}
          />
        ) : null}
      </main>

      <footer className="footer">
        <span className="muted">데이터는 이 기기 브라우저(localStorage)에 저장됩니다.</span>
      </footer>
    </div>
  );
}
