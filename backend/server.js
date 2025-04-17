// server.js
import { WebSocketServer } from 'ws';
import fs from 'fs';

// Khởi tạo WebSocket server
const wss = new WebSocketServer({ port: 3000 });
console.log('WebSocket server running on ws://localhost:3000');

// Đường dẫn tới file lưu trữ scores
const SCORES_FILE = './scores.json';

// Hàm đọc scores từ file
function readScores() {
  try {
    if (fs.existsSync(SCORES_FILE)) {
      const data = fs.readFileSync(SCORES_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading scores:', error);
    return [];
  }
}

// Hàm ghi scores vào file
function writeScores(scores) {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
    console.log('Scores saved to file');
  } catch (error) {
    console.error('Error writing scores:', error);
  }
}

// Khởi tạo scores từ file
let scores = readScores();

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Gửi leaderboard hiện tại cho client mới kết nối
  const leaderboard = scores
    .reduce((acc, entry) => {
      const existing = acc.find((e) => e.address === entry.address);
      if (existing) {
        existing.score = Math.max(existing.score, entry.score);
      } else {
        acc.push({ address: entry.address, score: entry.score });
      }
      return acc;
    }, [])
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  ws.send(JSON.stringify({ type: 'leaderboard', data: leaderboard }));
  console.log('Initial leaderboard sent to client:', leaderboard);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);

      if (data.type === 'score') {
        const { score, address } = data;
        // Lưu score vào mảng và file
        scores.push({ address, score, timestamp: Date.now() });
        writeScores(scores);
        console.log('Score stored:', { address, score });

        // Cập nhật leaderboard
        const leaderboard = scores
          .reduce((acc, entry) => {
            const existing = acc.find((e) => e.address === entry.address);
            if (existing) {
              existing.score = Math.max(existing.score, entry.score);
            } else {
              acc.push({ address: entry.address, score: entry.score });
            }
            return acc;
          }, [])
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        // Gửi leaderboard cho tất cả client
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'leaderboard', data: leaderboard }));
            console.log('Leaderboard sent:', leaderboard);
          }
        });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});