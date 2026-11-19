/* 오용안 대시보드 · 웹 연결 부품
 * Claude 안에서는 window.claude.use("db" | "user" | "dictation" | "sample" | "mcp")가 저장소 · 로그인 등을 줍니다.
 * 웹에서는 이 파일이 같은 이름으로 대신 줍니다. 앱 코드는 바꾸지 않습니다.
 *  - config.js 에 Firebase 설정이 있으면: Google 로그인 + Firestore (팀 공유)
 *  - 없으면: 이 브라우저에만 저장하는 개인 모드 (시험용)
 */
(function () {
  "use strict";
  var CFG = window.TW_FIREBASE && window.TW_FIREBASE.apiKey && window.TW_FIREBASE.apiKey.indexOf("여기에") < 0 ? window.TW_FIREBASE : null;
  var FB_VER = "10.12.2";
  var $ = function (s) { return document.querySelector(s); };
  var lower = function (s) { return String(s || "").toLowerCase(); };

  /* ---------- 화면 덮개 (로그인 · 안내) ---------- */
  function overlay(html) {
    var o = $("#tw-ov");
    if (!o) {
      o = document.createElement("div"); o.id = "tw-ov";
      o.setAttribute("style", "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(40,36,32,.55);font-family:inherit");
      document.body.appendChild(o);
    }
    o.innerHTML = '<div style="max-width:420px;width:100%;background:#f1ece4;color:#2b2723;border-radius:22px;padding:26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);line-height:1.6;font-size:15px">' + html + "</div>";
    return o;
  }
  function closeOverlay() { var o = $("#tw-ov"); if (o) o.remove(); }
  var BTN = 'style="display:block;width:100%;margin-top:14px;padding:13px 16px;border:0;border-radius:14px;background:#c8553d;color:#fff;font-size:15px;font-weight:700;cursor:pointer"';
  var BTN2 = 'style="display:block;width:100%;margin-top:10px;padding:11px 16px;border:0;border-radius:14px;background:#e3dcd0;color:#2b2723;font-size:14px;font-weight:600;cursor:pointer"';

  /* ---------- 개인 모드 저장소 (브라우저 안) ---------- */
  function localDb() {
    var KEY = "tw-localdb", store = {}, subs = [];
    try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { store = {}; }
    var save = function () { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
    var parentOf = function (p) { var a = p.split("/"); a.pop(); return a.join("/"); };
    var snapOf = function (col) {
      return { docs: Object.keys(store).filter(function (p) { return parentOf(p) === col; }).map(function (p) { var d = store[p]; return { id: p.split("/").pop(), data: function () { return d; } }; }) };
    };
    var emit = function (col) { subs.forEach(function (s) { if (s.col === col) s.cb(snapOf(col)); }); };
    var rid = function () { return Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4); };
    function docRef(path) {
      return {
        id: path.split("/").pop(),
        set: function (data) { store[path] = JSON.parse(JSON.stringify(data)); save(); emit(parentOf(path)); return Promise.resolve(); },
        delete: function () { delete store[path]; save(); emit(parentOf(path)); return Promise.resolve(); }
      };
    }
    return {
      doc: docRef,
      collection: function (col) {
        return {
          doc: function (id) { return docRef(col + "/" + (id || rid())); },
          onSnapshot: function (cb) { var s = { col: col, cb: cb }; subs.push(s); setTimeout(function () { cb(snapOf(col)); }, 0); return function () { subs = subs.filter(function (x) { return x !== s; }); }; }
        };
      },
      _all: function () { return store; },
      _bulk: function (items) { items.forEach(function (it) { store[it[0]] = it[1]; }); save(); var cols = {}; items.forEach(function (it) { cols[parentOf(it[0])] = 1; }); Object.keys(cols).forEach(emit); return Promise.resolve(items.length); }
    };
  }

  /* ---------- Firebase ---------- */
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("load " + src)); }; document.head.appendChild(s); }); }
  var fbReady = null;
  function boot() {
    if (fbReady) return fbReady;
    fbReady = (async function () {
      if (!CFG) { var l = localDb(); return { db: l, user: { id: function () { return "local"; }, canEdit: function () { return true; }, can: function () { return true; } }, mode: "local", bulk: l._bulk }; }
      overlay("<b>불러오는 중…</b>");
      var base = "https://www.gstatic.com/firebasejs/" + FB_VER + "/";
      await loadScript(base + "firebase-app-compat.js"); await loadScript(base + "firebase-auth-compat.js"); await loadScript(base + "firebase-firestore-compat.js");
      firebase.initializeApp(CFG);
      var auth = firebase.auth(), db = firebase.firestore();
      var fu = await new Promise(function (res) { var off = auth.onAuthStateChanged(function (u) { off(); res(u); }); });
      while (!fu) {
        overlay('<div style="font-size:19px;font-weight:800">오용안 대시보드</div><div style="margin-top:6px;color:#6b635a">팀원만 사용할 수 있습니다. 허용된 Google 계정으로 로그인하세요.</div><button id="tw-login" ' + BTN + '>Google 로그인</button><div id="tw-lmsg" style="margin-top:10px;color:#b3392b;font-size:13px"></div>');
        fu = await new Promise(function (res) {
          $("#tw-login").onclick = function () { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function (r) { res(r.user); }).catch(function (e) { var m = $("#tw-lmsg"); if (m) m.textContent = "로그인하지 못했습니다 (" + (e.code || "오류") + ")"; }); };
        });
      }
      /* 내 권한: members/<이메일> 문서 (admin · editor · viewer) */
      var role = null;
      try { var md = await db.doc("members/" + lower(fu.email)).get(); role = md.exists ? (md.data().role || "viewer") : null; } catch (e) { role = null; }
      if (!role) {
        overlay('<div style="font-size:18px;font-weight:800">접근 권한이 없습니다</div><div style="margin-top:8px;color:#6b635a">' + (fu.email || "") + ' 계정은 아직 등록되지 않았습니다. 관리자에게 이 이메일을 등록해 달라고 요청하세요.</div><button id="tw-out" ' + BTN2 + '>다른 계정으로 로그인</button>');
        $("#tw-out").onclick = function () { auth.signOut().then(function () { location.reload(); }); };
        return new Promise(function () {});
      }
      closeOverlay();
      var user = { id: function () { return fu.uid; }, canEdit: function () { return role === "admin"; }, can: function () { return role === "admin" || role === "editor"; } };
      var bulk = async function (items) { var n = 0; for (var i = 0; i < items.length; i += 400) { var b = db.batch(); items.slice(i, i + 400).forEach(function (it) { b.set(db.doc(it[0]), it[1]); n++; }); await b.commit(); } return n; };
      return { db: db, user: user, mode: "firebase", role: role, bulk: bulk, signOut: function () { return auth.signOut().then(function () { location.reload(); }); } };
    })();
    return fbReady;
  }

  /* ---------- 받아쓰기 (브라우저 음성 인식) ---------- */
  function dictation() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return Promise.reject({ code: "unsupported" });
    var rec = null, on = false, st = [], pt = [], fn = [];
    var state = function (s) { st.forEach(function (f) { f({ state: s }); }); };
    return Promise.resolve({
      start: function () {
        return new Promise(function (res, rej) {
          rec = new SR(); rec.lang = "ko-KR"; rec.continuous = true; rec.interimResults = true; on = true; state("starting");
          rec.onstart = function () { state("listening"); res(); };
          rec.onresult = function (ev) {
            var part = "";
            for (var i = ev.resultIndex; i < ev.results.length; i++) { var r = ev.results[i], t = r[0].transcript; if (r.isFinal) fn.forEach(function (f) { f({ text: t + " " }); }); else part += t; }
            pt.forEach(function (f) { f({ text: part }); });
          };
          rec.onerror = function (e) { if (e.error === "no-speech" || e.error === "aborted") return; on = false; state("idle"); rej({ code: e.error || "error" }); };
          rec.onend = function () { if (on) { try { rec.start(); } catch (e) {} } else state("idle"); };
          try { rec.start(); } catch (e) { rej({ code: "error" }); }
        });
      },
      stop: function () { on = false; try { rec.stop(); } catch (e) {} state("idle"); return Promise.resolve(); },
      onState: function (f) { st.push(f); }, onPartial: function (f) { pt.push(f); }, onFinal: function (f) { fn.push(f); }
    });
  }

  /* ---------- 데이터 가져오기 (?import=1, 관리자만) ---------- */
  function importPanel(b) {
    if (b.role && b.role !== "admin") return;
    overlay('<div style="font-size:18px;font-weight:800">데이터 가져오기</div><div style="margin-top:6px;color:#6b635a;font-size:14px">내려받은 <b>seed.json</b>을 선택하세요. 같은 이름의 문서는 덮어씁니다. 연락처와 개인 공간은 포함되지 않습니다.</div><input id="tw-file" type="file" accept="application/json" style="margin-top:14px;width:100%"><div id="tw-imsg" style="margin-top:10px;font-size:13px"></div><button id="tw-iclose" ' + BTN2 + '>닫기</button>');
    $("#tw-iclose").onclick = function () { closeOverlay(); var u = new URL(location.href); u.searchParams.delete("import"); history.replaceState(null, "", u.pathname + u.hash); };
    $("#tw-file").onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; var m = $("#tw-imsg"); m.textContent = "읽는 중…";
      f.text().then(function (t) {
        var j = JSON.parse(t), items = []; Object.keys(j).forEach(function (col) { Object.keys(j[col]).forEach(function (id) { items.push([col + "/" + id, j[col][id]]); }); });
        m.textContent = items.length + "개 문서를 올리는 중…"; return b.bulk(items).then(function (n) { m.style.color = "#2f7d4f"; m.textContent = n + "개 문서를 가져왔습니다. 새로고침하세요."; });
      }).catch(function (er) { m.style.color = "#b3392b"; m.textContent = "가져오지 못했습니다: " + ((er && (er.code || er.message)) || "오류"); });
    };
  }

  window.TW_WEB = true;
  window.claude = {
    use: function (name) {
      if (name === "db") return boot().then(function (b) { if (/[?&]import=1/.test(location.search)) setTimeout(function () { importPanel(b); }, 300); return b.db; });
      if (name === "user") return boot().then(function (b) { return b.user; });
      if (name === "dictation") return dictation();
      if (name === "sample") return Promise.resolve({ json: function () { return Promise.reject({ code: "web_no_ai" }); } });
      return Promise.reject({ code: "unavailable" });
    }
  };
})();
