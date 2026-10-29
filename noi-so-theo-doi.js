/* Noi tro choi voi So theo doi tung lop (he thong "Kham pha Hoa hoc" - LAM-BAI-KIEM-TRA).
   Quan ly CHUNG: trang giao vien (GIAO-VIEN.html) -> Tro choi: mo/dong, thoi gian, lop cho tung tro.
   - Dang nhap (ma vao choi) va mo khoa (ma mo khoa) kiem tra o so lop -> tab TRO CHOI + tab MA trong KHO DE.
   - Moi luot choi xong: ca nhan -> tab HOAT DONG, nhom -> tab TRO CHOI NHOM cua so lop.
   - Tro choi khong can Sheet rieng nua: SHEET_URL duoc thay bang dia chi "so lop" ao, file nay chuyen yeu cau.
     Neu so lop chua cap nhat ban moi, yeu cau duoc chuyen ve Sheet rieng cu (neu co) nhu truoc.
   - Mo trang voi ?demo: dung lop DEMO (so DEMO, bo ma dung thu).
   Dat 2 the <script> nay TRUOC script chinh cua tro choi:
     <script src="https://sau-rieng.github.io/LAM-BAI-KIEM-TRA/cau-hinh-lop.js" data-banner="khong"></script>
     <script src="noi-so-theo-doi.js"></script>
   Tro moi: them ten file + ma tro vao TC_TRO duoi day VA vao TC_MAC_DINH trong SoTheoDoi.gs. */
