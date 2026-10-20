/* Noi tro choi voi So theo doi tung lop (he thong kiem tra LAM-BAI-KIEM-TRA).
   - Moi luot choi xong: gui them 1 dong vao tab HOAT DONG cua so lop em do (SBD 8 so -> tim lop theo 6 so dau).
   - Mo trang voi ?demo: dung lop DEMO, khong ghi vao Google Sheet rieng cua tro choi.
   Dat 2 the <script> nay TRUOC script chinh cua tro choi:
     <script src="https://sau-rieng.github.io/LAM-BAI-KIEM-TRA/cau-hinh-lop.js" data-banner="khong"></script>
     <script src="noi-so-theo-doi.js"></script>
   Trong sendResult(): try{ guiSoTheoDoi(buildReport(), 'MA-TRO', 'Ten tro choi', tongSoCau); }catch(_){} */
(function () {
  var DEMO = /[?&]demo(=|&|$)/i.test(location.search);
  if (DEMO && window.CAU_HINH) window.CAU_HINH.SHEET_URL = '';   // ban dung thu: khong ghi vao sheet that cua tro choi
  function giay(rep) {
    if (rep.endedAt && rep.startedAt) return Math.round((rep.endedAt - rep.startedAt) / 1000);
    var m = /^(\d+):(\d{2})$/.exec(String(rep.used || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : '';
  }
  window.guiSoTheoDoi = function (rep, maTro, tenTro, tong) {
    try {
      if (!rep) return;
      var sbd = String(rep.sbd || '').trim(), ds = window.DS_LOP || [];
      var lop = ds.filter(function (l) { return sbd.length === 8 && sbd.indexOf(l.tiento) === 0; })[0];
      if (!lop || !/^https:\/\//.test(lop.url)) return;
      var key = 'noiso_' + maTro + '_' + (rep.id || sbd + '_' + (rep.endedAt || rep.finishedAt || ''));
      try { if (localStorage.getItem(key)) return; } catch (e) {}
      var dung = Number(rep.correct != null ? rep.correct : rep.score) || 0;
      var t = Number(tong) || ((Number(rep.correct) || 0) + (Number(rep.wrong) || 0) + (Number(rep.none) || 0)) || (rep.pattern ? rep.pattern.length : 0);
      var du = { loai: 'hoatdong', mahs: sbd, mahoatdong: maTro, cauhoi: tenTro,
        solanthu: rep.score != null ? rep.score : dung, dungsai: dung + '/' + t, thoigian: giay(rep) };
      fetch(lop.url, { method: 'POST', body: JSON.stringify(du) }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok) { try { localStorage.setItem(key, '1'); } catch (e) {} } }).catch(function () {});
    } catch (e) {}
  };
  // Ban dung thu: them lop DEMO vao o chon lop
  if (DEMO) document.addEventListener('DOMContentLoaded', function () {
    var co = false;
    try { if (typeof SBD_PREFIX === 'object') { SBD_PREFIX.DEMO = '269999'; co = true; } } catch (e) {}
    var s = document.getElementById('fClass');
    if (co && s && !/DEMO/.test(s.innerHTML)) { var o = document.createElement('option'); o.textContent = 'DEMO'; o.value = 'DEMO'; s.appendChild(o); }
    var b = document.createElement('div');
    b.textContent = 'BẢN DÙNG THỬ · lớp DEMO';
    b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#a06b00;color:#fff;font:600 13px system-ui,sans-serif;padding:4px 10px;border-radius:8px;pointer-events:none';
    document.body.appendChild(b);
  });
})();
