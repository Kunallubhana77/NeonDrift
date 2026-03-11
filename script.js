// UI Navigation Logic
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        
        if (targetId === 'play') {
            document.body.classList.add('play-mode');
            resizeCanvas(); // Make sure canvas is resized
        } else {
            document.body.classList.remove('play-mode');
            resizeCanvas(); // Revert canvas
        }
        
        // Update active class on buttons
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active class on views
        views.forEach(view => {
            view.classList.remove('active');
            if (view.id === targetId) {
                view.classList.add('active');
                if (targetId === 'leaderboard') {
                    renderLeaderboard();
                }
            }
        });
    });
});

function switchToPlay() { document.querySelector('[data-target=\'play\']').click(); }
function switchToLeaderboard() { document.querySelector('[data-target=\'leaderboard\']').click(); }

// --- GAME ENGINE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreVal = document.getElementById('scoreVal');
const lapVal = document.getElementById('lapVal');
const speedVal = document.getElementById('speedVal');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const finalScoreEl = document.getElementById('finalScore');
const finalLapsEl = document.getElementById('finalLaps');
const playerNameInput = document.getElementById('playerName');
const pauseBtn = document.getElementById('pauseBtn');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');
const transitionOverlay = document.getElementById('transitionOverlay');

// Audio Assets
const gameMusic = new Audio('sound.mp3');
gameMusic.loop = true;

// Player Car Options
const carOptions = [
    { name: "PORSCHE 911", src: "porsche.png" },
    { name: "BMW M4", src: "bmw.png" },
    { name: "AUDI R8", src: "audi.png" },
    { name: "LAMBO NITRO", src: "lamborghini.png" },
    { name: "LEXUS LFA", src: "Lexus.png" },
    { name: "THAR DRIFT", src: "Thar.png" },
    { name: "KIA SELTOS", src: "kia seltos.png" },
    { name: "SUZUKI SWIFT", src: "maruti suzuki.png" },
    { name: "ROVER EVOQUE", src: "range rover.png" },
    { name: "ROLLS SUPREME", src: "rolls royce.png" }
];
let currentCarIndex = 0;

// Assets
const playerCarImg = new Image();
playerCarImg.src = carOptions[currentCarIndex].src; 

// Fallback logic if image fails to load
let isPlayerCarLoaded = false;
playerCarImg.onload = () => { isPlayerCarLoaded = true; };

// Enemy assets
const enemyImages = [
    new Image(), new Image(), new Image(),
    new Image(), new Image(), new Image(), new Image(), new Image(),
    new Image()
];
enemyImages[0].src = 'Lexus.png';
enemyImages[1].src = 'audi.png';
enemyImages[2].src = 'range rover.png';
enemyImages[3].src = 'Thar.png';
enemyImages[4].src = 'bmw.png';
enemyImages[5].src = 'kia seltos.png';
enemyImages[6].src = 'lamborghini.png';
enemyImages[7].src = 'maruti suzuki.png';
enemyImages[8].src = 'rolls royce.png';

let loadedEnemyCount = 0;
enemyImages.forEach(img => {
    img.onload = () => { loadedEnemyCount++; };
});

// Game State & Constants
let animationId;
let isPlaying = false;
let isPaused = false;

// Dynamic Screen variables
let CANVAS_WIDTH = canvas.width;
let CANVAS_HEIGHT = canvas.height;
let ROAD_WIDTH = canvas.width;
let ROAD_HEIGHT = canvas.height;
let ROAD_X = 0;
let LANE_WIDTH = ROAD_WIDTH / 3;

// State Variables
let score = 0;
let distance = 0;
let lap = 1;
let baseSpeed = 20; 
let speed = baseSpeed;
let maxSpeed = baseSpeed;
let roadY = 0;
let cityScrollY = 0;

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    d: false,
    A: false,
    D: false,
    ' ': false // Added Spacebar
};

// Player Object
const player = {
    x: ROAD_X + ROAD_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 120,
    width: 60,
    height: 120,
    speedX: 8,
    color: '#00f3ff'
};

