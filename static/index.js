// นำเข้า Socket.IO Client (ESM)
import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js';
// นำเข้าปุ่มกดจาก utils.js
import { keys } from './utils.js';

// รอให้ DOM โหลดเสร็จสมบูรณ์
document.addEventListener("DOMContentLoaded", function() {
// โค้ดทั้งหมดจะทำงานหลังจากที่ HTML โหลดเสร็จแล้ว
    
// ค่าคงที่สำหรับเกม 
    const PLAYER_SIZE = 80; 	 // ขนาดตัวละคร
    const PROJECTILE_SIZE = 5; 	 // ขนาดกระสุน
    const HEALTH_BAR_HEIGHT = 8; // ความสูงแถบเลือดตัวละคร
    const HEALTH_BAR_WIDTH = 80; // ความกว้างแถบเลือดตัวละคร
    
// อ้างอิง Element ใน HTML 
const connectBtn = document.getElementById("connect");          // ปุ่มเชื่อมต่อ
const nameInput = document.getElementById("name");              // ช่องกรอกชื่อผู้เล่น
const joinBtn = document.getElementById("join");                // ปุ่มเข้าร่วมเกม
const disconnectBtn = document.getElementById("disconnect");    // ปุ่มตัดการเชื่อมต่อ
const shapeSelect = document.getElementById("shape");           // ตัวเลือกตัวละคร
const gameCanvas = document.getElementById("gameCanvas");       // แคนวาสเกม

// กำหนดขนาด Canvas ให้เหมือนกับขนาด Server
gameCanvas.width = 1450; // กำหนดความกว้างของแคนวาส
gameCanvas.height = 600; // กำหนดความสูงของแคนวาส
const ctxGame = gameCanvas.getContext("2d"); // บริบทการวาด 2D ของแคนวาส

// ออบเจกต์รูปภาพ
const characterImages = {}; // จะเก็บรูปภาพตัวละคร
let backgroundImage = null; // รูปภาพพื้นหลัง

// สถานะเกม
let players = [];           // อาร์เรย์ผู้เล่นทั้งหมด
let projectiles = [];       // อาร์เรย์กระสุนทั้งหมด
let me = {                  // สถานะผู้เล่นปัจจุบัน
name: "",                   // ชื่อผู้เล่น
color: "#CCCCCC",         // สีตัวละคร
shape: "",                  // รูปแบบตัวละคร
pos: { x: 0, y: 0 },        // ตำแหน่งเริ่มต้น
direction: "stop",          // ทิศทางเริ่มต้น
health: 100,                // พลังชีวิตเริ่มต้น
speed: 20                   // ความเร็วการเคลื่อนที่
};

// การตั้งค่า Socket.IO Client
const socket = io("http://localhost:5000", { autoConnect: false, transports: ["websocket"] }); // ปิดการเชื่อมต่ออัตโนมัติและใช้ WebSocket เท่านั้น

// การจัดการ UI
function UIUpdate(isConnected = false) {    // อัปเดตสถานะปุ่มตามการเชื่อมต่อ
connectBtn.disabled = isConnected;          // ปุ่มเชื่อมต่อถูกปิดใช้งานเมื่อเชื่อมต่อแล้ว
disconnectBtn.disabled = !isConnected;      // ปุ่มตัดการเชื่อมต่อถูกปิดใช้งานเมื่อไม่ได้เชื่อมต่อ
joinBtn.disabled = !isConnected;            // ปุ่มเข้าร่วมเกมถูกปิดใช้งานเมื่อไม่ได้เชื่อมต่อ
nameInput.disabled = !isConnected;          // ช่องกรอกชื่อถูกปิดใช้งานเมื่อไม่ได้เชื่อมต่อ
shapeSelect.disabled = !isConnected;        // ตัวเลือกตัวละครถูกปิดใช้งานเมื่อไม่ได้เชื่อมต่อ
}
function joinedGame() {                     // อัปเดต UI เมื่อเข้าร่วมเกมแล้ว
shapeSelect.disabled = true;                // ปิดใช้งานตัวเลือกตัวละคร
nameInput.disabled = true;                  // ปิดใช้งานช่องกรอกชื่อ
joinBtn.disabled = true;                    // ปิดใช้งานปุ่มเข้าร่วมเกม
}
UIUpdate();   // เรียกใช้ฟังก์ชันอัปเดต UI ในตอนเริ่มต้น

// เหตุการณ์ Socket & UI
socket.on("connect", () => {                        // เมื่อเชื่อมต่อกับเซิร์ฟเวอร์สำเร็จ
console.log("เชื่อมต่อกับเซิร์ฟเวอร์ WebSocket สำเร็จ");     // ข้อความยืนยันการเชื่อมต่อ
UIUpdate(true);                                     // อัปเดตสถานะปุ่มเมื่อเชื่อมต่อ
});

socket.on("disconnect", () => {                        // เมื่อการเชื่อมต่อถูกตัด
console.log("ตัดการเชื่อมต่อจากเซิร์ฟเวอร์ WebSocket แล้ว");   // ข้อความยืนยันการตัดการเชื่อมต่อ
UIUpdate(false);                                      // อัปเดตสถานะปุ่มเมื่อไม่ได้เชื่อมต่อ
// รีเซ็ตสถานะผู้เล่นและอาร์เรย์เกม
me = { name:"", color:"#CCCCCC", shape:"", pos:{x:0,y:0}, direction:"stop", health: 100, speed: 20 }; // รีเซ็ตสถานะผู้เล่น
players = [];      // รีเซ็ตอาร์เรย์ผู้เล่น
projectiles = [];  // รีเซ็ตอาร์เรย์กระสุน
});

socket.on("message", (data) => {   // รับข้อความจากเซิร์ฟเวอร์
console.log("ได้รับข้อความ:", data);  // แสดงข้อความในคอนโซล
});

socket.on("game_update", (data) => { // รับการอัปเดตสถานะเกมจากเซิร์ฟเวอร์
players = data.players;              // อัปเดตอาร์เรย์ผู้เล่น

const myPlayer = players.find(p => p.name === me.name);  // ค้นหาผู้เล่นปัจจุบันในอาร์เรย์ผู้เล่น

if (myPlayer) {                  // ถ้าพบผู้เล่นปัจจุบัน
me.health = myPlayer.health;     // อัปเดตพลังชีวิตของผู้เล่นปัจจุบัน
me.pos = myPlayer.pos;           // อัปเดตตำแหน่งของผู้เล่นปัจจุบัน

if (me.health <= 0) {     // ถ้าพลังชีวิตของผู้เล่นปัจจุบันหมด
console.log(`เกมโอเวอร์! ${me.name} ถูกกำจัดแล้ว`);  // แสดงข้อความในคอนโซล
// ข้อความแจ้งเตือนเมื่อเกมโอเวอร์
alert("กาก"); // แสดงข้อความแจ้งเตือน
socket.disconnect();  // ตัดการเชื่อมต่อจากเซิร์ฟเวอร์
}
}
});

socket.on("projectiles_update", (data) => {   // รับการอัปเดตกระสุนจากเซิร์ฟเวอร์
projectiles = data.projectiles;               // อัปเดตอาร์เรย์กระสุน
});

// เม่อคลิกปุ่มเชื่อมต่อ/ตัดการเชื่อมต่อ
connectBtn.addEventListener("click", () => socket.connect());        // เชื่อมต่อเมื่อคลิกปุ่มเชื่อมต่อ
disconnectBtn.addEventListener("click", () => socket.disconnect());  // ตัดการเชื่อมต่อเมื่อคลิกปุ่มตัดการเชื่อมต่อ

// เมื่อคลิกปุ่มเข้าร่วมเกม
joinBtn.addEventListener("click", () => {  // ดึงค่าจากฟอร์ม  
const shape = shapeSelect.value;           // รูปแบบตัวละครที่เลือก
const name = nameInput.value.trim();       // ชื่อผู้เล่นที่กรอกและตัดช่องว่าง

// กำหนดตำแหน่งเริ่มต้นแบบสุ่มภายในขอบเขตของแคนวาส
const pos = {
x: Math.random() * gameCanvas.width, // ตำแหน่ง x แบบสุ่ม
y: Math.random() * gameCanvas.height // ตำแหน่ง y แบบสุ่ม
};

if (shape && name) {                                   // ตรวจสอบว่ามีการเลือกตัวละครและกรอกชื่อ
me = { ...me, name, shape, pos, direction: "stop" };   // อัปเดตสถานะผู้เล่นปัจจุบัน
socket.emit("join_game", me);                          // ส่งข้อมูลผู้เล่นไปยังเซิร์ฟเวอร์
joinedGame();                                          // อัปเดต UI เมื่อเข้าร่วมเกม
} else {                                               // ถ้าไม่มีการเลือกตัวละครหรือกรอกชื่อ
alert("กรุณาเลือกตัวละครและใส่ชื่อของคุณ");                  // แจ้งเตือนให้กรอกข้อมูลให้ครบถ้วน
}
});

// เมื่อคลิกซ้ายบนแคนวาสเพื่อยิง
gameCanvas.addEventListener("mousedown", (event) => {        
if (event.button !== 0    // ตรวจว่าปุ่มที่กด ไม่ใช่ปุ่มซ้ายของเมาส์
    || !socket.connected  // ตรวจว่า ยังไม่ได้เชื่อมต่อกับเซิร์ฟเวอร์ผ่าน Socket.io
    || !me.shape) {       // ตรวจว่า ตัวผู้เล่นไม่มีรูปแบบตัวละคร
return;  //returnทันทีถ้าข้างบนถูก
}
// หาตำแหน่งที่คลิก
const rect = gameCanvas.getBoundingClientRect();  // ขอบเขตของแคนวาส
const mouseX = event.clientX - rect.left;         // คำนวณแกน X
const mouseY = event.clientY - rect.top;          // คำนวณแกน Y
// ส่งข้อมูลไปบอกเซิร์ฟเวอร์
socket.emit("attack", { targetX: mouseX, targetY: mouseY });   // ยิงไปที่ตำแหน่งที่คลิก
});

// ฟังก์ชันโหลดรูปภาพล่วงหน้า
function loadImages() {     
return new Promise((resolve) => {      // โหลดรูปภาพตัวละครและพื้นหลัง
const imageSources = {                 // แหล่งที่มาของรูปภาพตัวละคร
'catsy': './static/รูป/artworks-g5v0yBmy0N4NzRb1-XWaf0g-t500x500.jpg', // ตัวอย่างแหล่งที่มาของรูปภาพเป็นรูปตัวละครที่นำมาใช้ในเกม
'catpy': './static/รูป/artworks-WW0hNKy1wDzyYQYR-qd1o5A-t500x500.jpg', // ตัวอย่างแหล่งที่มาของรูปภาพเป็นรูปตัวละครที่นำมาใช้ในเกม
'catfy': './static/รูป/R.jpg',                                         // ตัวอย่างแหล่งที่มาของรูปภาพเป็นรูปตัวละครที่นำมาใช้ในเกม
};
const bgSrc = './static/รูป/ipghi9dy50f51.png'; // แหล่งที่มาของรูปภาพพื้นหลังภายในเกม

let imagesLoaded = 0;                                     // ตัวนับรูปภาพที่โหลดเสร็จ
const totalImages = Object.keys(imageSources).length + 1; // รวมรูปภาพตัวละครและพื้นหลัง

const checkIfDone = () => {  // ตรวจสอบว่ารูปภาพทั้งหมดโหลดเสร็จหรือยัง
imagesLoaded++;              // เพิ่มตัวนับรูปภาพที่โหลดเสร็จ
if (imagesLoaded === totalImages) {     // ถ้าโหลดครบทั้งหมด
console.log("พร้อมแล้วครับสุดหล่อ");        // ข้อความยืนยัน
resolve();                              // เรียกใช้ Promise
}
};

for (let key in imageSources) {    // โหลดรูปภาพตัวละคร
const img = new Image();           // สร้างออบเจกต์รูปภาพใหม่
img.onload = () => { characterImages[key] = img; checkIfDone(); };         // เมื่อโหลดเสร็จเก็บไว้ในออบเจกต์และตรวจสอบสถานะ
img.onerror = () => { console.error(`ไม่ได้เฉย: ${key}`); checkIfDone(); };  // ถ้าโหลดล้มเหลวแสดงข้อความผิดพลาดและตรวจสอบสถานะ
img.src = imageSources[key];  // กำหนดแหล่งที่มาของรูปภาพ
}
const bgImg = new Image();   // โหลดรูปภาพพื้นหลัง
bgImg.onload = () => { backgroundImage = bgImg; checkIfDone(); };          // เมื่อโหลดเสร็จเก็บไว้ในออบเจกต์และตรวจสอบสถานะ
bgImg.onerror = () => { console.error("ไม่ได้อีกแล้วหรอ"); checkIfDone(); };   // ถ้าโหลดล้มเหลวแสดงข้อความผิดพลาดและตรวจสอบสถานะ
bgImg.src = bgSrc;   // กำหนดแหล่งที่มาของรูปภาพ
});
}

// วาดแถบเลือดของผู้เล่น
function drawHealthBar(player) {
    // ดึงพลังชีวิตของผู้เล่น (ค่าปกติคือ 100)
    const health = player.health || 100;

    // ถ้าเลือดเต็ม 100 ก็ไม่ต้องวาด
    if (health >= 100) return; 

    // คำนวณตำแหน่งที่จะวาด
    const barX = player.pos.x - HEALTH_BAR_WIDTH / 2;
    const barY = player.pos.y - PLAYER_SIZE / 2 - 25;

    // พื้นหลังของแถบ (สีดำโปร่งแสง)
    ctxGame.fillStyle = "rgba(0, 0, 0, 0.5)";  // สีดำโปร่งแสง
    ctxGame.fillRect(barX, barY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);  // วาดพื้นหลังแถบเลือด

    // วาดแถบเลือดทับฟังชั่นข้างบน
    const healthRatio = Math.max(0, health / 100);     // อัตราส่วนเลือด (0.0 - 1.0)
    ctxGame.fillStyle = health > 30 ? "lime" : "red";  // สีเขียวถ้าเลือดมากกว่า 30 มิฉะนั้นสีแดง
    ctxGame.fillRect(barX, barY, HEALTH_BAR_WIDTH * healthRatio, HEALTH_BAR_HEIGHT);  // วาดแถบเลือดตามอัตราส่วน
}

// วาด HUD (ข้อมูลผู้เล่น)
function drawHUD() {
    // แสดงพลังชีวิตของผู้เล่นคนปัจจุบันที่มุมซ้ายบน
    ctxGame.font = '24px Arial Black'; // กำหนดฟอนต์
    ctxGame.textAlign = 'left';        // จัดข้อความชิดซ้าย
    ctxGame.fillStyle = me.health > 30 ? "rgba(0, 255, 0, 0.9)" : "rgba(255, 0, 0, 0.9)";  // สีเขียวถ้าเลือดมากกว่า 30 มิฉะนั้นสีแดง
    ctxGame.fillText(`พลังชีวิต: ${me.health}`, 10, 30);  // วาดข้อความพลังชีวิตที่มุมซ้ายบน
}


// ฟังก์ชันเรนเดอร์เกม
function renderGame() {  
ctxGame.clearRect(0, 0, gameCanvas.width, gameCanvas.height); // ล้างแคนวาสก่อนวาดใหม่

// วาดพื้นหลัง
if (backgroundImage) {
// วาดภาพพื้นหลังให้ครอบคลุมขนาด Canvas
ctxGame.drawImage(backgroundImage, 0, 0, gameCanvas.width, gameCanvas.height);
}

// กำหนดทิศทางการเคลื่อนที่ของผู้เล่น
let direction = "stop"; 
// ตรวจสอบการกดปุ่ม WASD
if (keys['W'] || keys['w']) direction = "up";          // เคลื่อนที่ขึ้น
else if (keys['S'] || keys['s']) direction = "down";   // เคลื่อนที่ลง
else if (keys['A'] || keys['a']) direction = "left";   // เคลื่อนที่ซ้าย
else if (keys['D'] || keys['d']) direction = "right";  // เคลื่อนที่ขวา

// ส่งคำสั่งเคลื่อนที่ไปยังเซิร์ฟเวอร์ถ้าทิศทางเปลี่ยนแปลง
if (socket.connected && me.shape && me.direction !== direction) {  // ตรวจสอบการเชื่อมต่อและตัวละคร
socket.emit("move", { direction });  // ส่งคำสั่งเคลื่อนที่ไปยังเซิร์ฟเวอร์
me.direction = direction;            // อัปเดตทิศทางปัจจุบัน
}

// วาดผู้เล่นทั้งหมด
players.forEach(player => {  // วนลูปผ่านผู้เล่นแต่ละคน
const size = PLAYER_SIZE;    // ขนาดตัวละคร
const img = characterImages[player.shape];  // ดึงรูปภาพตัวละครตามรูปแบบที่เลือก

// วาดตัวละคร
if (img) {
// วาดรูปภาพถ้าโหลดสำเร็จ
ctxGame.drawImage(img, player.pos.x - size / 2, player.pos.y - size / 2, size, size); // วาดรูปภาพตัวละครที่ตำแหน่งและขนาดที่กำหนด
} else {
// วาดสี่เหลี่ยมสีถ้าไม่มีรูปภาพ
ctxGame.fillStyle = player.color || "#CCCCCC";  // ใช้สีที่กำหนดหรือสีเทาเป็นค่าเริ่มต้น
ctxGame.fillRect(player.pos.x - size / 2, player.pos.y - size / 2, size, size);  // วาดสี่เหลี่ยมแทนตัวละคร
}

 // วาดแถบเลือดของผู้เล่น
 drawHealthBar(player);
 
// วาดชื่อผู้เล่น
ctxGame.font = '14px Arial';  // กำหนดฟอนต์
ctxGame.textAlign = 'center'; // จัดข้อความกึ่งกลาง
ctxGame.fillStyle = "#ffffffff";   
ctxGame.fillText(player.name, player.pos.x, player.pos.y - size / 2 - 5);  // วาดชื่อผู้เล่นเหนือหัวตัวละคร
});

// วาดกระสุนทั้งหมด
projectiles.forEach(proj => {  // วนลูปผ่านกระสุนแต่ละลูก
ctxGame.beginPath();           // เริ่มเส้นทางใหม่สำหรับวาดกระสุน
ctxGame.arc(proj.pos.x, proj.pos.y, PROJECTILE_SIZE, 0, Math.PI * 2);  // วาดวงกลมเป็นกระสุน 
ctxGame.fillStyle = "yellow";  // สีกระสุน
ctxGame.fill();                // เติมสีให้กระสุน
});

 // วาด HUD ถ้าผู้เล่นปัจจุบันมีตัวละคร)
 if (me.shape) { // ตรวจสอบว่าผู้เล่นปัจจุบันมีตัวละคร
 drawHUD();      // วาด HUD
 }

// เรียกใช้ฟังก์ชันเรนเดอร์เกมซ้ำในเฟรมถัดไป
requestAnimationFrame(renderGame);
}

// โหลดรูปภาพล่วงหน้าแล้วเริ่มเรนเดอร์เกม
loadImages().then(renderGame);
});