(function () {
  var DEMO = /[?&]demo(=|&|$)/i.test(location.search);
  var TC_TRO = {
    'DAINOI-HOA10.html': 'DAINOI-HOA10', 'DAINOI-KHTN9.html': 'DAINOI-KHTN9',
    'HOA10-CHIMDUATHU.html': 'CHIMDUATHU-HOA10', 'HOA10-DUAXEF1-CANHAN.html': 'DUAXEF1-HOA10',
    'LANGBIANG-HOA10.html': 'LANGBIANG-HOA10', 'HOA10-CHIMDUATHU-NHOM.html': 'CHIMDUATHU-HOA10-NHOM',
    'HOA10-DUAXEF1-NHOM.html': 'DUAXEF1-HOA10-NHOM', 'RUONGLUA-CHUKI-NHOM.html': 'RUONGLUA-CHUKI-NHOM',
    'HOA12-DUAXEF1-POLYMER-CANHAN.html': 'DUAXEF1-POLYMER-H12', 'POLYMER-F1.html': 'POLYMER-F1',
    'HOA12-DUAXEF1-POLYMER.html': 'DUAXEF1-POLYMER-H12-NHOM',
    'HOA12-PIN-F1-NHOM.html': 'PIN-F1-H12-NHOM',
    'HOA12CHUONG123.html': 'CHUONG123-H12', 'H12-CHUONG123-NHOM.html': 'CHUONG123-H12-NHOM',
    'cave-explore.html': 'HANGDONG-H12'
  };
  var tep = decodeURIComponent(location.pathname.split('/').pop() || '');
  var MATRO = TC_TRO[tep] || (window.CAU_HINH && window.CAU_HINH.MA_TRO) || '';
  var SO = 'https://so-theo-doi.lop/exec';             // dia chi ao: moi yeu cau toi day do file nay xu ly
  var CU = DEMO ? '' : String((window.CAU_HINH || {}).SHEET_URL || '').trim();   // Sheet rieng cu (du phong)
  if (MATRO) { window.CAU_HINH = window.CAU_HINH || {}; window.CAU_HINH.SHEET_URL = SO; }
  else if (DEMO && window.CAU_HINH) window.CAU_HINH.SHEET_URL = '';
  var cheDoCu = false;                                  // so lop chua co ban moi -> dung Sheet cu
  var KL = 'tc_lop_' + MATRO + (DEMO ? '_demo' : '');

  function dsLop() { return window.DS_LOP || []; }
  function timLop(ten, sbd) {
    var t = String(ten || '').trim().toUpperCase(), s = String(sbd || '').trim();
    return dsLop().filter(function (l) { return t && l.ten.toUpperCase() === t; })[0]
      || dsLop().filter(function (l) { return s.length === 8 && s.indexOf(l.tiento) === 0; })[0] || null;
  }
  // Ma rieng cua may + ten hien o vach xuat phat (de giao vien thay ai da san sang)
  var MAY = '', TEN_VACH = '';
  try { MAY = localStorage.getItem('tc_may') || ''; if (!MAY) { MAY = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('tc_may', MAY); } }
  catch (e) { MAY = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function luuLop(t) { try { if (t) localStorage.setItem(KL, t); } catch (e) {} }
  function docLop() { try { return localStorage.getItem(KL) || ''; } catch (e) { return ''; } }
  var gocFetch = window.fetch ? window.fetch.bind(window) : null;
  function guiSo(url, du) {
    return gocFetch(url, { method: 'POST', body: JSON.stringify(du) }).then(function (r) { return r.json(); });
  }
  function chuaCapNhat(r) { return r && r.ok === false && /khong hop le/i.test(String(r.msg || '')) && !r.loi; }
  function duPhong(d, body) {
    cheDoCu = true;
    if (CU) return gocFetch(CU, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' })
      .then(function (r) { return r.json(); });
    if (DEMO && window.demoApi) return window.demoApi(d);
    var k = d.kind || d.action;
    if (k === 'login' || k === 'check') return Promise.resolve({ ok: true, minutes: 5, ticket: 'cu' });
    return Promise.resolve({ ok: false, error: 'Sổ theo dõi lớp chưa cập nhật bản mới. Báo giáo viên.' });
  }
  var LOI_MANG = 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';

  // Xu ly 1 yeu cau tro choi gui toi SHEET_URL (dang nhap / mo khoa / ket qua / thong ke)
  function xuLy(body) {
    var d = {};
    try { d = JSON.parse(body || '{}'); } catch (e) {}
    var k = d.kind || d.action || '';
    if (k === 'login' || k === 'check') {
      var tenLop = d.lop || d.cls || '';
      luuLop(tenLop);
      TEN_VACH = String(d.group || d.name || d.member || '').trim();
      var l = timLop(tenLop, d.sbd);
      if (!l) return Promise.resolve({ ok: false, error: 'Chưa có sổ theo dõi của lớp ' + tenLop + '.' });
      var tGui = Date.now();
      return guiSo(l.url, { action: 'tc_vao', matro: MATRO, lop: tenLop, ma: String(d.code || '').trim(), may: MAY, ten: TEN_VACH }).then(function (r) {
        if (chuaCapNhat(r)) return duPhong(d, body);
        cheDoCu = false;
        var tNhan = Date.now();
        if (r && r.ok) return { ok: true, minutes: r.phut, sheet: '', ticket: 'so-' + Date.now().toString(36), ten: r.ten,
          tt: r.tt || 'MO', xp: Number(r.xp) || 0, lech: r.bayGio ? r.bayGio - (tGui + tNhan) / 2 : 0, rtt: tNhan - tGui };
        return { ok: false, error: (r && r.msg) || 'Máy chủ từ chối đăng nhập.' };
      }, function () { return { ok: false, error: LOI_MANG }; });
    }
    if (k === 'unlock') {
      var l2 = timLop(d.lop || docLop(), d.sbd);
      if (!l2) return Promise.resolve({ ok: false, error: 'code' });
      return guiSo(l2.url, { action: 'tc_mokhoa', ma: String(d.code || '').trim() }).then(function (r) {
        if (chuaCapNhat(r)) return duPhong(d, body);
        return r && r.ok ? { ok: true } : { ok: false, error: 'code' };
      }, function () { return { ok: false, error: LOI_MANG }; });
    }
    if (k === 'stats') return Promise.resolve({ ok: true, rows: [] });
    // Con lai: ket qua luot choi -> da gui qua guiSoTheoDoi / guiNhomSoTheoDoi, cho ket qua lan gui do
    var p = window.__tcGui || Promise.resolve({ ok: false, msg: 'Không tìm thấy sổ của lớp để gửi kết quả.' });
    return p.then(function (r) {
      if (cheDoCu && CU) return duPhong(d, body);
      return r && r.ok ? { ok: true } : { ok: false, error: (r && r.msg) || 'Sổ lớp chưa nhận kết quả.' };
    });
  }
  if (MATRO && gocFetch) window.fetch = function (url, opt) {
    if (String(url && url.url || url).indexOf(SO) !== 0) return gocFetch(url, opt);
    return xuLy(opt && opt.body).then(function (o) {
      return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
  };

  // Goi truc tiep tu tro choi (tro khong dung api()): TC.vao(lop, ma) -> {ok, phut, msg}; TC.moKhoa(ma) -> true/false
  window.TC = {
    matro: MATRO,
    vao: function (lop, ma, sbd) {
      return xuLy(JSON.stringify({ kind: 'login', lop: lop, code: ma, sbd: sbd })).then(function (r) {
        return { ok: !!r.ok, phut: Number(r.minutes) || 5, msg: r.ok ? '' : (r.error === 'code' ? 'Mã vào chơi không đúng.' : r.error) };
      });
    },
    // May o vach xuat phat hoi trang thai tro: {tt: MO/CHO/DONG, xp: gio xuat phat (gio may chu), phut, lech, rtt}
    trangThai: function () {
      var l = timLop(docLop());
      if (!l) return Promise.reject(new Error('Chưa có sổ theo dõi của lớp.'));
      var tGui = Date.now();
      return guiSo(l.url, { action: 'tc_tt', matro: MATRO, may: MAY, ten: TEN_VACH, lop: l.ten }).then(function (r) {
        if (chuaCapNhat(r)) return { ok: true, tt: 'MO', xp: 0 };
        var tNhan = Date.now();
        return { ok: true, tt: r.tt || 'MO', xp: Number(r.xp) || 0, phut: Number(r.phut) || 0,
          lech: r.bayGio ? r.bayGio - (tGui + tNhan) / 2 : 0, rtt: tNhan - tGui };
      });
    },
    // Tro nhom gui diem hien tai sau moi cau de trang giao vien ve cot moc dan (khong cho tra loi)
    tienDo: function (rep, ket) {
      try {
        if (!rep || !rep.group || !MATRO) return;
        var l = timLop(rep.lop || rep.cls || docLop());
        if (!l || !/^https:\/\//.test(l.url)) return;
        gocFetch(l.url, { method: 'POST', body: JSON.stringify({ action: 'tc_tiendo', matro: MATRO, nhom: String(rep.group), maluot: rep.id || '',
          diem: rep.score != null ? rep.score : (rep.correct || 0), xong: rep.answered || 0, ket: !!ket }) }).catch(function () {});
      } catch (e) {}
    },
    moKhoa: function (ma, kiemCu) {
      return xuLy(JSON.stringify({ kind: 'unlock', code: ma })).then(function (r) {
        if (cheDoCu && typeof kiemCu === 'function') return !!kiemCu(ma);
        return !!(r && r.ok);
      }, function () { return typeof kiemCu === 'function' ? !!kiemCu(ma) : false; });
    }
  };

  function giay(rep) {
    if (rep.endedAt && rep.startedAt) return Math.round((rep.endedAt - rep.startedAt) / 1000);
    var m = /^(\d+):(\d{2})$/.exec(String(rep.used || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : '';
  }
  function guiVaGhiNho(url, du, key) {
    var p = gocFetch(url, { method: 'POST', body: JSON.stringify(du) }).then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) { try { localStorage.setItem(key, '1'); } catch (e) {} return { ok: true }; }
        return { ok: false, msg: (j && j.msg) || 'Sổ lớp từ chối kết quả.' };
      }, function () { return { ok: false, msg: LOI_MANG }; });
    window.__tcGui = p;
    return p;
  }
  window.guiSoTheoDoi = function (rep, maTro, tenTro, tong) {
    window.__tcGui = null;
    try {
      if (!rep) return;
      var sbd = String(rep.sbd || '').trim();
      var lop = dsLop().filter(function (l) { return sbd.length === 8 && sbd.indexOf(l.tiento) === 0; })[0];
      if (!lop || !/^https:\/\//.test(lop.url)) { window.__tcGui = Promise.resolve({ ok: false, msg: 'Số báo danh ' + sbd + ' không thuộc lớp nào.' }); return; }
      var key = 'noiso_' + maTro + '_' + (rep.id || sbd + '_' + (rep.endedAt || rep.finishedAt || ''));
      try { if (localStorage.getItem(key)) { window.__tcGui = Promise.resolve({ ok: true }); return; } } catch (e) {}
      var dung = Number(rep.correct != null ? rep.correct : rep.score) || 0;
      var t = Number(tong) || ((Number(rep.correct) || 0) + (Number(rep.wrong) || 0) + (Number(rep.none) || 0)) || (rep.pattern ? rep.pattern.length : 0);
      var du = { loai: 'hoatdong', mahs: sbd, mahoatdong: maTro, cauhoi: tenTro,
        solanthu: rep.score != null ? rep.score : dung, dungsai: dung + '/' + t, thoigian: giay(rep) };
      guiVaGhiNho(lop.url, du, key);
    } catch (e) {}
  };
  // Tro choi nhom: gui 1 dong vao tab TRO CHOI NHOM cua so lop (tim lop theo ten lop da chon)
  window.guiNhomSoTheoDoi = function (rep, maTro, tenTro, tong) {
    window.__tcGui = null;
    try {
      if (!rep || !rep.group) return;
      var ten = String(rep.lop || rep.cls || '').trim().toUpperCase();
      var lop = dsLop().filter(function (l) { return l.ten.toUpperCase() === ten; })[0];
      if (!lop || !/^https:\/\//.test(lop.url)) { window.__tcGui = Promise.resolve({ ok: false, msg: 'Chưa có sổ theo dõi của lớp ' + ten + '.' }); return; }
      var key = 'noiso_nhom_' + maTro + '_' + (rep.id || ten + rep.group + (rep.endedAt || ''));
      try { if (localStorage.getItem(key)) { window.__tcGui = Promise.resolve({ ok: true }); return; } } catch (e) {}
      var dung = Number(rep.correct) || 0, t = Number(tong) || Number(rep.answered) || 0;
      var du = { loai: 'nhom', nhom: String(rep.group), matro: maTro, tentro: tenTro, diem: rep.score != null ? rep.score : dung,
        dungsai: dung + '/' + t, thoigian: giay(rep), maluot: rep.id || '' };
      guiVaGhiNho(lop.url, du, key);
    } catch (e) {}
  };
  // Ban dung thu, du phong khi so DEMO chua cap nhat: may chu gia (dang nhap ma 1111, mo khoa ma 2222)
  window.demoApi = function (d) {
    var k = d && (d.kind || d.action), c = String((d && d.code) || '').trim();
    if (k === 'login' || k === 'check') return Promise.resolve(c === '1111' ? { ok: true, minutes: 5, sheet: 'DEMO', ticket: 'demo' } : { ok: false, error: 'code' });
    if (k === 'unlock') return Promise.resolve(c === '2222' ? { ok: true } : { ok: false, error: 'code' });
    if (k === 'stats') return Promise.resolve({ ok: true, rows: [] });
    return Promise.resolve({ ok: true });
  };
  // Ban dung thu: them lop DEMO vao o chon lop
  if (DEMO) document.addEventListener('DOMContentLoaded', function () {
    try { if (typeof SBD_PREFIX === 'object') SBD_PREFIX.DEMO = '269999'; } catch (e) {}
    ['fClass', 'fLop', 'lop'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.tagName === 'SELECT' && !/DEMO/.test(s.innerHTML)) { var o = document.createElement('option'); o.textContent = 'DEMO'; o.value = 'DEMO'; s.appendChild(o); }
    });
    var b = document.createElement('div');
    b.textContent = 'BẢN DÙNG THỬ · lớp DEMO';
    b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#a06b00;color:#fff;font:600 13px system-ui,sans-serif;padding:4px 10px;border-radius:8px;pointer-events:none';
    document.body.appendChild(b);
  });
})();