function resizeCanvas() {
    if (document.body.classList.contains('play-mode')) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 400;
        canvas.height = 600;
    }
    
    CANVAS_WIDTH = canvas.width;
    CANVAS_HEIGHT = canvas.height;
    
    ROAD_HEIGHT = CANVAS_HEIGHT;
    // Cap road width for playability, e.g. 800 or device width
    ROAD_WIDTH = Math.min(800, CANVAS_WIDTH); 
    ROAD_X = (CANVAS_WIDTH - ROAD_WIDTH) / 2;
    LANE_WIDTH = ROAD_WIDTH / 3;
    
    player.y = CANVAS_HEIGHT - 150;
    
    if (document.body.classList.contains('play-mode')) {
        let scLeft = document.getElementById('envLeft');
        let scRight = document.getElementById('envRight');
        if (scLeft) scLeft.style.width = `${ROAD_X}px`;
        if (scRight) scRight.style.width = `${ROAD_X}px`;
    }
    
    if (!isPlaying) {
        player.x = ROAD_X + (ROAD_WIDTH / 2) - (player.width / 2);
        drawEnvironment();
        drawPlayer();
    }
}

window.addEventListener('resize', resizeCanvas);

// Enemies Array
let enemies = [];
let activeScenery = [];

// Colors for enemies
const enemyColors = ['#ff00ea', '#ff3333', '#00ff66', '#ffff00', '#ff9900'];

// Input Handling
document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Car Selection UI Handling
const prevCarBtn = document.getElementById('prevCar');
const nextCarBtn = document.getElementById('nextCar');
const carPreviewImg = document.getElementById('carPreviewImg');
const carNameText = document.getElementById('carNameText');

function updateCarPreview() {
    const car = carOptions[currentCarIndex];
    carPreviewImg.style.transform = 'scale(0.8) rotate(-10deg)';
    carPreviewImg.style.opacity = '0';
    
    setTimeout(() => {
        carPreviewImg.src = car.src;
        carNameText.innerText = car.name;
        carPreviewImg.style.transform = 'scale(1) rotate(0deg)';
        carPreviewImg.style.opacity = '1';
    }, 200);
}

if (prevCarBtn && nextCarBtn) {
    prevCarBtn.addEventListener('click', () => {
        currentCarIndex = (currentCarIndex - 1 + carOptions.length) % carOptions.length;
        updateCarPreview();
    });
    
    nextCarBtn.addEventListener('click', () => {
        currentCarIndex = (currentCarIndex + 1) % carOptions.length;
        updateCarPreview();
    });
}

// Removed updateEnvironmentTheme since envs are now asymmetric

// Initialize / Reset Game
function initGame() {
    isPlaying = true;
    score = 0;
    distance = 0;
    lap = 1;
    baseSpeed = 20;
    speed = baseSpeed;
    maxSpeed = baseSpeed;
    enemies = [];
    
    // Clear old scenery
    activeScenery.forEach(item => {
        if (item.element.parentNode) item.element.parentNode.removeChild(item.element);
    });
    activeScenery = [];
    
    resizeCanvas(); // ensure vars are correct
    
    // Set selected car image
    playerCarImg.src = carOptions[currentCarIndex].src;
    
    player.x = ROAD_X + (ROAD_WIDTH / 2) - (player.width / 2);
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');
    
    // Play starting transition
    playTransition(() => {
        updateHUD();
        gameLoop();
        gameMusic.currentTime = 0;
        gameMusic.play().catch(e => console.log("Audio play blocked:", e));
    });
}

function playTransition(callback) {
    if (!transitionOverlay) return callback();
    
    transitionOverlay.classList.add('active');
    setTimeout(() => {
        if (callback) callback();
        setTimeout(() => {
            transitionOverlay.classList.remove('active');
        }, 300);
    }, 500);
}

