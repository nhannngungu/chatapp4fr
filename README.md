# MERN Chat App

Dự án chat realtime sử dụng MERN stack (MongoDB, Express, React, Node.js) và Socket.IO.

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
