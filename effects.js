// ✨ Hiệu ứng lung linh: bầu trời sao, bụi sáng, sao băng, hoa rơi (trang xem), vệt sao & tim bay
(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isShared = document.body.classList.contains("is-shared");
    const isSmallScreen = window.matchMedia("(max-width: 600px)").matches;
    const canvas = document.querySelector("#star-canvas");
    const context = canvas && canvas.getContext("2d");
    if (!context) return;

    const COLORS = ["255,255,255", "255,242,168", "255,196,236", "205,182,255", "180,225,255"];
    const PETAL_COLORS = ["255,182,222", "255,206,236", "246,170,214", "255,224,240", "226,196,255"];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    let width = 0;
    let height = 0;
    let stars = [];
    let motes = [];
    let petals = [];
    let shootingStar = null;
    let nextShootAt = isShared ? 1.5 : 3;
    let lastTime = 0;

    function makeStar() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.3 + 0.3,
            big: Math.random() < (isShared ? 0.2 : 0.14),
            phase: Math.random() * Math.PI * 2,
            speed: 0.6 + Math.random() * 1.8,
            color: pick(COLORS)
        };
    }

    function makeMote(anywhere) {
        return {
            x: Math.random() * width,
            y: anywhere ? Math.random() * height : height + 20,
            radius: 2 + Math.random() * 5,
            speed: 0.15 + Math.random() * 0.4,
            sway: Math.random() * Math.PI * 2,
            color: pick(COLORS),
            alpha: 0.15 + Math.random() * 0.35
        };
    }

    function makePetal(anywhere) {
        return {
            x: Math.random() * width,
            y: anywhere ? Math.random() * height : -20,
            size: 5 + Math.random() * 6,
            speed: 0.5 + Math.random() * 0.8,
            drift: (Math.random() - 0.5) * 0.6,
            sway: Math.random() * Math.PI * 2,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.04,
            flip: Math.random() * Math.PI * 2,
            color: pick(PETAL_COLORS)
        };
    }

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        const count = Math.round(Math.min(isSmallScreen ? 70 : 170, (width * height) / 8500));
        stars = Array.from({ length: count }, makeStar);
        motes = Array.from({ length: Math.round(count / 5) }, () => makeMote(true));
        petals = isShared
            ? Array.from({ length: isSmallScreen ? 14 : 24 }, () => makePetal(true))
            : [];
        if (reduceMotion) draw(0);
    }

    function drawSparkle(x, y, size, alpha, color) {
        context.fillStyle = `rgba(${color},${alpha})`;
        context.beginPath();
        context.moveTo(x, y - size);
        context.quadraticCurveTo(x, y, x + size, y);
        context.quadraticCurveTo(x, y, x, y + size);
        context.quadraticCurveTo(x, y, x - size, y);
        context.quadraticCurveTo(x, y, x, y - size);
        context.fill();
    }

    function drawPetal(petal, time) {
        context.save();
        context.translate(petal.x, petal.y);
        context.rotate(petal.angle);
        // Lật cánh hoa để trông như đang xoay trong gió
        context.scale(1, 0.45 + 0.55 * Math.abs(Math.sin(time * 1.4 + petal.flip)));
        context.fillStyle = `rgba(${petal.color},0.85)`;
        context.beginPath();
        context.moveTo(0, -petal.size);
        context.bezierCurveTo(petal.size * 0.9, -petal.size * 0.6, petal.size * 0.7, petal.size * 0.7, 0, petal.size);
        context.bezierCurveTo(-petal.size * 0.7, petal.size * 0.7, -petal.size * 0.9, -petal.size * 0.6, 0, -petal.size);
        context.fill();
        context.fillStyle = "rgba(255,255,255,0.45)";
        context.beginPath();
        context.ellipse(-petal.size * 0.2, -petal.size * 0.2, petal.size * 0.18, petal.size * 0.4, 0.3, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    function draw(now) {
        const time = now / 1000;
        const step = lastTime ? Math.min((now - lastTime) / 16.67, 3) : 1;
        lastTime = now;
        context.clearRect(0, 0, width, height);

        // Bụi sáng bay lên
        motes.forEach((mote, index) => {
            if (!reduceMotion) {
                mote.y -= mote.speed * step;
                mote.x += Math.sin(time * 0.6 + mote.sway) * 0.25 * step;
                if (mote.y < -20) motes[index] = makeMote(false);
            }
            const glow = context.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.radius * 3);
            glow.addColorStop(0, `rgba(${mote.color},${mote.alpha})`);
            glow.addColorStop(1, `rgba(${mote.color},0)`);
            context.fillStyle = glow;
            context.beginPath();
            context.arc(mote.x, mote.y, mote.radius * 3, 0, Math.PI * 2);
            context.fill();
        });

        // Sao lấp lánh
        stars.forEach((star) => {
            const twinkle = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
            const alpha = 0.25 + twinkle * 0.75;
            if (star.big) {
                context.shadowBlur = 10;
                context.shadowColor = `rgba(${star.color},${alpha})`;
                drawSparkle(star.x, star.y, (star.radius * 3 + 2) * (0.6 + twinkle * 0.6), alpha, star.color);
                context.shadowBlur = 0;
            } else {
                context.fillStyle = `rgba(${star.color},${alpha})`;
                context.beginPath();
                context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                context.fill();
            }
        });

        // Cánh hoa rơi (chỉ trang xem hồ sơ)
        petals.forEach((petal, index) => {
            if (!reduceMotion) {
                petal.y += petal.speed * step;
                petal.x += (petal.drift + Math.sin(time + petal.sway) * 0.5) * step;
                petal.angle += petal.spin * step;
                if (petal.y > height + 20 || petal.x < -30 || petal.x > width + 30) {
                    petals[index] = makePetal(false);
                }
            }
            drawPetal(petal, time);
        });

        // Sao băng
        if (!reduceMotion) {
            if (!shootingStar && time > nextShootAt) {
                shootingStar = {
                    x: width * (0.35 + Math.random() * 0.65),
                    y: Math.random() * height * 0.35,
                    vx: -(7 + Math.random() * 4),
                    vy: 3 + Math.random() * 2,
                    life: 0
                };
            }
            if (shootingStar) {
                const s = shootingStar;
                s.x += s.vx * step;
                s.y += s.vy * step;
                s.life += step;
                const fade = Math.max(0, 1 - s.life / 70);
                const tailX = s.x - s.vx * 12;
                const tailY = s.y - s.vy * 12;
                const tail = context.createLinearGradient(s.x, s.y, tailX, tailY);
                tail.addColorStop(0, `rgba(255,255,255,${fade})`);
                tail.addColorStop(0.3, `rgba(255,214,245,${fade * 0.6})`);
                tail.addColorStop(1, "rgba(255,214,245,0)");
                context.strokeStyle = tail;
                context.lineWidth = 2;
                context.lineCap = "round";
                context.beginPath();
                context.moveTo(s.x, s.y);
                context.lineTo(tailX, tailY);
                context.stroke();
                drawSparkle(s.x, s.y, 4, fade, "255,255,255");
                if (fade <= 0 || s.x < -50 || s.y > height + 50) {
                    shootingStar = null;
                    nextShootAt = time + (isShared ? 3 : 4) + Math.random() * 6;
                }
            }
            window.requestAnimationFrame(draw);
        }
    }

    let resizeTimer;
    let lastWidth = window.innerWidth;
    window.addEventListener("resize", () => {
        // Trên điện thoại thanh địa chỉ ẩn/hiện gây resize theo chiều cao — chỉ dựng lại khi đổi chiều rộng
        if (window.innerWidth === lastWidth && Math.abs(window.innerHeight - height) < 160) return;
        lastWidth = window.innerWidth;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 150);
    });
    resize();
    if (!reduceMotion) window.requestAnimationFrame(draw);

    if (reduceMotion) return;

    // ===== Hạt lấp lánh dạng DOM (nằm trên nội dung) =====
    const SPARK_CHARS = ["✦", "✧", "★", "✶", "·"];
    const SPARK_COLORS = ["#fff6b0", "#ffc2ec", "#d9c2ff", "#b8e4ff", "#ffffff"];
    const HEART_CHARS = ["♥", "💖", "💗", "♡", "💕"];
    const HEART_COLORS = ["#ff7fbf", "#ff9fd0", "#ffb8dc", "#f78bd6", "#ffd1ea"];

    function spawnSpark(x, y, options = {}) {
        const spark = document.createElement("span");
        const angle = options.angle ?? Math.random() * Math.PI * 2;
        const distance = options.distance ?? 30;
        spark.className = "trail-spark";
        spark.textContent = pick(options.chars || SPARK_CHARS);
        spark.setAttribute("aria-hidden", "true");
        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        spark.style.setProperty("--color", pick(options.colors || SPARK_COLORS));
        spark.style.setProperty("--size", `${(options.size ?? 8) + Math.random() * 10}px`);
        spark.style.setProperty("--dx", `${options.dx ?? Math.cos(angle) * distance}px`);
        spark.style.setProperty("--dy", `${options.dy ?? Math.sin(angle) * distance + distance * 0.4}px`);
        spark.style.setProperty("--rot", `${(Math.random() - 0.5) * 360}deg`);
        spark.style.setProperty("--dur", `${options.duration ?? 900}ms`);
        if (options.delay) spark.style.animationDelay = `${options.delay}ms`;
        spark.addEventListener("animationend", () => spark.remove(), { once: true });
        document.body.append(spark);
    }

    function burst(x, y, count, options = {}) {
        for (let index = 0; index < count; index += 1) {
            spawnSpark(x, y, {
                distance: 30 + Math.random() * 45,
                duration: 700 + Math.random() * 450,
                ...options
            });
        }
    }

    // Vệt sao theo chuột (máy tính)
    let lastTrail = 0;
    window.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        const now = performance.now();
        if (now - lastTrail < 45) return;
        lastTrail = now;
        spawnSpark(event.clientX, event.clientY, {
            distance: 14 + Math.random() * 16,
            duration: 700 + Math.random() * 300
        });
    }, { passive: true });

    // Chạm/bấm → chùm sao (dùng click để không nổ khi đang vuốt cuộn trang, bỏ qua ô nhập liệu)
    document.addEventListener("click", (event) => {
        if (event.detail === 0) return;
        if (event.target.closest("input, select, textarea, label, .profile-form, #heart-button")) return;
        burst(event.clientX, event.clientY, isSmallScreen ? 9 : 12);
    });

    // Nút thả tim: tim bay lên từ nút
    const heartButton = document.querySelector("#heart-button");
    if (heartButton) {
        heartButton.addEventListener("click", () => {
            const rect = heartButton.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            for (let index = 0; index < 16; index += 1) {
                spawnSpark(centerX + (Math.random() - 0.5) * rect.width * 0.7, rect.top + rect.height / 2, {
                    chars: HEART_CHARS,
                    colors: HEART_COLORS,
                    size: 12,
                    dx: (Math.random() - 0.5) * 120,
                    dy: -(140 + Math.random() * 180),
                    duration: 1300 + Math.random() * 700,
                    delay: Math.random() * 250
                });
            }
        });
    }

    // Lưu hồ sơ thành công → pháo sao
    document.addEventListener("profile:saved", () => {
        window.setTimeout(() => {
            const portrait = document.querySelector(".portrait-wrap");
            const rect = (portrait && !portrait.hidden ? portrait : document.querySelector(".profile-card"))
                .getBoundingClientRect();
            burst(rect.left + rect.width / 2, Math.max(40, rect.top + rect.height / 2), 22, { size: 10 });
        }, 450);
    });

    // Trang xem hồ sơ: mưa sao chào đón
    if (isShared) {
        const total = isSmallScreen ? 26 : 40;
        for (let index = 0; index < total; index += 1) {
            spawnSpark(Math.random() * window.innerWidth, -20, {
                size: 10,
                dx: (Math.random() - 0.5) * 80,
                dy: window.innerHeight * (0.45 + Math.random() * 0.5),
                duration: 2200 + Math.random() * 1400,
                delay: 300 + Math.random() * 1600
            });
        }
    }
})();
