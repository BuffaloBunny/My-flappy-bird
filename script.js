const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("finalScore");
const bestScoreElement = document.getElementById("bestScore");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

// --------------------------------------------------
// CANVAS
// --------------------------------------------------

let width;
let height;
let scale = 1;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    scale = width / 420;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --------------------------------------------------
// GAME SETTINGS
// --------------------------------------------------

const GRAVITY = 0.42;
const FLAP_POWER = -7.5;

const PIPE_WIDTH = 64;
const PIPE_GAP = 165;

const PIPE_SPEED = 2.7;

const GROUND_HEIGHT = 70;

let gameRunning = false;
let gameStarted = false;
let score = 0;

let bestScore = Number(localStorage.getItem("flappyBest")) || 0;

bestScoreElement.textContent = bestScore;

// --------------------------------------------------
// BIRD
// --------------------------------------------------

const bird = {
    x: 105,
    y: 300,
    radius: 17,
    velocity: 0,
    rotation: 0,
    wingTimer: 0
};

// --------------------------------------------------
// PIPES
// --------------------------------------------------

let pipes = [];

function createPipe() {
    const minimumTop = 100;
    const minimumBottom = 120;

    const availableHeight =
        height - GROUND_HEIGHT - PIPE_GAP - minimumTop - minimumBottom;

    const topHeight =
        minimumTop + Math.random() * availableHeight;

    pipes.push({
        x: width + 20,
        top: topHeight,
        gap: PIPE_GAP,
        counted: false
    });
}

// --------------------------------------------------
// PARTICLES
// --------------------------------------------------

let particles = [];

function createParticle(x, y, amount = 1) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x,
            y,
            velocityX: -1.5 - Math.random() * 2,
            velocityY: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 3,
            life: 1
        });
    }
}

function updateParticles() {
    particles.forEach(particle => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.life -= 0.025;
    });

    particles = particles.filter(particle => particle.life > 0);
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.globalAlpha = particle.life;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    ctx.globalAlpha = 1;
}

// --------------------------------------------------
// CLOUDS
// --------------------------------------------------

const clouds = [
    { x: 40, y: 100, size: 1 },
    { x: 260, y: 160, size: 0.8 },
    { x: 150, y: 260, size: 0.65 },
    { x: 360, y: 70, size: 0.7 }
];

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x -= 0.25;

        if (cloud.x < -100) {
            cloud.x = width + 100;
            cloud.y = 50 + Math.random() * 220;
        }
    });
}

function drawCloud(cloud) {
    const x = cloud.x;
    const y = cloud.y;
    const s = cloud.size;

    ctx.save();

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 25 * s, y - 10 * s, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 58 * s, y, 22 * s, 0, Math.PI * 2);

    ctx.fill();

    ctx.restore();
}

// --------------------------------------------------
// BACKGROUND
// --------------------------------------------------

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#54c8ff");
    gradient.addColorStop(1, "#a8edff");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sun
    ctx.save();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffe58a";

    ctx.beginPath();
    ctx.arc(width - 65, 85, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Clouds
    clouds.forEach(drawCloud);

    // Distant hills
    ctx.fillStyle = "#83d38c";

    ctx.beginPath();
    ctx.moveTo(0, height - GROUND_HEIGHT - 70);

    for (let x = 0; x <= width; x += 40) {
        const hill =
            Math.sin(x * 0.025) * 25 +
            Math.sin(x * 0.055) * 15;

        ctx.lineTo(
            x,
            height - GROUND_HEIGHT - 60 + hill
        );
    }

    ctx.lineTo(width, height - GROUND_HEIGHT);
    ctx.lineTo(0, height - GROUND_HEIGHT);
    ctx.closePath();

    ctx.fill();

    // Ground
    drawGround();
}

