/**
 * CHIM ĐƯA THƯ HÓA 10 – nhận kết quả, ghi vào Google Sheet và lưu bài làm dạng PDF vào Google Drive.
 *
 * Cách dùng (tóm tắt):
 *  1. Mở Google Sheet sẽ chứa điểm → Tiện ích mở rộng → Apps Script.
 *  2. Dán toàn bộ file này vào Code.gs; tạo thêm file HTML tên "Index" và dán Index.html.
 *  3. Chọn hàm caiDat → Chạy (một lần) → cấp quyền.
 *  4. Triển khai → Tùy chọn triển khai mới → Ứng dụng web:
 *       Thực thi với tư cách: Tôi
 *       Người có quyền truy cập: Bất kỳ ai
 *     → sao chép đường link kết thúc bằng /exec.
 *  5. Dán link /exec vào dòng  SHEET_URL:'…'  ở đầu file HOA10-CHIMDUATHU.html trên GitHub
 *     (hoặc gửi link cho Claude để Claude sửa giúp). Học sinh chơi bằng link GitHub,
 *     điểm và bài làm PDF về Sheet/Drive riêng này.
 *
 * Bảng tính và thư mục bài làm thuộc Drive của giáo viên, ở chế độ riêng tư.
 * Học sinh chỉ mở được trò chơi, không xem được bảng điểm hay file bài làm.
 */

const SHEET_NAME = 'KetQua';
const ROOT_FOLDER_NAME = 'Bài làm Chim Đưa Thư Hóa 10';
const HEADERS = ['Thời điểm nộp', 'Họ và tên', 'Lớp', 'SBD', 'Điểm (/10)', 'Số câu đúng',
  'Thời gian làm', 'Kết thúc', 'Số lần rời màn hình', 'Bài làm (PDF)', 'Bắt đầu lúc', 'Mã lượt chơi'];
const REASONS = { done: 'Hoàn thành 10 câu', timeout: 'Hết 5 phút', violation: 'Rời màn hình 2 lần', quit: 'Tự thoát' };
const CLASSES = ['9D01', '9D03', '10E01', '12G01', '12G02'];

/** Mở trò chơi khi học sinh truy cập đường link ứng dụng web. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Chim Đưa Thư Hóa 10')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** Nhận kết quả từ trò chơi đặt trên GitHub Pages (gửi bằng fetch POST). */
function doPost(e) {
  let out;
  try {
    out = submitResult(fromReport_(JSON.parse(e.postData.contents)));
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Chuyển dữ liệu dạng "báo cáo" (giống Đại Nội/Langbiang) sang dạng submitResult dùng. */
function fromReport_(r) {
  if (!r || !r.cls) return r;               // đã đúng dạng cũ
  const R = { 'Hết thời gian': 'timeout', 'Rời màn hình 2 lần': 'violation', 'Nộp bài và thoát': 'quit', 'Hoàn thành': 'done' };
  return {
    sessionId: r.id, name: r.name, lop: r.cls, sbd: r.sbd, timeUsed: r.used,
    leaves: r.violations, reason: R[r.reason] || 'done', startedAt: 0,
    items: (r.items || []).map(function (it) {
      return { bai: it.lesson, q: it.q, options: it.opts, explain: it.explain,
        correct: 'ABCD'[it.correct] || '', chosen: (it.chosen === null || it.chosen === undefined) ? '' : ('ABCD'[it.chosen] || ''),
        ok: it.point === 1 };
    })
  };
}

/** Chạy một lần để tạo trang tính, tiêu đề cột, thư mục bài làm và cấp quyền. */
function caiDat() {
  getSheet_();
  getRootFolder_();
  Logger.log('Đã cài đặt xong. Thư mục bài làm: ' + getRootFolder_().getUrl());
}

/** Học sinh gửi kết quả (gọi từ trò chơi qua google.script.run). */
function submitResult(p) {
  if (!p || typeof p !== 'object') throw new Error('Thiếu dữ liệu');
  const name = clean_(p.name, 60);
  const lop = clean_(p.lop, 10);
  const sbd = clean_(p.sbd, 12);
  const sessionId = clean_(p.sessionId, 40);
  if (!name || CLASSES.indexOf(lop) < 0 || !/^\d{8}$/.test(sbd) || !sessionId) throw new Error('Dữ liệu không hợp lệ');

  const items = (Array.isArray(p.items) ? p.items : []).slice(0, 10).map(function (it) {
    return {
      bai: clean_(it.bai, 80), q: clean_(it.q, 600),
      options: (Array.isArray(it.options) ? it.options : []).slice(0, 4).map(function (o) { return clean_(o, 300); }),
      correct: clean_(it.correct, 1), chosen: clean_(it.chosen, 1), ok: it.ok === true, explain: clean_(it.explain, 600)
    };
  });
  const score = items.filter(function (it) { return it.ok; }).length;
  const reason = REASONS[p.reason] || REASONS.done;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_();
    // Không ghi trùng nếu học sinh bấm Gửi lại
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, HEADERS.length, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) if (ids[i][0] === sessionId) return { ok: true, duplicate: true };
    }
    const pdf = makePdf_({ name: name, lop: lop, sbd: sbd, score: score, timeUsed: clean_(p.timeUsed, 8),
      reason: reason, leaves: Number(p.leaves) || 0, startedAt: Number(p.startedAt) || 0, items: items });
    sh.appendRow([new Date(), name, lop, "'" + sbd, score, score + '/10', clean_(p.timeUsed, 8), reason,
      Number(p.leaves) || 0, pdf.getUrl(), p.startedAt ? new Date(Number(p.startedAt)) : '', sessionId]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Hàm phụ ---------------- */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#eeeeee');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange('K:K').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange('D:D').setNumberFormat('@');
  }
  return sh;
}

function getRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', f.getId());
  return f;
}

function getClassFolder_(lop) {
  const root = getRootFolder_();
  const it = root.getFoldersByName(lop);
  return it.hasNext() ? it.next() : root.createFolder(lop);
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function esc_(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Tạo bài làm dạng PDF (khoảng 20–60 KB mỗi bài), lưu trong thư mục theo lớp. */
function makePdf_(d) {
  const tz = Session.getScriptTimeZone();
  const when = d.startedAt ? Utilities.formatDate(new Date(d.startedAt), tz, 'dd/MM/yyyy HH:mm') : '';
  const rows = d.items.map(function (it, i) {
    const opts = it.options.map(function (o, k) {
      const L = 'ABCD'[k];
      const mark = (L === it.correct ? ' ✔ (đáp án đúng)' : '') + (L === it.chosen && L !== it.correct ? ' ✘ (HS chọn)' : '') + (L === it.chosen && L === it.correct ? ' – HS chọn' : '');
      const style = L === it.correct ? 'font-weight:bold;' : (L === it.chosen ? 'text-decoration:line-through;' : '');
      return '<div style="' + style + '">' + L + '. ' + esc_(o) + esc_(mark) + '</div>';
    }).join('');
    return '<tr><td style="width:28px;vertical-align:top;font-weight:bold">' + (i + 1) + '</td><td>' +
      '<div style="font-size:9pt;color:#555">' + esc_(it.bai) + '</div>' +
      '<div style="margin:2px 0 4px">' + esc_(it.q) + '</div>' + opts +
      '<div style="margin-top:4px">HS chọn: <b>' + (it.chosen || 'Không trả lời') + '</b> · Đáp án: <b>' + it.correct + '</b> · ' +
      (it.ok ? '<b>Đúng – 1 điểm</b>' : '<b>Sai/Không làm – 0 điểm</b>') + '</div>' +
      (it.explain ? '<div style="margin-top:3px;font-size:9.5pt;color:#333"><i>Lời giải:</i> ' + esc_(it.explain) + '</div>' : '') + '</td></tr>';
  }).join('');
  const html = '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:10.5pt;color:#000">' +
    '<h2 style="margin:0 0 4px">BÀI LÀM – CHIM ĐƯA THƯ HÓA 10</h2>' +
    '<table style="border-collapse:collapse;margin-bottom:10px" cellpadding="3">' +
    '<tr><td>Họ và tên:</td><td><b>' + esc_(d.name) + '</b></td><td style="padding-left:24px">Lớp:</td><td><b>' + esc_(d.lop) + '</b></td></tr>' +
    '<tr><td>SBD:</td><td><b>' + esc_(d.sbd) + '</b></td><td style="padding-left:24px">Bắt đầu:</td><td>' + esc_(when) + '</td></tr>' +
    '<tr><td>Điểm:</td><td><b>' + d.score + '/10</b></td><td style="padding-left:24px">Thời gian làm:</td><td>' + esc_(d.timeUsed) + '</td></tr>' +
    '<tr><td>Kết thúc:</td><td>' + esc_(d.reason) + '</td><td style="padding-left:24px">Rời màn hình:</td><td>' + d.leaves + ' lần</td></tr></table>' +
    '<table style="border-collapse:collapse;width:100%" cellpadding="6" border="1">' + rows + '</table>' +
    '</body></html>';
  const fileName = d.lop + '_' + d.sbd + '_' + d.name + '.pdf';
  const blob = Utilities.newBlob(html, 'text/html', 'bai-lam.html').getAs('application/pdf').setName(fileName);
  return getClassFolder_(d.lop).createFile(blob);
}
