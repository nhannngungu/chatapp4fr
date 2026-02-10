# MERN Chat App

Dự án chat realtime sử dụng MERN stack (MongoDB, Express, React, Node.js) và Socket.IO.

## 🛠 Công nghệ & Nền tảng (Tech Stack)

Website hoạt động dựa trên các công nghệ cốt lõi sau:

### 1. Frontend (Giao diện người dùng)
- **React.js (Vite):** Thư viện JavaScript để xây dựng giao diện người dùng tương tác, SPA (Single Page Application).
- **Styled-components:** Viết CSS trực tiếp trong file JavaScript (CSS-in-JS), giúp quản lý style theo component.
- **Socket.io-client:** Thư viện client để kết nối thời gian thực với server.
- **Simple-peer (WebRTC):** Xử lý kết nối Video Call ngang hàng (Peer-to-Peer) trực tiếp giữa các trình duyệt.
- **Axios:** Thư viện gọi API (HTTP requests) tới server.

### 2. Backend (Máy chủ xử lý)
- **Node.js:** Môi trường chạy mã JavaScript phía server (Runtime Environment).
- **Express.js:** Framework web tối giản cho Node.js, xử lý các API Route (Login, Register, User info).
- **Socket.io:** Engine xử lý giao tiếp thời gian thực (WebSocket), giúp tin nhắn gửi đi được nhận ngay lập tức mà không cần tải lại trang.
- **Mongoose:** Thư viện mô hình hóa dữ liệu (ODM) để làm việc với MongoDB dễ dàng hơn.

### 3. Database (Cơ sở dữ liệu)
- **MongoDB:** Cơ sở dữ liệu NoSQL lưu trữ thông tin người dùng, tin nhắn dưới dạng JSON-like documents.

### 🌐 Cơ chế hoạt động Online

1. **Kiến trúc Client-Server (REST API):**
   - Khi bạn truy cập web, trình duyệt tải mã React về máy.
   - Các hành động như *Đăng nhập, Lấy danh sách bạn bè* sẽ gửi yêu cầu HTTP (GET/POST) lên Server. Server truy vấn Database và trả về dữ liệu JSON.

2. **Giao tiếp thời gian thực (Real-time):**
   - Sau khi đăng nhập, Client mở một "đường ống" kết nối liên tục (Socket) tới Server.
   - Khi bạn nhắn tin, tin nhắn đi qua "đường ống" này tới Server, và Server chuyển tiếp ngay lập tức tới người nhận. Quá trình này diễn ra trong mili-giây.

3. **Video Call (Peer-to-Peer):**
   - WebRTC được sử dụng để truyền Video/Audio trực tiếp giữa 2 trình duyệt.
   - Server chỉ đóng vai trò "người môi giới" (Signaling) ban đầu để 2 máy tìm thấy nhau. Sau đó dữ liệu hình ảnh đi thẳng từ máy bạn sang máy đối phương, không qua server (giảm tải cho server và tăng tốc độ).

## Tính năng
- Chat văn bản thời gian thực
- Gửi hình ảnh, Voice message
- Video Call (WebRTC)
- Emoji & Reactions
- Trạng thái Online/Offline, Typing...

## Cài đặt và Chạy Development

### Server
1. Vào thư mục server: `cd server`
2. Cài đặt dependencies: `npm install`
3. Tạo file `.env` với nội dung:
   ```
   PORT=5000
   MONGO_URL=mongodb://localhost:27017/chat
   ```
4. Chạy server: `npm start`

### Client
1. Vào thư mục client: `cd client`
2. Cài đặt dependencies: `npm install`
3. Chạy client: `npm run dev`

## Deployment

### 1. Build Client
Build React app thành static files:
```bash
cd client
npm run build
```
Kết quả sẽ nằm trong thư mục `client/dist`.

### 2. Cấu hình Server để serve Static Files
Copy thư mục `dist` từ client sang `server/public` (tạo nếu chưa có) hoặc cấu hình nginx để serve.
Trong dự án này, cách đơn giản nhất là thêm vào `server/index.js`:
```javascript
const path = require("path");
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
});
```

### 3. Deploy lên VPS/Heroku/Render
- Đảm bảo biến môi trường `MONGO_URL` trỏ tới MongoDB Atlas hoặc Database Production.
- Cài đặt PM2 để quản lý process: `npm install -g pm2`
- Chạy: `pm2 start index.js --name "chat-app"`

## Testing

### Backend Unit Tests
Dự án sử dụng Jest để test.
1. Cài đặt: `cd server && npm install --save-dev jest supertest`
2. Chạy test: `npm test`

(Xem file `server/tests/api.test.js` để biết thêm chi tiết)
