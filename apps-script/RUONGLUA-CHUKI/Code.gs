/**
 * RUỘNG LÚA CHU KÌ (Hóa 10) – kiểm tra mã giáo viên và nhận kết quả, ghi vào Google Sheet riêng của trò này.
 *
 * Cách dùng (tóm tắt):
 *  1. Tạo một Google Sheet MỚI chỉ dùng cho trò này (ví dụ đặt tên "Ruộng lúa Chu kì – Kết quả").
 *  2. Trong Sheet đó: Tiện ích mở rộng → Apps Script → xoá nội dung có sẵn, dán toàn bộ file này vào Code.gs → Lưu.
 *  3. Chọn hàm caiDat → Chạy (một lần) → cấp quyền. Sheet sẽ có 2 trang tính:
 *       CauHinh : mã giáo viên (7070), mã mở khoá (7979), thời gian chơi (phút). Giáo viên đổi mã ngay tại đây.
 *       KetQua  : mỗi học sinh một dòng.
 *  4. Triển khai → Tùy chọn triển khai mới → Ứng dụng web:
 *       Thực thi với tư cách: Tôi
 *       Người có quyền truy cập: Bất kỳ ai
 *     → sao chép đường link kết thúc bằng /exec.
 *  5. Dán link /exec vào dòng SHEET_URL:'…' ở đầu file RUONGLUA-CHUKI-NHOM.html trên GitHub
 *     (hoặc gửi link cho Claude để Claude sửa giúp).
 *
 * Mã giáo viên chỉ nằm trong Sheet này (thuộc Drive của giáo viên, chế độ riêng tư),
 * không nằm trong file trò chơi trên GitHub nên học sinh không đọc được.
 * Khi sửa file này: Triển khai → Quản lý các bản triển khai → bút chì → Phiên bản mới → Triển khai (link giữ nguyên).
 */

const RESULT_SHEET = 'KetQua';
const CONFIG_SHEET = 'CauHinh';
const CLASSES = ['9D01', '9D02', '9D03', '10E01', '12G01', '12G02'];
const HEADERS = ['Thời điểm gửi', 'Lớp', 'Nhóm', 'Họ và tên', 'Điểm', 'Số câu đúng', 'Số câu đã trả lời',
  'Đăng nhập lúc', 'Thoát lúc', 'Thời gian chơi', 'Kết thúc', 'Số lần rời màn hình', 'Chi tiết câu trả lời', 'Mã lượt chơi'];

/** Chạy một lần để tạo trang tính và cấp quyền. */
function caiDat() {
  getConfigSheet_();
  getResultSheet_();
  Logger.log('Đã cài đặt xong. Mã giáo viên, mã mở khoá và thời gian nằm ở trang tính ' + CONFIG_SHEET + '.');
}

function doGet() {
  return ContentService.createTextOutput('Ruộng lúa Chu kì – máy chủ nhận kết quả đang chạy.');
}

/** Trò chơi gửi dữ liệu bằng fetch POST (text/plain, nội dung JSON). */
function doPost(e) {
  let out;
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.kind === 'login') out = login_(p);
    else if (p.kind === 'unlock') out = unlock_(p);
    else if (p.kind === 'result') out = saveResult_(p);
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
    sh.getRange('A1:B3').setValues([['Mã giáo viên (vào chơi)', '7070'], ['Mã mở khoá (khi rời màn hình)', '7979'], ['Thời gian chơi (phút)', 5]]);
    sh.getRange('B1:B2').setNumberFormat('@');
    sh.getRange('A1:A3').setFontWeight('bold');
    sh.setColumnWidth(1, 260);
  }
  return sh;
}

function config_() {
  const v = getConfigSheet_().getRange('B1:B3').getDisplayValues();
  const minutes = Math.round(Number(v[2][0]));
  return { open: String(v[0][0]).trim(), unlock: String(v[1][0]).trim(), minutes: minutes >= 1 && minutes <= 60 ? minutes : 5 };
}

function login_(p) {
  const c = config_();
  if (String(p.code || '').trim() !== c.open) return { ok: false, error: 'code' };
  if (CLASSES.indexOf(clean_(p.lop, 10)) < 0) return { ok: false, error: 'Lớp không hợp lệ' };
  return { ok: true, minutes: c.minutes };
}

function unlock_(p) {
  return String(p.code || '').trim() === config_().unlock ? { ok: true } : { ok: false, error: 'code' };
}

/* ---------------- Kết quả: mỗi học sinh một dòng ---------------- */

function getResultSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(RESULT_SHEET);
  if (!sh) sh = ss.insertSheet(RESULT_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#eeeeee');
    sh.setFrozenRows(1);
    ['A:A', 'H:H', 'I:I'].forEach(function (c) { sh.getRange(c).setNumberFormat('dd/MM/yyyy HH:mm:ss'); });
  }
  return sh;
}

function saveResult_(p) {
  const lop = clean_(p.lop, 10), group = clean_(p.group, 20), name = clean_(p.name, 60), id = clean_(p.id, 40);
  if (CLASSES.indexOf(lop) < 0 || !group || !name || !id) throw new Error('Dữ liệu không hợp lệ');
  const start = Number(p.startedAt) || 0, end = Number(p.endedAt) || 0;
  const secs = start && end ? Math.max(0, Math.round((end - start) / 1000)) : 0;
  const used = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getResultSheet_();
    const last = sh.getLastRow();
    if (last > 1) {   // không ghi trùng khi bấm Gửi lại
      const ids = sh.getRange(2, HEADERS.length, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return { ok: true, duplicate: true };
    }
    sh.appendRow([new Date(), lop, group, name, Number(p.score) || 0, Number(p.correct) || 0, Number(p.answered) || 0,
      start ? new Date(start) : '', end ? new Date(end) : '', used, clean_(p.reason, 40), Number(p.violations) || 0,
      clean_(p.detail, 1500), id]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}
