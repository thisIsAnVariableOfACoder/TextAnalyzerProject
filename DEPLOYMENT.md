# TextAnalyzer - Local + MongoDB Atlas + Deploy Guide

Tài liệu này hướng dẫn chạy dự án với MongoDB Atlas (online) và triển khai production.

## 1) Những gì bắt buộc cần có

- Node.js 18+
- Python 3.10+
- Tài khoản MongoDB Atlas (free M0)
- Tài khoản Vercel (deploy frontend)
- Tài khoản Render/Railway/Fly.io (deploy backend FastAPI)

> Lưu ý: triển khai theo mô hình **single free provider** qua backend:
> - OCR: OCR.Space (free)
> - Grammar: LanguageTool public
> - Paraphrase/Translate: deep-translator (free)

---

## 2) MongoDB Atlas: tạo DB online và lưu thông tin đăng nhập

### Bước A - Tạo cluster free
1. Vào https://cloud.mongodb.com/
2. Tạo project mới.
3. Chọn **Build a Database** -> **M0 Free**.

### Bước B - Tạo user đăng nhập DB
1. Mở **Database Access** -> **Add New Database User**.
2. Tạo:
   - Username: ví dụ `textanalyzer_user`
   - Password: mật khẩu mạnh (12+ ký tự)
3. Gán quyền **Read and write to any database** (hoặc giới hạn database nếu muốn chặt hơn).

### Bước C - Network Access
1. Mở **Network Access** -> **Add IP Address**.
2. Dev nhanh: `0.0.0.0/0`.
3. Production: whitelist IP backend server.

### Bước D - Lấy connection string
1. Vào Cluster -> **Connect** -> **Drivers**.
2. Copy chuỗi dạng:

```text
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

3. Thay `<username>`, `<password>` bằng user đã tạo.

### Bước E - Lưu thông tin đăng nhập online an toàn

Không lưu user/password DB trực tiếp trong code. Chỉ lưu trong biến môi trường:

- Local: file `backend/.env` (file này không commit git)
- Production backend: dashboard service (Render/Railway/Fly) -> Environment Variables
- Production frontend: Vercel -> Environment Variables

Ví dụ `backend/.env`:

```env
MONGODB_URL=mongodb+srv://textanalyzer_user:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=text_analyzer
JWT_SECRET=your-very-long-random-secret
DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 3) Chạy dự án locally (Windows)

### Backend

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Kiểm tra backend:

```cmd
curl http://localhost:8000/health
```

### Frontend

```cmd
cd frontend
npm install
npm run dev
```

Mở: `http://localhost:3000`

Không cần đăng nhập Puter trên trình duyệt.

---

## 4) Deploy online (khuyến nghị tách frontend/backend)

## 4.1 Deploy Backend FastAPI (Render)

1. Push code lên GitHub.
2. Render -> **New Web Service** -> chọn repo.
3. Root Directory: `backend`
4. Runtime/Language: **Python 3.11** (không dùng 3.14)
   - Đã pin qua [`runtime.txt`](backend/runtime.txt)
   - Nếu Render vẫn chọn 3.14, vào **Environment** thêm biến:

```env
PYTHON_VERSION=3.11.11
```

   - Hoặc deploy qua blueprint [`render.yaml`](render.yaml) để cố định runtime.
5. Build Command:

```bash
pip install -r requirements.txt
```

6. Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

7. Thêm Environment Variables trên Render:

```env
MONGODB_URL=mongodb+srv://textanalyzer_user:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=text_analyzer
JWT_SECRET=your-very-long-random-secret
DEBUG=False
ALLOWED_ORIGINS=https://textanalyzerllmagik.vercel.app,https://textanalyzerproject.onrender.com
ALLOWED_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://([a-z0-9-]+)\.vercel\.app$
MONGODB_ALLOW_LOCAL_FALLBACK=false
MONGO_SERVER_SELECTION_TIMEOUT_MS=12000
MONGO_CONNECT_TIMEOUT_MS=15000
MONGO_SOCKET_TIMEOUT_MS=20000
MONGO_MAX_URI_CANDIDATES=2
MONGO_RETRY_COOLDOWN_SECONDS=20
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=helloworld
TEXT_PROVIDER_MODE=free_single
```

> Backend hiện hỗ trợ cả alias env DB thường gặp từ Vercel integration:
> - `MONGODB_URL` hoặc `MONGODB_URI` hoặc `MONGO_URL`
> - `DATABASE_NAME` hoặc `MONGODB_DATABASE` hoặc `MONGO_DB_NAME`

> Nếu mật khẩu MongoDB có ký tự đặc biệt (`@`, `:`, `/`, `%`, `#`, `?`) thì bắt buộc URL-encode trong `MONGODB_URL`.

8. Deploy và lấy URL backend, ví dụ:

`https://textanalyzerproject.onrender.com`

## 4.2 Deploy Frontend React (Vercel)

1. Vercel -> **New Project** -> import repo.
2. Root Directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Thêm env trên Vercel:

```env
VITE_API_BASE_URL=https://textanalyzerproject.onrender.com/api
VITE_APP_NAME=TextAnalyzer
```

6. Deploy.

---

## 5) Checklist sau deploy

- Truy cập frontend production.
- Đăng ký tài khoản mới.
- Đăng nhập.
- Test lưu lịch sử (xác nhận backend + MongoDB Atlas hoạt động).
- Test OCR/Grammar/Paraphrase/Translate (xác nhận backend free provider hoạt động).

---

## 6) Bảo mật thông tin đăng nhập online

- Không commit file `.env` lên git.
- Mật khẩu MongoDB Atlas nên tránh ký tự đặc biệt khó encode; nếu có thì URL encode.
- Dùng mật khẩu khác nhau giữa dev và production.
- Định kỳ rotate `JWT_SECRET` và DB password.
- Chỉ whitelist IP production backend trong Atlas khi go-live.

---

## 7) Lỗi thường gặp

### `ServerSelectionTimeoutError`
- Sai `MONGODB_URL` hoặc Atlas chưa whitelist IP.
- Chưa URL-encode password trong connection string.
- Thiếu `dnspython` khiến SRV DNS lookup không ổn định ở một số runtime.

### Login bị chậm lâu rồi trả `503`
- Backend đang thử nhiều URI Mongo liên tiếp và timeout cộng dồn.
- Giảm độ trễ bằng cách giữ `MONGO_MAX_URI_CANDIDATES=2` và `MONGO_RETRY_COOLDOWN_SECONDS=20`.
- Kiểm tra đúng `MONGODB_URL` Atlas thay vì để backend retry vô ích.

### Debug chính xác nguyên nhân DB trên production
- Gọi endpoint: `/health/db` hoặc `/api/health/db`.
- Endpoint trả `last_failure_reason` (không lộ mật khẩu) để biết lỗi thật: auth fail, DNS fail, TLS fail, IP whitelist fail...

### `CORS error`
- Thiếu domain frontend trong `ALLOWED_ORIGINS` của backend.

### Frontend gọi nhầm localhost khi đã deploy
- Chưa set `VITE_API_BASE_URL` trên Vercel.
