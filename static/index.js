// นำเข้า Socket.IO Client (ESM)
import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js';
// นำเข้าสถานะปุ่มกดจาก utils.js
import { keys } from './utils.js';

// รอให้ DOM โหลดเสร็จสมบูรณ์
document.addEventListener("DOMContentLoaded", function() {

    // ===== ค่าคงที่สำหรับเกม =====
    const PLAYER_SIZE = 80;        // ขนาดตัวละคร (พิกเซล)
    const PROJECTILE_SIZE = 5;     // ขนาดกระสุน (พิกเซล)
    const HEALTH_BAR_HEIGHT = 8;   // ความสูงแถบพลังชีวิต
    const HEALTH_BAR_WIDTH = 80;   // ความกว้างแถบพลังชีวิต
    
// ===== การอ้างอิงถึง Element ใน HTML =====
const connectBtn = document.getElementById("connect");
const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("join");
const disconnectBtn = document.getElementById("disconnect");
const shapeSelect = document.getElementById("shape");
const gameCanvas = document.getElementById("gameCanvas");
const ctxGame = gameCanvas.getContext("2d");

// ===== ออบเจกต์รูปภาพ =====
const characterImages = {};
let backgroundImage = null;

// ===== สถานะเกม =====
let players = [];
let projectiles = [];
let me = {
name: "",
color: "#CCCCCC",
shape: "",
pos: { x: 0, y: 0 },
direction: "stop",
health: 100,
speed: 20
};

// ===== การตั้งค่า Socket.IO =====
const socket = io("http://localhost:5000", { autoConnect: false, transports: ["websocket"] });

// ===== การจัดการ UI =====
function UIUpdate(isConnected = false) {
connectBtn.disabled = isConnected;
disconnectBtn.disabled = !isConnected;
joinBtn.disabled = !isConnected;
nameInput.disabled = !isConnected;
shapeSelect.disabled = !isConnected;
}
function joinedGame() {
shapeSelect.disabled = true;
nameInput.disabled = true;
joinBtn.disabled = true;
}
UIUpdate();

// ====== เหตุการณ์ Socket & UI ======
socket.on("connect", () => {
console.log("เชื่อมต่อกับเซิร์ฟเวอร์ WebSocket สำเร็จ");
UIUpdate(true);
});

socket.on("disconnect", () => {
console.log("ตัดการเชื่อมต่อจากเซิร์ฟเวอร์ WebSocket แล้ว");
UIUpdate(false);
// รีเซ็ตสถานะผู้เล่นและอาร์เรย์เกม
me = { name:"", color:"#CCCCCC", shape:"", pos:{x:0,y:0}, direction:"stop", health: 100, speed: 20 };
players = [];
projectiles = [];
});

socket.on("message", (data) => {
console.log("ได้รับข้อความ:", data);
});

socket.on("game_update", (data) => {
players = data.players;
 
const myPlayer = players.find(p => p.name === me.name);

if (myPlayer) {
me.health = myPlayer.health;
me.pos = myPlayer.pos; 

if (me.health <= 0) {
console.log(`เกมโอเวอร์! ${me.name} ถูกกำจัดแล้ว`);
// ข้อความแจ้งเตือนเมื่อเกมโอเวอร์
alert("กาก"); 
socket.disconnect(); 
 }
 }
});

socket.on("projectiles_update", (data) => {
projectiles = data.projectiles;
});

// เหตุการณ์คลิกปุ่มเชื่อมต่อและตัดการเชื่อมต่อ
connectBtn.addEventListener("click", () => socket.connect());
disconnectBtn.addEventListener("click", () => socket.disconnect());

// เหตุการณ์คลิกปุ่มเข้าร่วมเกม
joinBtn.addEventListener("click", () => {
const shape = shapeSelect.value;
const name = nameInput.value.trim();
const pos = {
x: Math.random() * gameCanvas.width,
y: Math.random() * gameCanvas.height
};

if (shape && name) {
me = { ...me, name, shape, pos, direction: "stop" };
socket.emit("join_game", me);
joinedGame();
} else {
alert("กรุณาเลือกตัวละครและใส่ชื่อของคุณ");
}
});

// ===== เหตุการณ์การโจมตี (ส่งพิกัดเมาส์) =====
gameCanvas.addEventListener("mousedown", (event) => {
if (event.button !== 0 || !socket.connected || !me.shape) {
return; // ออกถ้าไม่ใช่การคลิกซ้าย หรือยังไม่พร้อม
}
const rect = gameCanvas.getBoundingClientRect();
const mouseX = event.clientX - rect.left;
const mouseY = event.clientY - rect.top;
socket.emit("attack", { targetX: mouseX, targetY: mouseY });
});

// ===== ฟังก์ชันโหลดรูปภาพล่วงหน้า =====
function loadImages() {
return new Promise((resolve) => {
const imageSources = {
'catsy': './static/รูป/artworks-g5v0yBmy0N4NzRb1-XWaf0g-t500x500.jpg',
'catpy': './static/รูป/artworks-WW0hNKy1wDzyYQYR-qd1o5A-t500x500.jpg',
'catfy': './static/รูป/R.jpg',
};
const bgSrc = './static/รูป/ipghi9dy50f51.png';

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length + 1;

const checkIfDone = () => {
imagesLoaded++;
if (imagesLoaded === totalImages) {
console.log("โหลดรูปภาพทั้งหมดเสร็จแล้ว");
resolve();
}
};

for (let key in imageSources) {
const img = new Image();
img.onload = () => { characterImages[key] = img; checkIfDone(); };
img.onerror = () => { console.error(`โหลดรูปภาพล้มเหลว: ${key}`); checkIfDone(); };
img.src = imageSources[key];
}
const bgImg = new Image();
bgImg.onload = () => { backgroundImage = bgImg; checkIfDone(); };
bgImg.onerror = () => { console.error("โหลดภาพพื้นหลังล้มเหลว"); checkIfDone(); };
bgImg.src = bgSrc;
});
}

// ===== การวาดแถบพลังชีวิตของผู้เล่น =====
function drawHealthBar(player) {
    const health = player.health || 100;

    // แสดง Health Bar เมื่อพลังชีวิตไม่เต็มเท่านั้น
    if (health >= 100) return; 

    const barX = player.pos.x - HEALTH_BAR_WIDTH / 2;
    const barY = player.pos.y - PLAYER_SIZE / 2 - 25;

    // พื้นหลังของแถบ (สีดำโปร่งแสง)
    ctxGame.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctxGame.fillRect(barX, barY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

    // พลังชีวิต
    const healthRatio = Math.max(0, health / 100);
    ctxGame.fillStyle = health > 30 ? "lime" : "red";
    ctxGame.fillRect(barX, barY, HEALTH_BAR_WIDTH * healthRatio, HEALTH_BAR_HEIGHT);
}

// ===== การวาด HUD (แสดงข้อมูลของผู้เล่น) =====
function drawHUD() {
    // แสดงพลังชีวิตของผู้เล่นคนปัจจุบันที่มุมซ้ายบน
    ctxGame.font = '24px Arial Black';
    ctxGame.textAlign = 'left';
    ctxGame.fillStyle = me.health > 30 ? "rgba(0, 255, 0, 0.9)" : "rgba(255, 0, 0, 0.9)";
    ctxGame.fillText(`พลังชีวิต: ${me.health}`, 10, 30);
}


// ====== ลูปการเรนเดอร์เกม (Game Render Loop) ======
function renderGame() {
ctxGame.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

if (backgroundImage) {
ctxGame.drawImage(backgroundImage, 0, 0, gameCanvas.width, gameCanvas.height);
}

let direction = "stop";
// ตรวจสอบการกดปุ่ม WASD
if (keys['W'] || keys['w']) direction = "up";
else if (keys['S'] || keys['s']) direction = "down";
else if (keys['A'] || keys['a']) direction = "left";
else if (keys['D'] || keys['d']) direction = "right";

// ส่งเหตุการณ์ "move" ไปเซิร์ฟเวอร์หากทิศทางเปลี่ยน
if (socket.connected && me.shape && me.direction !== direction) {
socket.emit("move", { direction });
me.direction = direction;
}

// วาดผู้เล่นทั้งหมด
players.forEach(player => {
const size = PLAYER_SIZE; 
const img = characterImages[player.shape];

if (img) {
ctxGame.drawImage(img, player.pos.x - size / 2, player.pos.y - size / 2, size, size);
} else {
// วาดกล่องสำรองถ้าโหลดรูปภาพไม่สำเร็จ
ctxGame.fillStyle = player.color || "#CCCCCC";
ctxGame.fillRect(player.pos.x - size / 2, player.pos.y - size / 2, size, size);
}

    // วาด Health Bar
    drawHealthBar(player);
    
// วาดชื่อผู้เล่น
ctxGame.font = '14px Arial';
ctxGame.textAlign = 'center';
ctxGame.fillStyle = "#ffffffff";
ctxGame.fillText(player.name, player.pos.x, player.pos.y - size / 2 - 5);
});

// วาดกระสุนทั้งหมด
projectiles.forEach(proj => {
ctxGame.beginPath();
ctxGame.arc(proj.pos.x, proj.pos.y, PROJECTILE_SIZE, 0, Math.PI * 2); 
ctxGame.fillStyle = "yellow";
ctxGame.fill();
});

    // วาด HUD (ข้อมูลผู้เล่น)
    if (me.shape) {
        drawHUD();
    }

// เรียกตัวเองซ้ำเพื่อวาดเฟรมถัดไป
requestAnimationFrame(renderGame);
}

// โหลดรูปภาพแล้วเริ่มลูปการเรนเดอร์เกม
loadImages().then(renderGame);
});