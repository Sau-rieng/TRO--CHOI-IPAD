/* =====================================================================
   KHUNG CHUNG cho mọi trò chơi dạng khung (KHUNG-<TÊN>.html)
   ---------------------------------------------------------------------
   File này lo TOÀN BỘ phần "khung": đăng nhập theo lớp (cá nhân/nhóm do
   giáo viên chọn), nhận bộ câu từ sổ lớp, bốc 6 TN + 3 Đ/S + 2 TLN,
   bảng câu hỏi, chấm điểm (0.5 · Đ/S 0.3/0.7/1.2/2 · 0.5 = 10 điểm),
   đồng hồ, khóa khi rời màn hình, kết thúc, gửi kết quả về sổ.
   Trò chơi chỉ lo CẢNH + DI CHUYỂN, và khi tới chỗ hỏi thì gọi
       KHUNG.hoiCau().then(kq => { ...thưởng/phạt theo kq.diem... })
   KHÔNG SỬA FILE NÀY trong kênh tạo trò chơi. Xem HUONG-DAN-KHUNG.md.

   Cần nạp trước file này (theo thứ tự):
     three.min.js (nếu trò 3D) · cau-hinh-lop.js · noi-so-theo-doi.js · xuat-phat.js
   ===================================================================== */
(function () {
  'use strict';
  var NQ = 11, TF_PTS = [0, 0.3, 0.7, 1.2, 2];
  var TEN_PHAN = { mc: 'Trắc nghiệm', tf: 'Đúng – Sai', sa: 'Trả lời ngắn' };
  var O = { ten: 'Trò chơi', tram: 'Trạm', luat: '' };
  var BO = null, KH = { kieu: 'CA NHAN', maKQ: '', tenKQ: '' }, Q = [], picks = null;
  var answers = [], chosen = [], cur = -1, player = null, sessionId = '', submitted = false;
  var startedAt = 0, endedAt = 0, deadline = 0, LIMIT = 5 * 60000, reason = '', leaves = 0, locked = false, cho = null, dangHoi = false;
  var SAVE = 'khung-' + (location.pathname.split('/').pop() || 'tro').replace(/\W+/g, '-').toLowerCase() + '-v1';
  var SHEET_URL = ((window.CAU_HINH || {}).SHEET_URL || '').trim();

  /* ---------- tiện ích ---------- */
  function $(id) { return document.getElementById(id); }
  var fmt = function (v) { return String(Math.round(v * 100) / 100); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var mmss = function (ms) { var t = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  function parseNum(t) { t = String(t == null ? '' : t).trim().replace(/\s/g, '').replace(',', '.'); return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null; }
  function tron(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  var nhom = function () { return KH.kieu === 'NHOM'; };
  var ai = function () { return nhom() ? 'nhóm' : 'em'; };
  function goi(cb) { try { if (typeof cb === 'function') return cb.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.error(e); } }

  /* ---------- giao diện (tự chèn) ---------- */
  var CSS = '\
.kc{--kcBg:rgba(18,20,28,.93);--kcLine:rgba(255,255,255,.14);--kcInk:#f3f1ea;--kcMut:#b9b6ad;--kcGold:#f2c14e;--kcOk:#3fae6b;--kcBad:#d9483b;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--kcInk);-webkit-text-size-adjust:100%}\
.kc *{box-sizing:border-box}\
.kc button,.kc input,.kc select{font:inherit}\
.kc [hidden]{display:none!important}\
.kcLop{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,10,16,.45);overflow:auto}\
.kcTo{background:var(--kcBg);border:1px solid var(--kcLine);border-radius:18px;padding:20px 22px;max-width:920px;width:100%;box-shadow:0 18px 60px rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}\
.kcHai{display:grid;grid-template-columns:1.1fr 1fr;gap:22px}\
@media (max-width:760px){.kcHai{grid-template-columns:1fr}}\
.kc h2{font-family:"Playfair Display",Georgia,serif;font-size:28px;margin:0 0 8px}\
.kc p{margin:6px 0;line-height:1.5;font-size:15px}\
.kcChip{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}\
.kcChip span{border:1px solid rgba(242,193,78,.5);color:var(--kcGold);border-radius:999px;padding:3px 10px;font-size:13px;font-weight:600}\
.kcBo{font-weight:700;color:var(--kcGold)}\
.kcCanh{background:rgba(217,72,59,.16);border-left:4px solid var(--kcBad);border-radius:8px;padding:8px 12px;font-size:14px}\
.kcF{display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center;margin:4px 0 8px}\
.kcF label{font-size:14px;font-weight:600}\
.kcF input,.kcF select{width:100%;min-height:46px;padding:10px 12px;border-radius:10px;border:1px solid var(--kcLine);background:rgba(255,255,255,.07);color:var(--kcInk);font-size:17px}\
.kcF select option{color:#111}\
.kcF .kcGhi{grid-column:1/-1;margin:0;color:var(--kcGold);font-weight:600;font-size:14px}\
.kcSbd{display:flex;gap:6px}.kcSbd b{display:flex;align-items:center;padding:0 10px;border-radius:10px;background:rgba(255,255,255,.1);color:var(--kcGold);font-family:ui-monospace,Menlo,monospace;font-size:17px}\
.kcSbd input{max-width:90px;font-family:ui-monospace,Menlo,monospace}\
@media (max-width:420px){.kcF{grid-template-columns:1fr;gap:4px}}\
.kcLoi{color:#ff9d93;font-weight:600;font-size:14px}\
.kcNut{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:10px 20px;border-radius:12px;border:0;background:#c9271d;color:#fff;font-weight:700;font-size:16px;cursor:pointer}\
.kcNut:disabled{opacity:.55;cursor:default}\
.kcNut.phu{background:rgba(255,255,255,.12)}\
.kcHang{display:flex;justify-content:flex-end;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap}\
.kcHud{position:fixed;top:10px;right:10px;z-index:40;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;pointer-events:none}\
.kcHud>*{pointer-events:auto}\
.kcTien{display:flex;gap:4px;align-items:center;background:var(--kcBg);border:1px solid var(--kcLine);border-radius:12px;padding:6px 8px}\
.kcTien i{width:22px;height:22px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;font-weight:700;background:rgba(255,255,255,.1);color:var(--kcMut)}\
.kcTien i.sep{margin-left:6px}.kcTien i.cur{background:var(--kcGold);color:#222}.kcTien i.ok{background:var(--kcOk);color:#fff}.kcTien i.mot{background:#c98b2b;color:#fff}.kcTien i.sai{background:var(--kcBad);color:#fff}\
.kcTien b{margin-left:6px;font-size:14px}\
.kcGio{background:var(--kcBg);border:1px solid var(--kcLine);border-radius:12px;padding:8px 12px;font-weight:700;font-variant-numeric:tabular-nums}\
.kcGio.it{background:var(--kcBad)}\
.kcTen{position:fixed;top:10px;left:10px;z-index:40;display:flex;flex-direction:column;gap:6px;align-items:flex-start;pointer-events:none}\
.kcTen h1{margin:0;font-family:"Playfair Display",Georgia,serif;font-size:22px;text-shadow:0 2px 8px rgba(0,0,0,.6);color:#fff}\
.kcTen h1 small{display:block;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:600;opacity:.85}\
.kcTen button{pointer-events:auto;background:var(--kcBg);color:var(--kcInk);border:1px solid var(--kcLine);border-radius:10px;padding:8px 12px;font-weight:600;cursor:pointer}\
.kcThe{position:fixed;z-index:50;right:16px;top:76px;max-height:calc(100vh - 92px);width:min(470px,calc(100vw - 32px));overflow:auto;background:var(--kcBg);border:1px solid var(--kcLine);border-radius:16px;padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.45)}\
@media (max-width:760px){.kcThe{left:8px;right:8px;width:auto;top:auto;bottom:8px;max-height:72vh}}\
.kcThe .meta{color:var(--kcGold);font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 6px}\
.kcThe .q{font-size:18px;font-weight:600;line-height:1.45;margin:0 0 8px}\
.kcThe .hint{color:var(--kcMut);font-size:13.5px}\
.kcThe .fig{background:#fff;border-radius:8px;padding:6px;margin:6px 0;text-align:center}.kcThe .fig img{max-width:100%;max-height:180px}\
.kcOpt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:12px;border:1px solid var(--kcLine);background:rgba(255,255,255,.06);color:var(--kcInk);font-size:16px;cursor:pointer;min-height:48px}\
.kcOpt b{color:var(--kcGold)}.kcOpt.dung{background:rgba(63,174,107,.28);border-color:var(--kcOk)}.kcOpt.sai{background:rgba(217,72,59,.28);border-color:var(--kcBad)}\
.kcTf{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin:6px 0;padding:8px 10px;border-radius:12px;border:1px solid var(--kcLine);background:rgba(255,255,255,.05)}\
.kcTf>b{width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}\
.kcTf.dung{border-color:var(--kcOk);background:rgba(63,174,107,.18)}.kcTf.sai{border-color:var(--kcBad);background:rgba(217,72,59,.18)}\
.kcTf small{display:block;color:var(--kcMut);font-size:13px;margin-top:2px}\
.kcTf .nn{display:flex;gap:6px;align-items:center}.kcTf .nn button{min-width:58px;min-height:40px;border-radius:9px;border:1px solid var(--kcLine);background:rgba(255,255,255,.07);color:var(--kcInk);font-weight:700;cursor:pointer}\
.kcTf .nn button.on{background:var(--kcGold);color:#222;border-color:var(--kcGold)}.kcTf .nn em{font-style:normal;color:var(--kcGold);font-weight:700;font-size:13px}\
.kcSa{display:flex;gap:8px}.kcSa input{flex:1;min-height:48px;border-radius:10px;border:1px solid var(--kcLine);background:rgba(255,255,255,.08);color:var(--kcInk);font-size:20px;padding:8px 12px}\
.kcSa input.dung{border-color:var(--kcOk)}.kcSa input.sai{border-color:var(--kcBad)}\
.kcGiai{margin-top:10px;background:rgba(255,255,255,.07);border-radius:12px;padding:10px 12px;font-size:15px;line-height:1.5}.kcGiai strong{color:var(--kcGold)}\
.kcKq dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:8px 0}.kcKq dt{color:var(--kcMut)}.kcKq dd{margin:0;font-weight:600}\
.kcDiem{font-family:"Playfair Display",Georgia,serif;font-size:40px;color:var(--kcGold);margin:4px 0}\
.kcXem{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:8px 0}.kcXem li{display:flex;gap:6px;align-items:center;font-size:13px;background:rgba(255,255,255,.06);border-radius:8px;padding:4px 8px}\
.kcXem i{font-style:normal;width:20px;height:20px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:11px}\
.kcGui{font-size:14px;margin-top:6px}.kcGui.ok{color:#8fe0ae}.kcGui.bad{color:#ff9d93}';

  function dungGiaoDien() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var w = document.createElement('div'); w.className = 'kc'; w.id = 'kc';
    w.innerHTML =
      '<div class="kcTen"><h1 id="kcTieuDe">' + esc(O.ten) + '<small id="kcAi">Chọn lớp để bắt đầu</small></h1><button id="kcThoat" hidden>Thoát trò chơi</button></div>' +
      '<div class="kcHud" id="kcHud" hidden><div class="kcTien" id="kcTien"></div><div class="kcGio" id="kcGio">--:--</div></div>' +
      // dang nhap
      '<div class="kcLop" id="kcVao"><form class="kcTo" id="kcForm" novalidate><div class="kcHai"><div>' +
        '<h2>' + esc(O.ten) + '</h2>' +
        '<div class="kcChip"><span id="kcKieu">Cá nhân / nhóm</span><span>' + NQ + ' ' + esc(O.tram.toLowerCase()) + ' · 10 điểm</span><span>6 trắc nghiệm</span><span>3 đúng/sai</span><span>2 trả lời ngắn</span></div>' +
        '<p class="kcBo" id="kcBoChu" hidden></p>' + (O.luat ? '<p>' + O.luat + '</p>' : '') +
        '<p>Trắc nghiệm: mỗi câu đúng 0.5 điểm. Đúng/Sai (mỗi câu 2 điểm): đúng 1 ý 0.3đ · 2 ý 0.7đ · 3 ý 1.2đ · 4 ý 2đ. Trả lời ngắn (chỉ ghi số): mỗi câu 0.5đ. Xong ' + NQ + ' câu trước giờ thì về đích sớm – cùng điểm, ai nhanh hơn xếp trên.</p>' +
        '<p class="kcCanh">Không rời màn hình chơi. Rời lần 1 (chuyển tab, mở cửa sổ khác, tải lại trang): trò chơi bị khóa, cần giáo viên nhập mã. Rời lần 2: trò chơi kết thúc ngay và gửi điểm.</p>' +
      '</div><div><div class="kcF">' +
        '<label for="kcLopChon">Lớp</label><select id="kcLopChon"><option value="">Chọn lớp</option></select>' +
        '<p class="kcGhi" id="kcGhi">👉 Chọn lớp trước – máy sẽ hiện ô <b>chọn nhóm</b> (hoặc họ tên, số báo danh) theo cách chơi giáo viên đặt.</p>' +
        '<label for="kcHoTen" class="kcCN" hidden>Họ và tên</label><input id="kcHoTen" class="kcCN" hidden autocomplete="off" autocapitalize="words" maxlength="60" placeholder="Nguyễn Văn A">' +
        '<label for="kcSbd" class="kcCN" hidden>Số báo danh</label><div class="kcSbd kcCN" hidden><b id="kcTienTo">••••••</b><input id="kcSbd" inputmode="numeric" autocomplete="off" maxlength="2" placeholder="__"></div>' +
        '<label for="kcNhom" class="kcNH" hidden>Nhóm</label><select id="kcNhom" class="kcNH" hidden><option value="">Chọn nhóm</option>' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option>Nhóm ' + n + '</option>'; }).join('') + '</select>' +
        '<label for="kcMa">Mã giáo viên</label><input id="kcMa" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="Giáo viên nhập">' +
      '</div><p class="kcLoi" id="kcLoi" hidden></p><div class="kcHang"><button class="kcNut" id="kcDi" type="submit">Vào chơi</button></div></div></div></form></div>' +
      // the cau hoi
      '<div class="kcThe" id="kcThe" hidden role="dialog" aria-live="polite"></div>' +
      // khoa
      '<div class="kcLop" id="kcKhoa" hidden><form class="kcTo" id="kcKhoaForm" novalidate style="max-width:480px"><h2>Trò chơi đã bị khóa</h2><p id="kcKhoaChu"></p>' +
        '<div class="kcF"><label for="kcMaMo">Mã mở khóa</label><input id="kcMaMo" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="Giáo viên nhập"></div>' +
        '<p class="kcLoi" id="kcKhoaLoi" hidden></p><div class="kcHang"><button class="kcNut" id="kcMoNut" type="submit">Mở khóa</button></div></form></div>' +
      // thoat
      '<div class="kcLop" id="kcHoiThoat" hidden><div class="kcTo" style="max-width:440px"><h2>Thoát trò chơi?</h2><p>Bài chơi sẽ kết thúc và gửi điểm hiện có.</p><div class="kcHang"><button class="kcNut phu" id="kcKhong">Chơi tiếp</button><button class="kcNut" id="kcCo">Thoát và gửi điểm</button></div></div></div>' +
      // ket thuc
      '<div class="kcLop" id="kcHet" hidden><div class="kcTo kcKq" style="max-width:620px"><h2 id="kcHetTieuDe">Hoàn thành</h2><div class="kcDiem" id="kcDiemCuoi"></div><dl id="kcBang"></dl><ul class="kcXem" id="kcXem"></ul>' +
        '<p class="kcGui" id="kcGui" hidden></p><div class="kcHang"><button class="kcNut phu" id="kcGuiLai" hidden>Gửi lại</button><button class="kcNut" id="kcMoi">Lượt chơi mới</button></div></div></div>';
    document.body.appendChild(w);
  }

  /* ---------- bốc câu ---------- */
  function boc(arr, n) {
    var idx = tron(arr.map(function (_, i) { return i; })), out = [], dung = {};
    idx.forEach(function (i) { if (out.length < n && !dung[arr[i].kt]) { out.push(i); dung[arr[i].kt] = 1; } });
    idx.forEach(function (i) { if (out.length < n && out.indexOf(i) < 0) out.push(i); });
    return out;
  }
  function bocCau() {
    return boc(BO.tn, 6).map(function (id) { return { t: 'mc', id: id, p: tron([0, 1, 2, 3]) }; })
      .concat(boc(BO.ds, 3).map(function (id) { return { t: 'tf', id: id }; }))
      .concat(boc(BO.tln, 2).map(function (id) { return { t: 'sa', id: id }; }));
  }
  var hinh = function (h) { return h ? '<div class="fig"><img src="' + esc(h) + '" alt="Hình của câu hỏi"></div>' : ''; };
  function dungCau() {
    Q = picks.map(function (p) {
      if (p.t === 'tf') { var a = BO.ds[p.id]; return { t: 'tf', kt: a.kt || '', md: a.md || '', q: a.q, f: hinh(a.h), s: a.s, e: a.e || '', max: 2 }; }
      if (p.t === 'sa') { var b = BO.tln[p.id]; return { t: 'sa', kt: b.kt || '', md: b.md || '', q: b.q, f: hinh(b.h), ans: Number(b.a), shown: String(b.a), e: b.e || '', max: 0.5 }; }
      var c = BO.tn[p.id]; return { t: 'mc', kt: c.kt || '', md: c.md || '', q: c.q, f: hinh(c.h), o: p.p.map(function (k) { return c.o[k]; }), a: p.p.indexOf(c.a), e: c.e || '', max: 0.5 };
    });
  }
  function cham(q, r) {
    if (q.t === 'mc') return r === q.a ? 0.5 : 0;
    if (q.t === 'tf') return TF_PTS[q.s.filter(function (s, j) { return r[j] === s[1]; }).length];
    var v = parseNum(r); return v !== null && Math.abs(v - q.ans) < 1e-6 ? 0.5 : 0;
  }
  function tong() { return answers.reduce(function (a, b) { return a + (b || 0); }, 0); }
  function daLam() { return answers.filter(function (a) { return a !== undefined; }).length; }

  /* ---------- HUD ---------- */
  function veTien() {
    var h = '';
    for (var i = 0; i < NQ; i++) {
      var a = answers[i], c = a === undefined ? (i === cur && dangHoi ? 'cur' : '') : a >= Q[i].max - 1e-9 ? 'ok' : a > 0 ? 'mot' : 'sai';
      h += '<i class="' + c + (i === 6 || i === 9 ? ' sep' : '') + '">' + (i + 1) + '</i>';
    }
    $('kcTien').innerHTML = h + '<b>' + fmt(tong()) + ' điểm</b>';
  }
  function tenNguoi() { return nhom() ? player.lop + ' · ' + player.group : player.name + ' · ' + player.lop; }

  /* ---------- lưu tạm ---------- */
  function luu() { try { localStorage.setItem(SAVE, JSON.stringify({ BO: BO, KH: KH, LIMIT: LIMIT, picks: picks, answers: answers.map(function (v) { return v === undefined ? null : v; }), chosen: chosen, cur: cur, player: player, sessionId: sessionId, submitted: submitted, startedAt: startedAt, endedAt: endedAt, deadline: deadline, reason: reason, leaves: leaves, locked: locked })); } catch (e) {} }
  function xoaLuu() { try { localStorage.removeItem(SAVE); } catch (e) {} }

  /* ---------- hỏi câu ---------- */
  var thoiGianDoc = null;
  function hoiCau() {
    if (!player || reason) return Promise.reject(new Error('Chưa vào chơi'));
    if (cho) return cho.p;
    var i = answers.indexOf(undefined); if (i < 0) i = answers.length;
    if (i >= NQ) return Promise.resolve({ i: NQ - 1, diem: 0, max: 0, het: true, tong: tong() });
    cur = i; dangHoi = true;
    var d = {}; d.p = new Promise(function (ok) { d.ok = ok; }); cho = d;
    hienCau(i); veTien(); goi(O.tamDung, 'cau');
    return d.p;
  }
  function hienCau(i) {
    var q = Q[i], the = $('kcThe'), than = '';
    if (q.t === 'mc') than = q.o.map(function (o, k) { return '<button class="kcOpt" data-k="' + k + '"><b>' + 'ABCD'[k] + '</b><span>' + esc(o) + '</span></button>'; }).join('');
    else if (q.t === 'tf') than = '<p class="hint">Chọn Đúng hoặc Sai cho từng ý. Đúng 1 ý: 0.3đ · 2 ý: 0.7đ · 3 ý: 1.2đ · 4 ý: 2đ.</p>' +
      q.s.map(function (s, k) { return '<div class="kcTf" id="kcTf' + k + '"><b>' + 'abcd'[k] + '</b><span>' + esc(s[0]) + '</span><div class="nn"><button data-r="' + k + '" data-v="1">Đúng</button><button data-r="' + k + '" data-v="0">Sai</button></div></div>'; }).join('') +
      '<div class="kcHang" id="kcTfHang"><span class="hint" id="kcTfCon">Còn 4 ý chưa chọn</span><button class="kcNut" id="kcChot" disabled>Chốt đáp án</button></div>';
    else than = '<p class="hint">Chỉ ghi số (số thập phân dùng dấu chấm, vd 1.5). Đúng được 0.5 điểm.</p><form class="kcSa" id="kcSaF" novalidate><input id="kcSaIn" inputmode="decimal" autocomplete="off" maxlength="8" placeholder="Nhập số" aria-label="Đáp án"><button class="kcNut" id="kcChot" type="submit">Chốt</button></form><p class="kcLoi" id="kcSaLoi" hidden></p>';
    the.innerHTML = '<p class="meta">' + esc(O.tram) + ' ' + (i + 1) + '/' + NQ + ' · ' + TEN_PHAN[q.t] + (q.kt ? ' · ' + esc(q.kt) : '') + '</p><p class="q">' + esc(q.q) + '</p>' + q.f + than + '<div id="kcSau"></div>';
    the.hidden = false; the.scrollTop = 0;
    if (q.t === 'mc') [].forEach.call(the.querySelectorAll('.kcOpt'), function (b) { b.onclick = function () { traLoi(i, +b.dataset.k); }; });
    else if (q.t === 'tf') {
      var sel = [undefined, undefined, undefined, undefined];
      [].forEach.call(the.querySelectorAll('.nn button'), function (b) {
        b.onclick = function () {
          if (answers[i] !== undefined) return; var r = +b.dataset.r; sel[r] = b.dataset.v === '1';
          [].forEach.call(the.querySelectorAll('.nn button[data-r="' + r + '"]'), function (x) { x.classList.toggle('on', x === b); });
          var con = sel.filter(function (v) { return v === undefined; }).length;
          $('kcTfCon').textContent = con ? 'Còn ' + con + ' ý chưa chọn' : 'Đã chọn đủ 4 ý, bấm Chốt đáp án'; $('kcChot').disabled = con > 0;
        };
      });
      $('kcChot').onclick = function () { if (sel.every(function (v) { return v !== undefined; })) traLoi(i, sel.slice()); };
    } else {
      var inp = $('kcSaIn');
      inp.oninput = function () { var v = inp.value.replace(/[^0-9,.\-]/g, ''); if (v !== inp.value) inp.value = v; $('kcSaLoi').hidden = true; };
      $('kcSaF').onsubmit = function (e) {
        e.preventDefault();
        if (parseNum(inp.value) === null) { $('kcSaLoi').textContent = inp.value.trim() ? 'Đáp án chỉ gồm chữ số, ví dụ 13 hoặc 1.5.' : (nhom() ? 'Nhóm' : 'Em') + ' chưa nhập đáp án.'; $('kcSaLoi').hidden = false; return; }
        inp.blur(); traLoi(i, inp.value.trim());
      };
    }
  }
  function traLoi(i, r) {
    if (locked || reason || answers[i] !== undefined) return;
    var q = Q[i], d = cham(q, r), du = d >= q.max - 1e-9, the = $('kcThe'), giai = '', giay = 7;
    answers[i] = d; chosen[i] = r; luu(); veTien();
    if (nhom()) try { window.TC && TC.tienDo(baoCao()); } catch (e) {}
    if (q.t === 'mc') {
      [].forEach.call(the.querySelectorAll('.kcOpt'), function (b) { b.disabled = true; var k = +b.dataset.k; if (k === q.a) b.classList.add('dung'); else if (k === r) b.classList.add('sai'); });
      giai = du ? '<strong>Chính xác! +0.5 điểm.</strong> ' : '<strong>Chưa đúng.</strong> Đáp án đúng là ' + 'ABCD'[q.a] + '. ';
    } else if (q.t === 'tf') {
      var k = q.s.filter(function (s, j) { return r[j] === s[1]; }).length; giay = 12;
      [].forEach.call(the.querySelectorAll('.nn button'), function (b) { b.disabled = true; }); $('kcTfHang').remove();
      q.s.forEach(function (s, j) {
        var row = $('kcTf' + j); row.classList.add(r[j] === s[1] ? 'dung' : 'sai');
        row.querySelector('.nn').insertAdjacentHTML('beforeend', '<em>' + (s[1] ? 'Đúng' : 'Sai') + '</em>');
        if (s[2]) row.querySelector('span').insertAdjacentHTML('beforeend', '<small>' + esc(s[2]) + '</small>');
      });
      giai = '<strong>Đúng ' + k + '/4 ý · +' + fmt(d) + ' điểm.</strong> ';
    } else {
      var inp = $('kcSaIn'); inp.disabled = true; inp.classList.add(du ? 'dung' : 'sai'); $('kcChot').remove(); giay = 9;
      giai = du ? '<strong>Chính xác! +0.5 điểm.</strong> ' : '<strong>Chưa đúng.</strong> Đáp án đúng là <b>' + esc(q.shown) + '</b>. ';
    }
    var cuoi = daLam() >= NQ;
    $('kcSau').innerHTML = '<div class="kcGiai">' + giai + esc(q.e) + '</div><div class="kcHang"><span class="hint">Tự đóng sau <b id="kcCon">' + giay + '</b> giây</span><button class="kcNut" id="kcTiep">' + (cuoi ? 'Xem kết quả' : 'Chơi tiếp') + '</button></div>';
    $('kcTiep').onclick = dongCau; $('kcTiep').focus({ preventScroll: true });
    goi(O.ketQua, i, { diem: d, max: q.max, dungHet: du });
    clearInterval(thoiGianDoc); var con = giay;
    thoiGianDoc = setInterval(function () { if (locked || !$('kcHoiThoat').hidden) return; con--; var el = $('kcCon'); if (el) el.textContent = con; if (con <= 0) dongCau(); }, 1000);
  }
  function dongCau() {
    clearInterval(thoiGianDoc);
    if (!cho || answers[cur] === undefined) return;
    var i = cur, d = cho; cho = null; dangHoi = false;
    $('kcThe').hidden = true; veTien();
    var het = daLam() >= NQ;
    d.ok({ i: i, diem: answers[i], max: Q[i].max, dungHet: answers[i] >= Q[i].max - 1e-9, het: het, tong: tong() });
    if (het) { goi(O.veDich, 'done'); setTimeout(function () { ketThuc('done'); }, O.choVeDich || 1500); }
    else goi(O.tiepTuc, 'cau');
  }

  /* ---------- kết thúc, gửi kết quả ---------- */
  function ketThuc(ly) {
    if (reason || !player) return;
    reason = ly; endedAt = Math.min(Date.now(), deadline || Date.now());
    clearInterval(thoiGianDoc); cho = null; dangHoi = false;
    $('kcThe').hidden = true; $('kcKhoa').hidden = true; $('kcHoiThoat').hidden = true; locked = false;
    if (ly !== 'done') goi(O.veDich, ly);
    goi(O.tamDung, 'het');
    hienHet(); luu(); guiKQ();
  }
  function hienHet() {
    $('kcHud').hidden = true; $('kcThoat').hidden = true;
    $('kcHetTieuDe').textContent = { timeout: 'Hết thời gian chơi', violation: 'Kết thúc vì rời màn hình lần 2', quit: (nhom() ? 'Nhóm' : 'Em') + ' đã thoát trò chơi' }[reason] || 'Hoàn thành ' + NQ + ' ' + O.tram.toLowerCase();
    $('kcDiemCuoi').textContent = fmt(tong()) + '/10 điểm';
    var gio = function (ms) { return ms ? new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; };
    var phan = function (t) { return Q.reduce(function (a, q, i) { return a + (q.t === t ? (answers[i] || 0) : 0); }, 0); };
    $('kcBang').innerHTML = (nhom() ? '<dt>Lớp · Nhóm</dt><dd>' + esc(player.lop) + ' · ' + esc(player.group) + '</dd>' : '<dt>Họ và tên</dt><dd>' + esc(player.name) + '</dd><dt>Lớp · SBD</dt><dd>' + esc(player.lop) + ' · ' + esc(player.sbd) + '</dd>') +
      '<dt>Bộ câu</dt><dd>' + esc(BO ? BO.ten : '') + '</dd><dt>Thời gian chơi</dt><dd>' + mmss(endedAt - startedAt) + ' (' + gio(startedAt) + ' – ' + gio(endedAt) + ')</dd>' +
      '<dt>Trắc nghiệm</dt><dd>' + fmt(phan('mc')) + '/3 điểm</dd><dt>Đúng – Sai</dt><dd>' + fmt(phan('tf')) + '/6 điểm</dd><dt>Trả lời ngắn</dt><dd>' + fmt(phan('sa')) + '/1 điểm</dd>';
    $('kcXem').innerHTML = Q.map(function (q, i) {
      var a = answers[i], bg = a === undefined ? '#555' : a >= q.max - 1e-9 ? '#3fae6b' : a > 0 ? '#c98b2b' : '#d9483b';
      return '<li><i style="background:' + bg + '">' + (i + 1) + '</i>' + { mc: 'TN', tf: 'Đ/S', sa: 'TLN' }[q.t] + ': ' + (a === undefined ? 'chưa làm' : fmt(a) + '/' + fmt(q.max) + 'đ') + '</li>';
    }).join('');
    $('kcHet').hidden = false;
  }
  function chuThuong(r, q) { return q.t === 'mc' ? 'chọn ' + 'ABCD'[r] : q.t === 'tf' ? 'chọn ' + r.map(function (v, j) { return 'abcd'[j] + (v ? 'Đ' : 'S'); }).join(' ') : 'ghi ' + r; }
  // Chi tiết từng câu gửi về sổ: [mã câu trong bộ, lựa chọn theo thứ tự gốc, điểm]
  function chiTiet() {
    return picks.map(function (p, i) {
      var r = chosen[i], q = Q[i], c = (p.t === 'mc' ? BO.tn : p.t === 'tf' ? BO.ds : BO.tln)[p.id] || {}, x = '';
      if (answers[i] !== undefined && r !== undefined && r !== null) {
        if (p.t === 'mc') x = 'ABCD'[p.p[r]] || '';
        else if (p.t === 'tf') x = r.map(function (v) { return v ? 'D' : 'S'; }).join('');
        else x = String(r).trim().replace(/,/g, '.');
      }
      return [c.c || '', x, answers[i] === undefined ? '' : Math.round(answers[i] * 100) / 100];
    });
  }
  function baoCao() {
    return { kind: 'result', game: KH.tenKQ, id: sessionId, lop: player.lop, name: player.name || '', sbd: player.sbd || '', group: player.group || '', sheet: '',
      score: tong(), correct: Q.filter(function (q, i) { return answers[i] !== undefined && answers[i] >= q.max - 1e-9; }).length, answered: daLam(), startedAt: startedAt, endedAt: endedAt,
      reason: { timeout: 'Hết thời gian', violation: 'Rời màn hình 2 lần', quit: 'Tự thoát', done: 'Hoàn thành ' + NQ + ' câu' }[reason] || reason, violations: leaves, bo: BO ? BO.ma : '', ct: chiTiet(),
      detail: '[' + O.ten + '] ' + Q.map(function (q, i) { return 'Câu ' + (i + 1) + ' ' + { mc: 'TN', tf: 'Đ/S', sa: 'TLN' }[q.t] + ' ' + q.kt + ': ' + (answers[i] === undefined ? 'chưa làm' : chuThuong(chosen[i], q) + ', ' + fmt(answers[i]) + 'đ'); }).join('; ') };
  }
  var dangGui = false;
  function guiKQ() {
    var m = $('kcGui'), rb = $('kcGuiLai');
    var hien = function (t, c, lai) { m.textContent = t; m.className = 'kcGui ' + (c || ''); m.hidden = false; rb.hidden = !lai; };
    if (!player || !reason) return;
    var rp = baoCao(), xong = (nhom() ? 'Đã gửi kết quả của nhóm' : 'Đã gửi kết quả của em') + ' về sổ theo dõi của giáo viên ✓';
    try { if (nhom()) { window.guiNhomSoTheoDoi && guiNhomSoTheoDoi(rp, KH.maKQ, KH.tenKQ, NQ); try { TC.tienDo(rp, true); } catch (e) {} } else window.guiSoTheoDoi && guiSoTheoDoi(rp, KH.maKQ, KH.tenKQ, NQ); } catch (e) {}
    if (submitted === true) { hien(xong, 'ok'); return; }
    if (!SHEET_URL) { hien('Chưa nối với sổ theo dõi nên kết quả chỉ lưu trên máy này. Hãy chụp màn hình gửi giáo viên.'); return; }
    if (dangGui) return; dangGui = true; hien('Đang gửi kết quả cho giáo viên…');
    fetch(SHEET_URL, { method: 'POST', body: JSON.stringify(rp), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'lỗi'); submitted = true; luu(); hien(xong, 'ok'); })
      .catch(function () { hien('Chưa gửi được kết quả' + (navigator.onLine === false ? ' (máy đang mất mạng)' : '') + '. Kiểm tra mạng rồi bấm Gửi lại.', 'bad', true); })
      .then(function () { dangGui = false; });
  }

  /* ---------- đăng nhập ---------- */
  function api(data) {
    if (!SHEET_URL) return Promise.reject(new Error('nourl'));
    return fetch(SHEET_URL, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  var loiMang = function (e) { return e && e.message === 'nourl' ? 'Trò chơi chưa được nối với sổ theo dõi của giáo viên.' : 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'; };
  var TIEN_TO = {}, CFG = null, soHoi = 0;
  function hienKieu() {
    var k = CFG && CFG.kieu, co = !!k;
    [].forEach.call(document.querySelectorAll('.kcCN'), function (e) { e.hidden = !co || k === 'NHOM'; });
    [].forEach.call(document.querySelectorAll('.kcNH'), function (e) { e.hidden = !co || k !== 'NHOM'; });
    $('kcKieu').textContent = !co ? 'Cá nhân / nhóm' : k === 'NHOM' ? 'Chơi theo nhóm' : 'Chơi cá nhân';
    $('kcTienTo').textContent = TIEN_TO[$('kcLopChon').value] || '••••••';
    $('kcBoChu').hidden = !(CFG && CFG.tenBo); $('kcBoChu').textContent = CFG && CFG.tenBo ? 'Bộ câu: ' + CFG.tenBo + (CFG.phut ? ' · ' + CFG.phut + ' phút' : '') : '';
  }
  function hoiLop() {
    var lop = $('kcLopChon').value, m = $('kcGhi'), so = ++soHoi; CFG = null; hienKieu();
    if (!lop) { m.innerHTML = '👉 Chọn lớp trước – máy sẽ hiện ô <b>chọn nhóm</b> (hoặc họ tên, số báo danh) theo cách chơi giáo viên đặt.'; return; }
    m.textContent = 'Đang hỏi giáo viên cách chơi…';
    if (!window.TC || !TC.cauHinh) { m.textContent = 'Trò chơi chưa nối với sổ theo dõi.'; return; }
    TC.cauHinh(lop).then(function (r) {
      if (so !== soHoi) return; CFG = r; hienKieu();
      m.textContent = r.tt === 'DONG' ? 'Trò chơi đang đóng. Chờ giáo viên mở nhé.' : !r.bo ? 'Giáo viên chưa chọn bộ câu cho trò chơi này.' : r.kieu === 'NHOM' ? 'Hôm nay chơi theo nhóm: chọn nhóm của em.' : 'Hôm nay chơi cá nhân: nhập họ tên và số báo danh.';
    }, function (e) { if (so === soHoi) m.textContent = e.message || 'Không hỏi được sổ theo dõi. Kiểm tra mạng.'; });
  }
  function vaoChoi(e) {
    e.preventDefault();
    var lop = $('kcLopChon').value, ma = $('kcMa').value.trim(), btn = $('kcDi'), loi = $('kcLoi');
    var sai = function (t) { loi.textContent = t; loi.hidden = false; };
    if (!lop) return sai('Cần chọn lớp.');
    if (!CFG) { hoiLop(); return sai('Đang hỏi giáo viên cách chơi, thử lại sau vài giây.'); }
    var kieu = CFG.kieu === 'NHOM' ? 'NHOM' : 'CA NHAN', ten = $('kcHoTen').value.trim().replace(/\s+/g, ' '), duoi = $('kcSbd').value.trim(), nh = $('kcNhom').value;
    var thieu = (kieu === 'NHOM' ? [!nh && 'nhóm'] : [!ten && 'họ và tên', !duoi && 'số báo danh']).concat([!ma && 'mã giáo viên']).filter(Boolean);
    if (thieu.length) return sai('Cần nhập ' + thieu.join(', ') + '.');
    if (kieu !== 'NHOM' && !/^\d{2}$/.test(duoi)) return sai('Phần em nhập của số báo danh phải gồm đúng 2 chữ số, ví dụ 05 hoặc 17.');
    var sbd = kieu === 'NHOM' ? '' : TIEN_TO[lop] + duoi;
    loi.hidden = true; btn.disabled = true; btn.textContent = 'Đang kiểm tra mã…';
    api(kieu === 'NHOM' ? { kind: 'login', code: ma, lop: lop, group: nh } : { kind: 'login', code: ma, lop: lop, name: ten, sbd: sbd }).then(function (r) {
      if (!r.ok) { if (r.error === 'code') { $('kcMa').value = ''; } throw { tb: r.error === 'code' ? 'Mã giáo viên không đúng.' : (r.error || 'Máy chủ từ chối đăng nhập.') }; }
      if (!r.boCau || !r.boCau.tn || r.boCau.tn.length < 6 || r.boCau.ds.length < 3 || r.boCau.tln.length < 2) throw { tb: 'Bộ câu giáo viên chọn chưa đủ câu cho một lượt chơi.' };
      if ((r.kieu === 'NHOM' ? 'NHOM' : 'CA NHAN') !== kieu) { CFG.kieu = r.kieu; hienKieu(); throw { tb: 'Giáo viên vừa đổi cách chơi. Em kiểm tra lại ô nhập rồi bấm Vào chơi.' }; }
      $('kcMa').value = '';
      BO = r.boCau; KH = { kieu: kieu, maKQ: r.maKQ || r.matro, tenKQ: r.tenKQ || O.ten };
      LIMIT = (Number(r.minutes) || 5) * 60000;
      btn.textContent = 'Ở vạch xuất phát…';
      return (window.XuatPhat ? XuatPhat.cho(r, { ten: kieu === 'NHOM' ? nh + ' · Lớp ' + lop : ten + ' · Lớp ' + lop }) : Promise.resolve(null)).then(function (xp) {
        picks = bocCau(); dungCau(); answers = []; chosen = []; cur = -1; reason = ''; leaves = 0; submitted = false;
        sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        player = kieu === 'NHOM' ? { lop: lop, group: nh } : { lop: lop, name: ten, sbd: sbd };
        startedAt = xp ? xp.startAt : Date.now(); deadline = xp ? xp.endAt : startedAt + LIMIT;
        luu(); batDauChoi(false);
      });
    }).catch(function (ex) { sai(ex && ex.tb ? ex.tb : ex && ex.xp ? ex.message : loiMang(ex)); })
      .then(function () { btn.disabled = false; btn.textContent = 'Vào chơi'; });
  }
  function batDauChoi(tiep) {
    $('kcVao').hidden = true; $('kcHud').hidden = false; $('kcThoat').hidden = false;
    $('kcAi').textContent = tenNguoi(); $('kcTieuDe').firstChild.textContent = O.ten + ' · ' + (BO ? BO.ten : '');
    if (document.activeElement) document.activeElement.blur();
    veTien();
    if (nhom()) try { window.TC && TC.tienDo(baoCao()); } catch (e) {}
    goi(O.batDau, { tiepTuc: !!tiep, daLam: daLam(), tong: NQ, kieu: KH.kieu, boCau: BO ? BO.ten : '' });
  }

  /* ---------- khóa khi rời màn hình ---------- */
  var dangChoi = function () { return !!player && !reason && $('kcVao').hidden; };
  function khoa() {
    if (!dangChoi() || locked) return;
    leaves++; if (leaves >= 2) { ketThuc('violation'); return; }
    hienKhoa();
  }
  function hienKhoa() {
    locked = true; $('kcHoiThoat').hidden = true; goi(O.tamDung, 'khoa');
    $('kcKhoaChu').textContent = (nhom() ? player.group : 'Em ' + player.name) + ' (' + player.lop + ') đã rời khỏi màn hình chơi (lần 1). Báo giáo viên nhập mã để chơi tiếp. Đồng hồ vẫn chạy. Rời màn hình thêm lần nữa thì trò chơi kết thúc ngay và tính điểm.';
    $('kcMaMo').value = ''; $('kcKhoaLoi').hidden = true; $('kcKhoa').hidden = false; luu();
  }
  function moKhoa(e) {
    e.preventDefault();
    var ma = $('kcMaMo').value.trim(), loi = $('kcKhoaLoi'), b = $('kcMoNut');
    if (!ma) { loi.textContent = 'Giáo viên nhập mã mở khóa.'; loi.hidden = false; return; }
    b.disabled = true; b.textContent = 'Đang kiểm tra…';
    api({ kind: 'unlock', code: ma, lop: player.lop, sbd: player.sbd || '' }).then(function (r) {
      if (!r.ok) { loi.textContent = 'Mã không đúng. Chỉ giáo viên mới có mã mở khóa.'; loi.hidden = false; return; }
      locked = false; $('kcKhoa').hidden = true; luu();
      if (Date.now() >= deadline) { ketThuc('timeout'); return; }
      if (!dangHoi) goi(O.tiepTuc, 'khoa');
    }, function (ex) { loi.textContent = loiMang(ex); loi.hidden = false; })
      .then(function () { b.disabled = false; b.textContent = 'Mở khóa'; });
  }
  function khoiPhuc() {
    var d = null; try { d = JSON.parse(localStorage.getItem(SAVE) || 'null'); } catch (e) {}
    if (!d || !d.player || !d.BO || !d.picks) return;
    BO = d.BO; KH = d.KH || KH; picks = d.picks; dungCau(); LIMIT = d.LIMIT || LIMIT; player = d.player;
    answers = (d.answers || []).map(function (v) { return v === null ? undefined : v; }); chosen = d.chosen || [];
    sessionId = d.sessionId || ''; submitted = d.submitted; startedAt = d.startedAt; endedAt = d.endedAt || 0; deadline = d.deadline; reason = d.reason || ''; leaves = d.leaves || 0;
    if (reason) { $('kcVao').hidden = true; hienHet(); guiKQ(); return; }
    if (Date.now() >= deadline) { $('kcVao').hidden = true; ketThuc('timeout'); return; }
    batDauChoi(true);
    // Tải lại trang = rời màn hình. Lúc trang cũ đóng (blur/pagehide) thường đã tính 1 lần và lưu locked=true,
    // nên chỉ hiện khóa, không tính thêm; chưa kịp lưu khóa thì mới tính lần rời này.
    if (d.locked) hienKhoa();
    else { leaves++; if (leaves >= 2) { ketThuc('violation'); return; } hienKhoa(); }
  }

  /* ---------- khởi tạo ---------- */
  function khoiTao(o) {
    for (var k in o) O[k] = o[k];
    dungGiaoDien();
    (window.DS_LOP || []).forEach(function (l) { TIEN_TO[l.ten] = l.tiento; var op = document.createElement('option'); op.value = op.textContent = l.ten; $('kcLopChon').appendChild(op); });
    $('kcLopChon').onchange = hoiLop;
    $('kcSbd').oninput = function () { this.value = this.value.replace(/\D/g, '').slice(0, 2); };
    $('kcForm').onsubmit = vaoChoi;
    $('kcKhoaForm').onsubmit = moKhoa;
    $('kcThoat').onclick = function () { if (dangChoi()) { goi(O.tamDung, 'thoat'); $('kcHoiThoat').hidden = false; } };
    $('kcKhong').onclick = function () { $('kcHoiThoat').hidden = true; if (!dangHoi && !locked) goi(O.tiepTuc, 'thoat'); };
    $('kcCo').onclick = function () { ketThuc('quit'); };
    $('kcGuiLai').onclick = function () { submitted = false; guiKQ(); };
    $('kcMoi').onclick = function () { xoaLuu(); location.reload(); };
    document.addEventListener('visibilitychange', function () { if (document.hidden) khoa(); });
    window.addEventListener('blur', khoa); window.addEventListener('pagehide', khoa);
    window.addEventListener('online', function () { if (reason && submitted !== true) guiKQ(); });
    setInterval(function () {
      if (!player || reason) return;
      var con = deadline - Date.now(), el = $('kcGio'); el.textContent = 'Còn ' + mmss(con); el.classList.toggle('it', con < 60000);
      if (con <= 0) ketThuc('timeout');
    }, 250);
    khoiPhuc();
  }

  window.KHUNG = {
    khoiTao: khoiTao,          // KHUNG.khoiTao({ten, tram, luat, batDau, tamDung, tiepTuc, ketQua, veDich, choVeDich})
    hoiCau: hoiCau,            // Promise<{i, diem, max, dungHet, het, tong}>
    ketThuc: function () { ketThuc('done'); },
    tong: NQ,
    daLam: daLam,
    diem: tong,
    dangChoi: function () { return dangChoi() && !locked && !dangHoi; },
    dangHoi: function () { return dangHoi; },
    conLai: function () { return Math.max(0, deadline - Date.now()); },
    kieu: function () { return KH.kieu; }
  };
})();
