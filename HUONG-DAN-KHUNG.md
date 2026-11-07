# HƯỚNG DẪN BIẾN TRÒ CHƠI THÀNH KHUNG (dành cho kênh "TẠO TRÒ CHƠI TRÊN IPAD")

Tải file này vào kênh. Claude ở kênh này **phải đọc và làm đúng** các quy định dưới đây mỗi khi tạo hoặc sửa trò chơi.

## 1. Mục tiêu

- **Trò nào cũng là khung.** Câu hỏi không nằm trong file trò chơi, mà là **bộ câu** giáo viên nạp ở trang giáo viên (Trò chơi → 📥 Bộ câu trò chơi).
- Giáo viên nạp bộ câu của khối nào thì mọi trò khung đều có ngay lượt chơi cho khối đó.
- Mỗi lượt có **11 chỗ hỏi = 11 câu = 10 điểm**:
  - 6 trắc nghiệm, mỗi câu 0.5đ.
  - 3 đúng/sai, mỗi câu 2đ (đúng 1/2/3/4 ý được 0.3/0.7/1.2/2đ).
  - 2 trả lời ngắn, mỗi câu 0.5đ.
- **Cá nhân hay nhóm**, **số phút**, **bộ câu** do giáo viên chọn trên bảng điều khiển. Trò chơi không tự quyết những điều này.

## 2. Cách làm: trò chơi chỉ lo CẢNH + DI CHUYỂN

Toàn bộ phần khung nằm trong file dùng chung **`khung-chung.js`** (đã có trong repo, **KHÔNG SỬA**). File này lo:
- Màn đăng nhập (lớp → hiện ô nhóm hoặc họ tên + SBD theo giáo viên đặt) và chờ ở vạch xuất phát.
- Nhận bộ câu từ sổ lớp, bốc câu, hiện bảng câu hỏi 3 dạng, chấm điểm, hiện giải thích.
- Thanh 11 ô tiến độ + điểm + đồng hồ, nút Thoát.
- Khóa khi rời màn hình, chơi tiếp sau khi tải lại trang.
- Bảng kết quả và gửi kết quả về sổ (cá nhân hoặc nhóm).

Trò chơi chỉ cần làm 3 việc:

1. Nạp đúng các file theo thứ tự này (trò 3D thêm `three.min.js` r128 lên đầu):
   ```html
   <script src="https://sau-rieng.github.io/LAM-BAI-KIEM-TRA/cau-hinh-lop.js" data-banner="khong"></script>
   <script src="noi-so-theo-doi.js"></script>
   <script src="xuat-phat.js"></script>
   <script src="khung-chung.js"></script>
   ```
2. Gọi `KHUNG.khoiTao({...})` một lần:
   ```js
   KHUNG.khoiTao({
     ten: 'Chim đưa thư',        // tên trò hiện cho học sinh
     tram: 'Trạm',               // gọi chỗ hỏi là Cổng / Trạm / Cửa / Đảo…
     luat: 'Bay qua các trạm…',  // 1–2 câu luật chơi riêng của trò (cách điều khiển)
     batDau(tt) {},   // bắt đầu chơi. tt.tiepTuc = true nếu chơi tiếp sau khi tải lại trang; tt.daLam = số câu đã làm → đặt nhân vật ở chỗ hỏi tiếp theo
     tamDung(ly) {},  // dừng di chuyển: khi hiện câu hỏi, bị khóa, hỏi thoát, hết giờ
     tiepTuc(ly) {},  // cho di chuyển lại: khi đóng bảng câu hỏi, mở khóa
     ketQua(i, kq) {},// (tùy chọn) vừa chấm xong câu i: kq.diem, kq.max, kq.dungHet → hiệu ứng thưởng/phạt
     veDich(ly) {}    // (tùy chọn) hết 11 câu / hết giờ / thoát → hiệu ứng về đích
   });
   ```
3. Khi nhân vật tới **chỗ hỏi thứ i** (theo thứ tự 1 → 11), gọi:
   ```js
   KHUNG.hoiCau().then(kq => { /* kq.i, kq.diem, kq.max, kq.dungHet, kq.het */ });
   ```
   Khung tự hiện câu đúng thứ tự (6 TN → 3 Đ/S → 2 TLN) và gọi `tamDung`. Khi học sinh bấm "Chơi tiếp", khung gọi `tiepTuc` rồi trả `kq`. Sau câu 11, khung tự gọi `veDich` và hiện bảng kết quả.

Các hàm phụ có thể dùng: `KHUNG.daLam()`, `KHUNG.diem()`, `KHUNG.dangChoi()` (true khi được di chuyển), `KHUNG.conLai()` (số mili giây còn lại), `KHUNG.kieu()` ('CA NHAN' hoặc 'NHOM').

