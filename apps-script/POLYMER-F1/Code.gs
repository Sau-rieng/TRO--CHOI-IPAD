/**
 * POLYMER GRAND PRIX – HÓA 12 (chơi cá nhân) – kiểm tra mã giáo viên, nhận kết quả, ghi vào Google Sheet riêng của trò này.
 *
 * Cách dùng (tóm tắt):
 *  1. Tạo một Google Sheet MỚI chỉ dùng cho trò này (ví dụ đặt tên "Polymer Grand Prix – Kết quả").
 *  2. Trong Sheet đó: Tiện ích mở rộng → Apps Script → xoá nội dung có sẵn, dán toàn bộ file này vào Code.gs → Lưu.
 *  3. Chọn hàm caiDat → Chạy (một lần) → cấp quyền. Sheet sẽ có trang tính CauHinh gồm:
 *       B1 mã giáo viên (7070), B2 mã mở khoá (7979), B3 thời gian chơi (phút),
 *       B4 TÊN BẢNG KẾT QUẢ của ca chơi hiện tại, ví dụ "12G01 – Tiết 3 ngày 14/10".
 *     Mỗi ca chơi / mỗi lớp mới: giáo viên gõ tên mới vào ô B4. Kết quả của ca đó tự ghi vào một trang tính
 *     MỚI mang đúng tên này (mỗi học sinh một dòng). Để trống B4 thì máy tự đặt tên "Lớp – ngày".
 *  4. Triển khai → Tùy chọn triển khai mới → Ứng dụng web:
 *       Thực thi với tư cách: Tôi
 *       Người có quyền truy cập: Bất kỳ ai
 *     → sao chép đường link kết thúc bằng /exec.
 *  5. Dán link /exec vào dòng SHEET_URL:'…' ở đầu file POLYMER-F1.html và THONGKE-POLYMER.html trên GitHub
 *     (hoặc gửi link cho Claude để Claude sửa giúp).
 *
 * Mã giáo viên chỉ nằm trong Sheet này (thuộc Drive của giáo viên, chế độ riêng tư),
 * không nằm trong file trò chơi trên GitHub nên học sinh không đọc được.
 * Trang thống kê THONGKE-POLYMER.html dùng cùng link /exec, giáo viên nhập mã giáo viên để xem.
 * Khi sửa file này: Triển khai → Quản lý các bản triển khai → bút chì → Phiên bản mới → Triển khai (link giữ nguyên).
 */

const CONFIG_SHEET = 'CauHinh';
const SBD_PREFIX = { '9D01': '260901', '9D03': '260903', '10E01': '261001', '12G01': '261201', '12G02': '261202' };
const CLASSES = Object.keys(SBD_PREFIX);
const HEADERS = ['Thời điểm gửi', 'Họ và tên', 'Lớp', 'SBD', 'Điểm', 'Số câu đúng', 'Số trạm đã qua',
  'Đăng nhập lúc', 'Thoát lúc', 'Thời gian chơi', 'Kết thúc', 'Số lần rời màn hình', 'Đúng/sai theo câu (1→10)',
  'Chi tiết câu trả lời', 'Mã lượt chơi'];

/** Chạy một lần để tạo trang tính và cấp quyền. */
function caiDat() {
  getConfigSheet_();
  Logger.log('Đã cài đặt xong. Mã giáo viên, mã mở khoá, thời gian và tên bảng nằm ở trang tính ' + CONFIG_SHEET + '.');
}

function doGet() {
  return ContentService.createTextOutput('Polymer Grand Prix – máy chủ nhận kết quả đang chạy.');
}

/** Trò chơi và trang thống kê gửi dữ liệu bằng fetch POST (text/plain, nội dung JSON). */
function doPost(e) {
  let out;
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.kind === 'login') out = login_(p);
    else if (p.kind === 'unlock') out = unlock_(p);
    else if (p.kind === 'result') out = saveResult_(p);
    else if (p.kind === 'stats') out = stats_(p);
    else out = { ok: false, error: 'Yêu cầu không hợp lệ' };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Cấu hình (mã nằm trong Drive) ---------------- */

function getConfigSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CONFIG_SHEET);
    sh.getRange('A1:B3').setValues([['Mã giáo viên (vào chơi, xem thống kê)', '7070'], ['Mã mở khoá (khi rời màn hình)', '7979'], ['Thời gian chơi (phút)', 5]]);
    sh.getRange('B1:B2').setNumberFormat('@');
    sh.getRange('A1:A3').setFontWeight('bold');
    sh.setColumnWidth(1, 280);
  }
  if (!sh.getRange('A4').getValue()) {
    sh.getRange('A4').setValue('Tên bảng kết quả (ca chơi hiện tại)').setFontWeight('bold');
    sh.getRange('B4').setNumberFormat('@');
    sh.getRange('C4').setValue('← mỗi ca chơi / lớp mới gõ tên mới, kết quả sẽ ghi vào trang tính mang tên này').setFontColor('#777777');
  }
  return sh;
}