function drawGround() {
    const groundY = height - GROUND_HEIGHT;

    // Grass
    ctx.fillStyle = "#68c85d";
    ctx.fillRect(0, groundY, width, 12);

    // Grass highlights
    ctx.fillStyle = "#8be36f";

    for (let x = 0; x < width; x += 24) {
        ctx.fillRect(x, groundY, 12, 5);
    }

    // Dirt
    ctx.fillStyle = "#d9ad62";
    ctx.fillRect(0, groundY + 12, width, GROUND_HEIGHT - 12);

    // Dirt lines
    ctx.fillStyle = "#c3934d";

    for (let x = -10; x < width; x += 30) {
        ctx.fillRect(
            x,
            groundY + 30 + ((x * 7) % 20),
            10,
            3
        );
    }
}

// --------------------------------------------------
// PIPES
// --------------------------------------------------

function drawPipe(x, y, pipeHeight, upsideDown = false) {
    const capHeight = 22;
    const capExtra = 7;

    ctx.save();

    // Main pipe
    ctx.fillStyle = "#46b84f";

    ctx.fillRect(
        x,
        y,
        PIPE_WIDTH,
        pipeHeight
    );

    // Pipe highlight
    ctx.fillStyle = "#7be878";

    ctx.fillRect(
        x + 9,
        y,
        9,
        pipeHeight
    );

    // Dark edge
    ctx.fillStyle = "#31933b";

    ctx.fillRect(
        x + PIPE_WIDTH - 8,
        y,
        8,
        pipeHeight
    );

    // Cap
    if (!upsideDown) {
        ctx.fillStyle = "#3ba943";

        ctx.fillRect(
            x - capExtra,
            y + pipeHeight - capHeight,
            PIPE_WIDTH + capExtra * 2,
            capHeight
        );

        ctx.fillStyle = "#76df69";

        ctx.fillRect(
            x,
            y + pipeHeight - capHeight + 4,
            10,
            capHeight - 7
        );
    } else {
        ctx.fillStyle = "#3ba943";

        ctx.fillRect(
            x - capExtra,
            y,
            PIPE_WIDTH + capExtra * 2,
            capHeight
        );

        ctx.fillStyle = "#76df69";

        ctx.fillRect(
            x,
            y + 4,
            10,
            capHeight - 7
        );
    }

    ctx.restore();
}

function drawPipes() {
    pipes.forEach(pipe => {
        const bottomY = pipe.top + pipe.gap;

        drawPipe(
            pipe.x,
            0,
            pipe.top - 22,
            true
        );

        drawPipe(
            pipe.x,
            bottomY + 22,
            height - GROUND_HEIGHT - bottomY - 22,
            false
        );
    });
}

// --------------------------------------------------
// BIRD
// --------------------------------------------------