function togglePause() {
    if (!isPlaying) return;
    
    // Toggle state
    isPaused = !isPaused;
    
    const envLeft = document.getElementById('envLeft');
    const envRight = document.getElementById('envRight');

    if (isPaused) {
        // Pause sequence
        pauseBtn.innerText = '▶️';
        cancelAnimationFrame(animationId);
        gameMusic.pause();
        if (envLeft) envLeft.classList.add('paused-env');
        if (envRight) envRight.classList.add('paused-env');
    } else {
        // Resume sequence with countdown
        if (envLeft) envLeft.classList.remove('paused-env');
        if (envRight) envRight.classList.remove('paused-env');
        
        runCountdown(() => {
            pauseBtn.innerText = '⏸️';
            gameLoop();
            gameMusic.play().catch(e => console.log("Audio play blocked:", e));
        });
    }
}

function runCountdown(callback) {
    if (!countdownOverlay || !countdownText) return callback();
    
    countdownOverlay.classList.remove('hidden');
    let count = 3;
    countdownText.innerText = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.innerText = count;
        } else if (count === 0) {
            countdownText.innerText = 'GO!';
        } else {
            clearInterval(interval);
            countdownOverlay.classList.add('hidden');
            callback();
        }
    }, 800);
}


// Generate Enemy Car
function spawnEnemy() {
    // Generate enemies probabilistically based on speed
    if (Math.random() < 0.02 + (lap * 0.005)) {
        const lane = Math.floor(Math.random() * 3);
        const enemyW = 60;
        const enemyH = 120;
        // Introduce random horizontal shift to remove safe zones on lane strips
        const randomOffset = (Math.random() - 0.5) * (LANE_WIDTH * 0.8);
        const enemyX = ROAD_X + (lane * LANE_WIDTH) + (LANE_WIDTH / 2) - (enemyW / 2) + randomOffset;
        
        // Ensure no enemies overlap on spawn too closely
        const canSpawn = !enemies.some(e => Math.abs(e.y) < 150 && e.lane === lane);
        
        if (canSpawn) {
            // Pick a random car image index if loaded, else -1 for fallback colors
            let imgIndex = -1;
            if (loadedEnemyCount === enemyImages.length) {
                imgIndex = Math.floor(Math.random() * enemyImages.length);
            }
            
            enemies.push({
                x: enemyX,
                y: -150,
                width: enemyW,
                height: enemyH,
                speedY: Math.random() * 2 + 3 + (lap * 0.5), // Enemies move slower than player relative speed
                color: enemyColors[Math.floor(Math.random() * enemyColors.length)],
                lane: lane,
                imgIndex: imgIndex
            });
        }
    }
}

// Generate Scenery Props (Trees on Left, Desert on Right)
function spawnScenery() {
    if (Math.random() < 0.12 + (speed * 0.002)) {
        spawnSceneryItem('left');
    }
    if (Math.random() < 0.12 + (speed * 0.002)) {
        spawnSceneryItem('right');
    }
}

function spawnSceneryItem(side) {
    const emojis = ['🌳', '🌲', '🌺', '🌼', '🍀', '🌿'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const container = side === 'left' ? document.getElementById('envLeft') : document.getElementById('envRight');
    
    if(!container) return;

    const el = document.createElement('div');
    el.className = 'scenery-item';
    el.innerText = emoji;
    
    // Position items so they don't overlap the road border too much
    const containerWidth = ROAD_X;
    const itemWidth = 80;
    const randX = Math.random() * (containerWidth - itemWidth);
    
    el.style.left = `${randX}px`;
    
    container.appendChild(el);
    
    activeScenery.push({
        y: -150,
        side: side,
        element: el
    });
}

// Draw Road & Environment
function drawEnvironment() {
    // Transparent outer edge so the HTML City Scape can be seen
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Road Background (Dark Grey)
    ctx.fillStyle = '#111118';
    ctx.fillRect(ROAD_X, 0, ROAD_WIDTH, ROAD_HEIGHT);
    
    // Road Divider Lines
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([40, 40]);
    
    // Calculate animation offset
    roadY += speed;
    if (roadY >= 80) roadY = 0;
    
    ctx.lineDashOffset = -roadY; // Move dashed lines down
    
    // Lane dividers
    ctx.beginPath();
    ctx.moveTo(ROAD_X + LANE_WIDTH, 0);
    ctx.lineTo(ROAD_X + LANE_WIDTH, ROAD_HEIGHT);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(ROAD_X + LANE_WIDTH * 2, 0);
    ctx.lineTo(ROAD_X + LANE_WIDTH * 2, ROAD_HEIGHT);
    ctx.stroke();
    
    // Reset line dash for footpaths
    ctx.setLineDash([]);
    
    // Black and Yellow Footpaths (Curbs)
    const curbWidth = 15;
    const segmentH = 40;
    
    for (let y = -segmentH + (roadY % segmentH); y < CANVAS_HEIGHT; y += segmentH) {
        const isYellow = (Math.floor((y - roadY) / segmentH) % 2 === 0);
        ctx.fillStyle = isYellow ? '#ffcc00' : '#000000';
        
        // Left Footpath
        ctx.fillRect(ROAD_X - curbWidth, y, curbWidth, segmentH);
        // Right Footpath
        ctx.fillRect(ROAD_X + ROAD_WIDTH, y, curbWidth, segmentH);
    }
}

function drawPlayer() {
    // Glow effect removed
    
    if (isPlayerCarLoaded) {
        // Draw real image if loaded
        ctx.drawImage(playerCarImg, player.x, player.y, player.width, player.height);
    } else {
        // Fallback drawing
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Windshield
        ctx.fillStyle = '#111';
        ctx.fillRect(player.x + 10, player.y + 20, player.width - 20, 25);
        
        // Headlights
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x + 5, player.y + 5, 12, 6);
        ctx.fillRect(player.x + player.width - 17, player.y + 5, 12, 6);
    }
}

