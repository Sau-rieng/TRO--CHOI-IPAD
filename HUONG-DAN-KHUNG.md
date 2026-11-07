# HƯỚNG DẪN SỬA TRÒ CHƠI DẠNG KHUNG (dành cho kênh "TẠO TRÒ CHƠI TRÊN IPAD")

Tải file này vào kênh trước khi sửa bất kỳ file `KHUNG-*.html` nào (hiện có `KHUNG-F1.html`).
Claude ở kênh này **phải đọc và làm đúng** các quy định dưới đây.

## 1. Khung là gì

- **Khung** = cảnh 3D + cách điều khiển. **Nội dung câu hỏi KHÔNG nằm trong file.**
- Câu hỏi là **bộ câu** giáo viên nạp ở trang giáo viên (Trò chơi → 📥 Bộ câu trò chơi). Khi học sinh đăng nhập, sổ lớp gửi bộ câu về.
- Mỗi lượt có **11 cổng = 11 câu**: 6 trắc nghiệm (0.5đ) · 3 đúng/sai (2đ; đúng 1/2/3/4 ý được 0.3/0.7/1.2/2đ) · 2 trả lời ngắn (0.5đ) = **10 điểm**.
- **Cá nhân hay nhóm** và **số phút** do giáo viên chọn trên bảng điều khiển. File không tự quyết hai điều này.
- Một file dùng cho mọi khối. Học sinh chọn lớp, máy tự biết khối (dòng F1-K9 … F1-K12 trong sổ).

## 2. Trong file có 4 vùng, đánh dấu bằng dòng `/* ████████ VÙNG … ████████ */`

| Vùng | Được làm gì |
|---|---|
| **VÙNG CẢNH – ĐƯỢC SỬA TỰ DO** | Thêm hoặc đổi cảnh: đường đua, khán đài, cây, núi, nhà, mây, ánh sáng, bầu trời, kiểu xe, màu xe. **Giữ**: đủ 11 cổng trong mảng `towers`, biến `START`, các hàm `trackAt`, `setStartLights`, `makeCar`. |
| **VÙNG LÁI XE – SỬA CẨN THẬN** | Đổi tốc độ, độ nhạy lái, góc camera. **Giữ** tên các hàm `placeOnGrid`, `placeAtGate`, `flyTo`, `startFree`, `showFlightUI`, `hideFlightUI`; xe tới cổng thì phải dừng và gọi `showQuestion(i)`. |
| **VÙNG KHUNG – KHÔNG SỬA** (hai chỗ: phần bộ câu ở đầu script, và từ `showQuestion` đến hết file) | **Không sửa** cách bốc câu, chấm điểm, lưu tạm, khóa khi rời màn hình, kết thúc, gửi kết quả, đăng nhập. Chỉ được đổi chữ hiển thị hoặc màu sắc. |
| **Phần `<head>` và 4 dòng `<script src=…>`** | **Không xóa, không đổi thứ tự**: `three.min.js` (r128), `cau-hinh-lop.js`, `noi-so-theo-doi.js`, `xuat-phat.js`. |

## 3. Điều cấm

1. **Không thêm câu hỏi** vào file (không mảng BANK, TF, SA…). Câu hỏi chỉ đến từ bộ câu.
2. **Không đổi** số cổng (11), cách tính điểm, cách xếp hạng (điểm trước, thời gian sau).
3. **Không đổi hay xóa** bất kỳ `id` nào đang được gọi bằng `$('…')` trong file. Ví dụ: `login`, `fClass`, `fName`, `fSbd`, `fGroup`, `fCode`, `go`, `oCaNhan`, `oNhom`, `cfgMsg`, `boChu`, `card`, `submit`, `next`, `after`, `saIn`, `end`, `final`, `resultBox`, `progress`, `timer`, `lock`, `start`, `who`, `tieuDe`, `speed`, `dist`, `pad`, `minimap`. Được thêm id mới.
4. **Không đổi tên file** `KHUNG-F1.html`. Sổ theo dõi và mã QR trỏ tới đúng tên này.
5. **Không bỏ** khóa màn hình khi rời trò (rời lần 1 khóa, lần 2 kết thúc).
6. Giữ chạy mượt trên iPad đời cũ:
   - Gộp hình bằng `mergeChildren`; vật lặp lại nhiều thì dùng InstancedMesh.
   - Tránh bóng đổ thời gian thực và đèn điểm.
   - Mỗi cảnh mới thêm không quá khoảng 30 000 tam giác.

## 4. Muốn làm KHUNG MỚI (ví dụ chim bay, leo núi, thuyền…)

- Chép `KHUNG-F1.html` thành `KHUNG-<TÊN>.html`, ví dụ `KHUNG-CHIM.html`.
- Chỉ thay **VÙNG CẢNH** và **VÙNG LÁI XE** (đổi xe thành chim…). **Giữ nguyên hai VÙNG KHUNG.**
- Báo giáo viên: kênh làm bài kiểm tra cần thêm 4 dòng `<TÊN>-K9 … <TÊN>-K12` vào sổ (`TC_MAC_DINH` trong SoTheoDoi.gs). `noi-so-theo-doi.js` tự nhận mọi file `KHUNG-*.html`.

## 5. Tự kiểm tra trước khi giao file

- [ ] Còn đủ 4 dòng đánh dấu `████████ VÙNG …`; hai VÙNG KHUNG không đổi gì ngoài chữ hiển thị.
- [ ] Trong file không có câu hỏi nào.
- [ ] Mở file → chọn lớp → hiện ô Nhóm hoặc Họ tên + SBD → Vào chơi → đủ 11 cổng → điểm ra đúng thang 10.
- [ ] Không có lỗi trong Console; trên iPad chạy mượt (khoảng 30 khung hình/giây trở lên).
- [ ] Đẩy lên GitHub qua **nhánh + Pull Request**, ghi rõ đã sửa vùng nào.

Nếu yêu cầu của giáo viên buộc phải sửa VÙNG KHUNG (ví dụ đổi cách tính điểm), **dừng lại hỏi giáo viên** trước, vì phần này phải sửa đồng bộ với sổ theo dõi và trang giáo viên.