**File mẫu đầy đủ: `KHUNG-MAU.html`.** Khi làm khung mới, chép file này rồi thay phần cảnh.

## 3. Biến một trò đang có thành khung

1. Tạo file mới **`KHUNG-<TÊN>.html`**: chữ IN HOA không dấu, số, 2–12 ký tự. Ví dụ `KHUNG-CHIM.html`, `KHUNG-DAINOI.html`, `KHUNG-LANGBIANG.html`, `KHUNG-RUONGLUA.html`.
2. Mang sang **cảnh, nhân vật, cách điều khiển, hiệu ứng** của trò cũ.
3. **Bỏ hết** phần riêng của trò cũ: mảng câu hỏi, bảng câu hỏi, đăng nhập, đồng hồ, chấm điểm, khóa màn hình, màn kết quả, gửi kết quả. Khung lo những phần này.
4. Bố trí **đúng 11 chỗ hỏi** trên đường đi (cổng, trạm, cửa, rương…), đánh số 1 → 11. Tới chỗ hỏi thì gọi `KHUNG.hoiCau()`.
5. Không đặt nút hay chữ của trò ở **góc trên bên trái** và **góc trên bên phải**: khung đặt tên trò, nút Thoát, thanh tiến độ, đồng hồ ở đó. Bảng câu hỏi hiện ở bên phải (iPad nằm ngang) hoặc ở dưới (điện thoại).
6. **Không sửa và không xóa file trò cũ.** Trò cũ chạy song song. Khi bản khung ổn, giáo viên tự đóng trò cũ.

Riêng **`KHUNG-F1.html`** (Đua xe F1) là bản khung đầu tiên, phần khung viết ngay trong file. Nếu chỉ thêm cảnh cho F1 thì sửa trong vùng `████████ VÙNG CẢNH` và không đụng hai vùng `VÙNG KHUNG`.

## 4. Điều cấm

1. **Không sửa** `khung-chung.js`, `noi-so-theo-doi.js`, `xuat-phat.js`. Cần thay đổi gì ở những file này thì báo giáo viên mang sang kênh làm bài kiểm tra.
2. **Không đưa câu hỏi** vào file trò chơi.
3. **Không tự làm** màn đăng nhập, đồng hồ, chấm điểm hay gửi kết quả riêng.
4. Không dùng `id` hoặc class bắt đầu bằng `kc` (khung dùng).
5. **Không đổi tên file khung đã giao.** Sổ theo dõi và mã QR trỏ tới đúng tên đó.
6. Giữ chạy mượt trên iPad đời cũ:
   - Gộp hình; vật lặp nhiều thì dùng InstancedMesh.
   - Hạn chế bóng đổ thời gian thực và đèn điểm.
   - Giới hạn tỉ lệ điểm ảnh khoảng 1.5.
   - Dừng tính toán nặng khi `tamDung`.

## 5. Sau khi làm xong

1. Đẩy lên GitHub repo `Sau-rieng/TRO--CHOI-IPAD` bằng **nhánh + Pull Request**, ghi rõ tên file khung mới.
2. Nhắn giáo viên làm bước cuối trên **trang giáo viên → Trò chơi → ➕ Thêm trò khung**: gõ tên file (vd `KHUNG-CHIM.html`) và tên trò (vd `Chim đưa thư`). Trò sẽ có 1 dòng cho mỗi khối (KHTN 9, Hóa 10, 11, 12) để chọn bộ câu, cá nhân/nhóm, số phút. **Không phải** sửa sổ theo dõi.

## 6. Tự kiểm tra trước khi giao file

- [ ] Có đủ 4 dòng `<script src>` đúng thứ tự, `KHUNG.khoiTao` được gọi đúng một lần.
- [ ] Trong file không có câu hỏi nào; không có đăng nhập, đồng hồ, chấm điểm riêng.
- [ ] Đúng 11 chỗ hỏi; tới chỗ hỏi mới gọi `KHUNG.hoiCau()`; trong lúc hỏi nhân vật đứng yên.
- [ ] `batDau(tt)` đặt nhân vật đúng chỗ khi `tt.tiepTuc` (tải lại trang giữa chừng).
- [ ] Chơi thử: chọn lớp → hiện ô nhóm hoặc họ tên → Vào chơi → đủ 11 câu → bảng kết quả 10 điểm.
- [ ] Không lỗi trong Console; iPad chạy mượt (khoảng 30 khung hình/giây trở lên).

Nếu yêu cầu của giáo viên buộc phải đổi luật khung (số câu, cách tính điểm, cách đăng nhập), **dừng lại hỏi giáo viên**. Phần đó phải sửa đồng bộ ở kênh làm bài kiểm tra.