function drawEnemies() {
    enemies.forEach(enemy => {
        // Glow effect removed
        
        if (enemy.imgIndex !== -1) {
            // Draw real image
            ctx.drawImage(enemyImages[enemy.imgIndex], enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            // Offset enemy hitboxes slightly visual
            ctx.fillStyle = '#222'; // Body
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Neon Outline removed
            
            // Windshield
            ctx.fillStyle = '#111';
            ctx.fillRect(enemy.x + 10, enemy.y + parseInt(enemy.height) - 35, enemy.width - 20, 20);
            
            // Taillights
            ctx.fillStyle = '#ff1111';
            ctx.fillRect(enemy.x + 5, enemy.y + 5, 12, 6);
            ctx.fillRect(enemy.x + enemy.width - 17, enemy.y + 5, 12, 6);
        }
    });
}

function checkCollision() {
    // Reduced hitbox size for fairer gameplay
    const hitPadding = 8; 
    
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (
            player.x + hitPadding < e.x + e.width - hitPadding &&
            player.x + player.width - hitPadding > e.x + hitPadding &&
            player.y + hitPadding < e.y + e.height - hitPadding &&
            player.y + player.height - hitPadding > e.y + hitPadding
        ) {
            return true;
        }
    }
    return false;
}

function updateHUD() {
    scoreVal.innerText = Math.floor(score).toString().padStart(5, '0');
    lapVal.innerText = lap;
    // Format speed with 2 decimal places as per reference image
    speedVal.innerText = speed.toFixed(2);
}

function endGame() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    gameMusic.pause();
    
    // Draw explosion effect
    ctx.fillStyle = 'rgba(255, 51, 51, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Show UI
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = Math.floor(score);
    finalLapsEl.innerText = lap;
}