function drawBird() {
    ctx.save();

    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Shadow
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000000";

    ctx.beginPath();
    ctx.ellipse(0, 21, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // Body
    ctx.fillStyle = "#ffd447";

    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = "#d99f19";
    ctx.lineWidth = 2;

    ctx.stroke();

    // Wing
    const wingY =
        Math.sin(bird.wingTimer) * 3 + 4;

    ctx.fillStyle = "#f2b928";

    ctx.beginPath();
    ctx.ellipse(
        -7,
        wingY,
        11,
        7,
        -0.25,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Eye
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(7, -7, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#222";

    ctx.beginPath();
    ctx.arc(9, -7, 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#ff8c32";

    ctx.beginPath();
    ctx.moveTo(14, -1);
    ctx.lineTo(27, 4);
    ctx.lineTo(14, 9);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#d86b1f";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

// --------------------------------------------------
// COLLISION
// --------------------------------------------------

function circleRectangleCollision(
    circleX,
    circleY,
    radius,
    rectX,
    rectY,
    rectWidth,
    rectHeight
) {
    const closestX = Math.max(
        rectX,
        Math.min(circleX, rectX + rectWidth)
    );

    const closestY = Math.max(
        rectY,
        Math.min(circleY, rectY + rectHeight)
    );

    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;

    return (
        distanceX * distanceX +
        distanceY * distanceY
    ) < radius * radius;
}

function checkCollision() {
    // Ceiling
    if (bird.y - bird.radius <= 0) {
        return true;
    }

    // Ground
    if (
        bird.y + bird.radius >=
        height - GROUND_HEIGHT
    ) {
        return true;
    }

    // Pipes
    for (const pipe of pipes) {
        const topCollision =
            circleRectangleCollision(
                bird.x,
                bird.y,
                bird.radius,
                pipe.x,
                0,
                PIPE_WIDTH,
                pipe.top
            );

        const bottomY =
            pipe.top + pipe.gap;

        const bottomCollision =
            circleRectangleCollision(
                bird.x,
                bird.y,
                bird.radius,
                pipe.x,
                bottomY,
                PIPE_WIDTH,
                height - GROUND_HEIGHT - bottomY
            );

        if (topCollision || bottomCollision) {
            return true;
        }
    }

    return false;
}

// --------------------------------------------------
// SCORE
// --------------------------------------------------

function updateScore() {
    pipes.forEach(pipe => {
        if (
            !pipe.counted &&
            pipe.x + PIPE_WIDTH < bird.x
        ) {
            pipe.counted = true;

            score++;

            scoreElement.textContent = score;

            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem(
                    "flappyBest",
                    bestScore
                );
            }

            createParticle(
                bird.x,
                bird.y,
                8
            );
        }
    });
}

// --------------------------------------------------
// FLAP
// --------------------------------------------------

function flap() {
    if (!gameStarted) {
        startGame();
        return;
    }

    if (!gameRunning) {
        return;
    }

    bird.velocity = FLAP_POWER;
    bird.wingTimer += 2;

    createParticle(
        bird.x - 12,
        bird.y + 8,
        3
    );
}

// --------------------------------------------------
// START GAME
// --------------------------------------------------

function startGame() {
    gameStarted = true;
    gameRunning = true;

    score = 0;
    scoreElement.textContent = "0";

    pipes = [];
    particles = [];

    bird.x = width * 0.25;
    bird.y = height * 0.45;
    bird.velocity = 0;
    bird.rotation = 0;

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    createPipe();

    requestAnimationFrame(gameLoop);
}

// --------------------------------------------------
// GAME OVER
// --------------------------------------------------

function endGame() {
    gameRunning = false;

    finalScoreElement.textContent = score;
    bestScoreElement.textContent = bestScore;

    gameOverScreen.classList.remove("hidden");
}

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

function update() {
    if (!gameRunning) {
        return;
    }

    // Bird physics
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;

    // Bird rotation
    bird.rotation =
        Math.min(
            Math.PI / 2,
            Math.max(
                -0.5,
                bird.velocity * 0.08
            )
        );

    bird.wingTimer += 0.35;

    // Pipes
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
    });

    // Remove old pipes
    pipes = pipes.filter(
        pipe => pipe.x > -PIPE_WIDTH - 30
    );

    // Create new pipe
    if (
        pipes.length === 0 ||
        pipes[pipes.length - 1].x < width - 220
    ) {
        createPipe();
    }

    updateScore();

    updateParticles();
    updateClouds();

    if (checkCollision()) {
        endGame();
    }
}

// --------------------------------------------------
// DRAW
// --------------------------------------------------

function draw() {
    ctx.clearRect(0, 0, width, height);

    drawBackground();
    drawPipes();
    drawParticles();
    drawBird();
}

// --------------------------------------------------
// GAME LOOP
// --------------------------------------------------

function gameLoop() {
    update();
    draw();

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// --------------------------------------------------
// CONTROLS
// --------------------------------------------------

document.addEventListener("keydown", event => {
    if (
        event.code === "Space" ||
        event.code === "ArrowUp"
    ) {
        event.preventDefault();
        flap();
    }
});

canvas.addEventListener("mousedown", event => {
    event.preventDefault();
    flap();
});

canvas.addEventListener(
    "touchstart",
    event => {
        event.preventDefault();
        flap();
    },
    { passive: false }
);

startButton.addEventListener("click", startGame);

restartButton.addEventListener("click", startGame);

// --------------------------------------------------
// INITIAL DRAW
// --------------------------------------------------

function initialDraw() {
    bird.x = width * 0.25;
    bird.y = height * 0.45;

    drawBackground();
    drawBird();
}

initialDraw();