function config_() {
  const v = getConfigSheet_().getRange('B1:B4').getDisplayValues();
  const minutes = Math.round(Number(v[2][0]));
  return { open: String(v[0][0]).trim(), unlock: String(v[1][0]).trim(), minutes: minutes >= 1 && minutes <= 60 ? minutes : 5,
    session: String(v[3][0]).trim() };
}

/** Tên trang tính kết quả: lấy ô B4, để trống thì "Lớp – ngày". Bỏ các kí tự Google Sheet không cho dùng. */
function sheetName_(name, lop) {
  let n = String(name || '').replace(/[\[\]\*\?\/\\:]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90);
  if (!n) n = (lop || 'Lớp') + ' – ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  if (n === CONFIG_SHEET) n = n + ' (kết quả)';
  return n;
}

function validSbd_(lop, sbd) {
  return /^\d{8}$/.test(sbd) && sbd.indexOf(SBD_PREFIX[lop]) === 0;
}

function login_(p) {
  const c = config_();
  if (String(p.code || '').trim() !== c.open) return { ok: false, error: 'code' };
  const lop = clean_(p.lop, 10), name = clean_(p.name, 60), sbd = clean_(p.sbd, 12);
  if (CLASSES.indexOf(lop) < 0) return { ok: false, error: 'Lớp không hợp lệ' };
  if (!name) return { ok: false, error: 'Thiếu họ và tên' };
  if (!validSbd_(lop, sbd)) return { ok: false, error: 'Số báo danh không đúng với lớp đã chọn' };
  return { ok: true, minutes: c.minutes, sheet: sheetName_(c.session, lop) };
}

function unlock_(p) {
  return String(p.code || '').trim() === config_().unlock ? { ok: true } : { ok: false, error: 'code' };
}

/* ---------------- Kết quả: mỗi lượt chơi một dòng ---------------- */

function getResultSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#eeeeee');
    sh.setFrozenRows(1);
    ['A:A', 'H:H', 'I:I'].forEach(function (c) { sh.getRange(c).setNumberFormat('dd/MM/yyyy HH:mm:ss'); });
    sh.getRange('D:D').setNumberFormat('@');
    sh.getRange('M:M').setNumberFormat('@');
  }
  return sh;
}

function saveResult_(p) {
  const lop = clean_(p.lop, 10), name = clean_(p.name, 60), sbd = clean_(p.sbd, 12), id = clean_(p.id, 40);
  if (CLASSES.indexOf(lop) < 0 || !name || !validSbd_(lop, sbd) || !id) throw new Error('Dữ liệu không hợp lệ');
  const pattern = String(p.pattern || '').replace(/[^01-]/g, '').slice(0, 10);
  const correct = (pattern.match(/1/g) || []).length;
  const answered = (pattern.match(/[01]/g) || []).length;
  const start = Number(p.startedAt) || 0, end = Number(p.endedAt) || 0;
  const secs = start && end ? Math.max(0, Math.round((end - start) / 1000)) : 0;
  const used = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getResultSheet_(sheetName_(p.sheet || config_().session, lop));
    const last = sh.getLastRow();
    if (last > 1) {   // không ghi trùng khi bấm Gửi lại
      const ids = sh.getRange(2, HEADERS.length, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return { ok: true, duplicate: true };
    }
    sh.appendRow([new Date(), name, lop, sbd, correct, correct, answered,
      start ? new Date(start) : '', end ? new Date(end) : '', used, clean_(p.reason, 40), Number(p.violations) || 0,
      pattern, clean_(p.detail, 3000), id]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Thống kê cho trang THONGKE-POLYMER.html (cần mã giáo viên) ---------------- */

function stats_(p) {
  const c = config_();
  if (String(p.code || '').trim() !== c.open) return { ok: false, error: 'code' };
  const rows = [], sheets = [];
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sh) {
    if (sh.getName() === CONFIG_SHEET || sh.getRange('A1').getValue() !== HEADERS[0]) return;   // chỉ đọc các bảng kết quả
    sheets.push(sh.getName());
    const last = sh.getLastRow();
    if (last < 2) return;
    const times = sh.getRange(2, 1, last - 1, 1).getValues();
    sh.getRange(2, 1, last - 1, 13).getDisplayValues().forEach(function (r, i) {
      if (!r[1] || !r[2]) return;
      const t = times[i][0];
      rows.push({ t: t instanceof Date ? t.getTime() : 0, name: r[1], lop: r[2], sbd: r[3], score: Number(r[4]) || 0,
        answered: Number(r[6]) || 0, used: r[9], reason: r[10], leaves: Number(r[11]) || 0, pattern: r[12], sheet: sh.getName() });
    });
  });
  return { ok: true, rows: rows, sheets: sheets, current: c.session ? sheetName_(c.session) : '' };
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}
