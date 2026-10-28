/* Vach xuat phat dung chung cho cac tro dua xe F1.
   Giao vien chuyen tro sang "Cho xuat phat" o trang giao vien: hoc sinh dang nhap xong dung o vach (cau hoi da co san trong may).
   Giao vien bam "Xuat phat": may chu dat gio den xanh = luc bam + 12 giay. Moi may hoi trang thai 2,5–4 giay mot lan,
   nhan gio den xanh, tinh lech dong ho voi may chu, roi dem nguoc 5 den do va chay cung mot luc.
   Nhom vao muon (cuoc dua dang dien ra) vao ngay, ket thuc cung gio voi ca lop.
   Dung trong tro choi (sau noi-so-theo-doi.js):
     const xp = await XuatPhat.cho(r, {ten: 'Nhóm 3 · Lớp 12G01'});   // r: ket qua dang nhap
     xp = null  -> choi tu do nhu cu;  xp = {startAt, endAt, muon} -> gio may nay luc den xanh va luc het gio.
   Loi (giao vien dong tro, hoc sinh bam Quay lai) -> Error co thuoc tinh xp = true. */
(function () {
  var el = null, hen = 0, khung = 0;
  var CSS = '#xpManh{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:16px;background:rgba(6,9,11,.9);color:#f1f4ef;font-family:"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}' +
    '#xpManh .k{width:min(560px,100%);border:1px solid rgba(255,255,255,.18);background:#121a1d;display:grid;gap:14px;padding:0 0 22px}' +
    '#xpManh .co{height:14px;background:repeating-conic-gradient(#f1f4ef 0 25%,#0c1113 0 50%) 0 0/14px 14px}' +
    '#xpManh .t{font:800 30px/1.05 "Saira Condensed","Arial Narrow",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#ffd21f;margin:6px 18px 0}' +
    '#xpManh .ten{font-size:17px;font-weight:700;margin:0 18px}' +
    '#xpManh .m{font-size:15px;line-height:1.5;color:#a6b4b4;margin:0 22px}' +
    '#xpManh .den{display:flex;gap:12px;justify-content:center;background:#070a0b;border:1px solid rgba(255,255,255,.14);padding:12px 16px;margin:0 auto}' +
    '#xpManh .den i{width:42px;height:42px;border-radius:50%;background:#2a0e0c;border:3px solid #000;display:block}' +
    '#xpManh .den i.on{background:#ff2a1a;box-shadow:0 0 22px #ff2a1a}' +
    '#xpManh .so{font:800 64px/1 "Saira Condensed","Arial Narrow",sans-serif;color:#ffd21f;font-variant-numeric:tabular-nums}' +
    '#xpManh .cho i{display:inline-block;width:8px;height:8px;margin:0 3px;border-radius:50%;background:#ffd21f;animation:xpN 1.2s infinite}' +
    '#xpManh .cho i:nth-child(2){animation-delay:.2s}#xpManh .cho i:nth-child(3){animation-delay:.4s}' +
    '@keyframes xpN{0%,80%,100%{opacity:.2}40%{opacity:1}}' +
    '#xpManh button{justify-self:center;background:transparent;color:#a6b4b4;border:1px solid rgba(255,255,255,.2);padding:8px 16px;font:600 14px inherit;cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){#xpManh .cho i{animation:none;opacity:.8}}' +
    '@media (max-width:420px){#xpManh .den i{width:32px;height:32px}#xpManh .den{gap:8px}}';
  function dung() {
    if (el) return el;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'xpManh'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="k"><div class="co"></div><div class="t">Vạch xuất phát</div><p class="ten"></p>' +
      '<div class="den" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="so" hidden></div>' +
      '<p class="m"></p><button type="button">Quay lại</button></div>';
    document.body.appendChild(el);
    return el;
  }
  function an() { clearTimeout(hen); cancelAnimationFrame(khung); if (el) el.hidden = true; }
  function loi(msg) { var e = new Error(msg); e.xp = true; return e; }

  window.XuatPhat = {
    cho: function (r, o) {
      o = o || {};
      if (!r || r.tt !== 'CHO' || !window.TC || !TC.trangThai) return Promise.resolve(null);
      var lech = Number(r.lech) || 0, rtt = Number(r.rtt) || 9e9, phutMd = Number(r.minutes) || 5;
      var m = dung(); m.hidden = false;
      m.querySelector('.ten').textContent = o.ten || '';
      var den = [].slice.call(m.querySelectorAll('.den i')), so = m.querySelector('.so'), msg = m.querySelector('.m');
      function choLenh(t) { so.hidden = true; den.forEach(function (d) { d.classList.remove('on'); }); msg.innerHTML = t + ' <span class="cho"><i></i><i></i><i></i></span>'; }
      choLenh('Câu hỏi đã tải xong. Chờ giáo viên bấm <b>Xuất phát</b>');
      return new Promise(function (xong, hong) {
        var daXong = false;
        function ket(v) { if (daXong) return; daXong = true; an(); xong(v); }
        function hoiLai(ms) { clearTimeout(hen); hen = setTimeout(hoi, ms); }
        m.querySelector('button').onclick = function () { if (daXong) return; daXong = true; an(); hong(loi('Đã quay lại màn hình đăng nhập.')); };
        function batDau(xp, phut) {
          var bd = xp - lech, kt = bd + phut * 60000;
          if (kt - Date.now() < 20000) { choLenh('Lượt đua vừa kết thúc. Chờ giáo viên mở lượt mới'); hoiLai(4000); return; }
          if (Date.now() >= bd) { ket({ startAt: bd, endAt: kt, muon: true }); return; }
          clearTimeout(hen);
          (function ve() {
            var con = bd - Date.now();
            if (con <= 0) { den.forEach(function (d) { d.classList.remove('on'); }); ket({ startAt: bd, endAt: kt, muon: false }); return; }
            var giay = Math.ceil(con / 1000);
            den.forEach(function (d, i) { d.classList.toggle('on', con <= 5000 && i < 5 - Math.floor((con - 1) / 1000)); });
            so.hidden = con <= 5000; so.textContent = giay;
            msg.textContent = con <= 5000 ? 'Tắt hết đèn đỏ là xuất phát!' : 'Giáo viên đã bấm Xuất phát. Chuẩn bị…';
            khung = requestAnimationFrame(ve);
          })();
          // van hoi tiep phong khi giao vien huy luot (chuyen trang thai) trong luc dem nguoc
          hen = setTimeout(function kiem() {
            if (daXong) return;
            TC.trangThai().then(function (t) {
              if (daXong) return;
              if (t.tt === 'DONG') { daXong = true; an(); hong(loi('Giáo viên đã đóng trò chơi.')); return; }
              if (t.tt === 'CHO' && !t.xp) { cancelAnimationFrame(khung); choLenh('Giáo viên đã hủy lượt xuất phát. Chờ lệnh mới'); hoiLai(3000); return; }
              hen = setTimeout(kiem, 3000);
            }, function () { hen = setTimeout(kiem, 3000); });
          }, 3000);
        }
        function hoi() {
          if (daXong) return;
          TC.trangThai().then(function (t) {
            if (daXong) return;
            if (t.rtt && t.rtt < rtt) { rtt = t.rtt; lech = t.lech; }   // giu phep do lech co do tre nho nhat
            if (t.tt === 'DONG') { daXong = true; an(); hong(loi('Giáo viên đã đóng trò chơi.')); return; }
            if (t.tt === 'MO') { ket(null); return; }   // giao vien chuyen sang mo tu do: vao choi ngay
            if (t.xp) { batDau(t.xp, t.phut || phutMd); return; }
            hoiLai(2500 + Math.random() * 1500);
          }, function () { hoiLai(4000); });
        }
        if (r.xp) batDau(r.xp, phutMd); else hoiLai(1500 + Math.random() * 1500);
      });
    }
  };
})();