function gameLoop() {
    if (!isPlaying || isPaused) return;

    // Movement & Speed Logic
    // Increase base speed by 1 unit every 10 seconds (~0.0016 per frame at 60fps)
    baseSpeed += (1 / (10 * 60)); 
    
    const targetSpeed = keys[' '] ? baseSpeed + 10 + (lap * 2) : baseSpeed;
    
    // Smoothly interpolate speed
    if (speed < targetSpeed) speed += 0.2;
    if (speed > targetSpeed) speed -= 0.1;

    if ((keys.ArrowLeft || keys.a || keys.A) && player.x > ROAD_X + 15) {
        player.x -= player.speedX + (lap * 0.2); // Faster steering on higher laps
    }
    if ((keys.ArrowRight || keys.d || keys.D) && player.x < ROAD_X + ROAD_WIDTH - player.width - 15) {
        player.x += player.speedX + (lap * 0.2);
    }
    
    // Update Score & Distance
    distance += speed;
    score += (speed * 0.1);
    
    // Lap mechanic (increase lap every 5000 distance)
    if (distance > lap * 5000) {
        lap++;
        speed += 1.5; // Increase speed
    }
    
    cityScrollY += speed * 0.4;
    // Loop the background seamlessly when it scrolls out of view vertically
    if (cityScrollY > 1000) cityScrollY = 0; 
    
    // Parallax env scroll
    let cLeft = document.getElementById('envLeft');
    let cRight = document.getElementById('envRight');
    if (cLeft) cLeft.style.setProperty('--cy', `${cityScrollY}px`);
    if (cRight) cRight.style.setProperty('--cy', `${cityScrollY}px`);
    
    spawnEnemy();
    spawnScenery();
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        // The enemy moves downwards depending on its own speed + road speed 
        enemies[i].y += (speed - enemies[i].speedY);
        
        // Remove enemies that passed
        if (enemies[i].y > CANVAS_HEIGHT) {
            enemies.splice(i, 1);
            score += 50; // Bonus for passing cleanly
        }
    }

    // Update scenery
    for (let i = activeScenery.length - 1; i >= 0; i--) {
        activeScenery[i].y += speed;
        activeScenery[i].element.style.transform = `translateY(${activeScenery[i].y}px)`;
        
        if (activeScenery[i].y > CANVAS_HEIGHT + 150) {
            if (activeScenery[i].element.parentNode) {
                activeScenery[i].element.parentNode.removeChild(activeScenery[i].element);
            }
            activeScenery.splice(i, 1);
        }
    }
    
    // Render Frame
    drawEnvironment();
    drawEnemies();
    drawPlayer();
    
    updateHUD();
    
    if (checkCollision()) {
        if (pauseBtn) pauseBtn.classList.add('hidden');
        endGame();
    } else {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Button Listeners
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', () => {
    playTransition(() => {
        initGame();
    });
});

saveScoreBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || 'Anonymous';
    const currentScore = Math.floor(score);
    
    saveScoreToLeaderboard(name, currentScore, lap);
    
    // Auto switch to leaderboard
    playerNameInput.value = '';
    switchToLeaderboard();
});

// --- LEADERBOARD LOGIC (LocalStorage) ---

function getScores() {
    const scoresJSON = localStorage.getItem('neonDriftScores');
    return scoresJSON ? JSON.parse(scoresJSON) : [];
}

function saveScoreToLeaderboard(name, score, laps) {
    const scores = getScores();
    const date = new Date().toLocaleDateString();
    
    scores.push({ name, score, laps, date });
    
    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    
    // Keep top 100
    if (scores.length > 100) scores.length = 100;
    
    localStorage.setItem('neonDriftScores', JSON.stringify(scores));
}

function getTier(score) {
    if (score >= 15000) return { name: 'Gold', class: 'gold' };
    if (score >= 5000) return { name: 'Silver', class: 'silver' };
    return { name: 'Bronze', class: 'bronze' };
}

function renderLeaderboard() {
    const scores = getScores();
    const tbody = document.getElementById('leaderboardBody');
    const noMsg = document.getElementById('noScoresMsg');
    
    tbody.innerHTML = '';
    
    if (scores.length === 0) {
        noMsg.classList.remove('hidden');
        tbody.parentElement.classList.add('hidden');
        return;
    }
    
    noMsg.classList.add('hidden');
    tbody.parentElement.classList.remove('hidden');
    
    scores.forEach((s, index) => {
        const tier = getTier(s.score);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${index + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td class="text-neon">${s.score.toLocaleString()}</td>
            <td>${s.laps}</td>
            <td><span class="badge ${tier.class}">${tier.name}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Initial render of empty leaderboard logic
renderLeaderboard();
resizeCanvas();

// --- SCROLL ANIMATIONS ---
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Dynamic targets for scroll animations
    const targets = document.querySelectorAll('.ink-section, .ink-hero, .wm-footer');
    targets.forEach(el => observer.observe(el));
}

// Global Init
initScrollAnimations();
