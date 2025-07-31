// main.js

// ===== STATE =====
let score = 0;
let baseRate = 0;
let clickValue = 1;
let speedMult = 1;
let magnetChance = 0;
let magnetBonus = 0;
let clickMultChance = 0;
let clickMult = 1;
let autoRate = 0;

// ===== UTILITIES =====
function makeLCG(seed) {
    let s = seed % 2147483647;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// ===== UPGRADE DEFINITIONS =====
const definitions = [
    { id: "cursor", name: "Cursor", base: 10, clickAdd: 1, desc: "+1 banana/click" },
    { id: "coach", name: "Click Coach", base: 100, clickAdd: 5, desc: "+5 bananas/click" },
    { id: "farm", name: "Monkey Farm", base: 500, rate: 2, desc: "2 bananas/sec" },
    { id: "ranch", name: "Banana Ranch", base: 2500, rate: 15, desc: "15 bananas/sec" },
    { id: "grove", name: "Banana Grove", base: 10000, rate: 75, desc: "75 bananas/sec" },
    { id: "factory", name: "Banana Factory", base: 50000, rate: 400, desc: "400 bananas/sec" },
    { id: "boots", name: "Speed Boots", base: 15000, speedAdd: 0.1, desc: "+10% passive" },
    { id: "magnet", name: "Banana Magnet", base: 60000, magnet: { chance: 0.25, amount: 40 }, desc: "25% chance +40/sec" },
    { id: "golden", name: "Golden Banana", base: 65000, clickMult: { chance: 0.2, mult: 2 }, desc: "20% chance to double click" },
    { id: "auto", name: "Auto Monkey", base: 120000, autoClicks: 5, desc: "5 auto-clicks/sec" }
];


const slots = definitions.map((d, i) => ({
    ...d,
    count: 0,
    cost: d.base,
    rand: makeLCG(d.base + i * 12345),
    card: null,
    costEl: null,
    cntEl: null,
    barEl: null
}));

// ===== UI REFERENCES =====
const scoreBox = document.getElementById('scoreBox');
const rateBox = document.getElementById('bananaRate');
const bananaImg = document.getElementById('banana');
const upgradesDiv = document.getElementById('upgrades');
const tooltip = document.getElementById('tooltip') || (() => {
    const t = document.createElement('div');
    t.id = 'tooltip';
    document.body.appendChild(t);
    return t;
})();

// ===== BUILD UPGRADE CARDS =====
(function buildUpgrades() {
    slots.forEach(u => {
        const div = document.createElement('div');
        div.id = u.id;
        div.className = 'upgrade disabled';
        div.innerHTML = `
      <img src="${u.id}.png" alt="${u.name}" draggable="false">
      <div class="name">${u.name}</div>
      <div class="cost">Cost: <span class="costVal">${u.cost.toLocaleString()}</span></div>
      <div class="owned">Owned: <span class="ownVal">0</span></div>
      <div class="progress"><div class="bar"></div></div>
    `;
        upgradesDiv.appendChild(div);

        u.card = div;
        u.costEl = div.querySelector('.costVal');
        u.cntEl = div.querySelector('.ownVal');
        u.barEl = div.querySelector('.bar');

        div.addEventListener('mousedown', e => e.preventDefault());
        div.addEventListener('click', () => buyUpgrade(u));
        div.addEventListener('mouseover', () => {
            tooltip.textContent = u.desc;
            tooltip.style.display = 'block';
        });
        div.addEventListener('mousemove', e => {
            tooltip.style.left = e.pageX + 12 + 'px';
            tooltip.style.top = e.pageY + 12 + 'px';
        });
        div.addEventListener('mouseout', () => tooltip.style.display = 'none');
    });
})();

// ===== EVENT HANDLERS =====
// Banana click feedback & logic
bananaImg.addEventListener('click', e => {
    let gain = clickValue;
    if (Math.random() < clickMultChance) gain *= clickMult;
    score += gain;

    // +N feedback at cursor
    const fb = document.createElement('div');
    fb.className = 'click-feedback';
    fb.textContent = '+' + Math.floor(gain);
    fb.style.left = `${e.pageX}px`;
    fb.style.top = `${e.pageY - 20}px`;
    document.body.appendChild(fb);
    setTimeout(() => fb.remove(), 1000);

    updateUI();
});
bananaImg.addEventListener('mousedown', e => e.preventDefault());

// ===== CORE FUNCTIONS =====
function buyUpgrade(u) {
    if (score < u.cost) return;
    score -= u.cost;
    u.count++;

    if (u.rate) baseRate += u.rate;
    if (u.clickAdd) clickValue += u.clickAdd;
    if (u.speedAdd) speedMult += u.speedAdd;
    if (u.magnet) {
        magnetChance += u.magnet.chance;
        magnetBonus = u.magnet.amount;
    }
    if (u.clickMult) {
        clickMultChance += u.clickMult.chance;
        clickMult = u.clickMult.mult;
    }
    if (u.autoClicks) autoRate += u.autoClicks;

    // scale cost
    const m = 1.05 + u.rand() * (1.25 - 1.05);
    u.cost = Math.ceil(u.cost * m);
    u.costEl.textContent = u.cost.toLocaleString();
    u.cntEl.textContent = u.count;

    updateUI();
}

function updateUI() {
    scoreBox.textContent = `Bananas: ${Math.floor(score)}`;
    rateBox.textContent = `Rate: ${Math.floor(baseRate * speedMult + autoRate * clickValue)}/sec`;

    slots.forEach((u, i) => {
        u.card.style.display = (i === 0 || slots[i - 1].count > 0) ? 'block' : 'none';
        u.card.classList.toggle('disabled', score < u.cost);
        u.barEl.style.width = Math.min(score / u.cost, 1) * 100 + '%';
    });
}

// ===== GAME LOOPS =====
// Golden bananas every 2 min
setInterval(() => {
    const btn = document.createElement('div');
    btn.textContent = '🍌';
    btn.className = 'golden';
    btn.style.left = Math.random() * 80 + '%';
    btn.style.top = Math.random() * 80 + '%';
    btn.onclick = () => {
        score += 10000;
        btn.remove();
        updateUI();
    };
    document.querySelector('.container').appendChild(btn);
    setTimeout(() => btn.remove(), 10000);
}, 2 * 60000);

// Passive generation every second
setInterval(() => {
    score += baseRate * speedMult + autoRate * clickValue;
    if (Math.random() < magnetChance) score += magnetBonus;
    updateUI();
}, 1000);

// ===== SECTION NAVIGATION =====
;
(function sectionNav() {
    const btns = document.querySelectorAll('#section-buttons button');
    const secs = document.querySelectorAll('main section');

    function showSection(id) {
        secs.forEach(s => s.style.display = (s.id === id ? '' : 'none'));
        btns.forEach(b => b.classList.toggle('active', b.dataset.target === id));
    }
    btns.forEach(b => b.addEventListener('click', () => showSection(b.dataset.target)));
    showSection(btns[0].dataset.target);
})();

// ===== HISTORY SLIDESHOW =====
;
(function historySlideshow() {
    const slides = document.querySelectorAll('#history .slide');
    const dots = document.querySelectorAll('#history .dot');
    const cont = document.querySelector('.history-slideshow');
    let idx = 0,
        interval, xStart = null;

    function show(i) {
        slides.forEach((s, j) => s.classList.toggle('active', j === i));
        dots.forEach((d, j) => d.classList.toggle('active', j === i));
        idx = i;
    }

    function next() { show((idx + 1) % slides.length); }

    function prev() { show((idx - 1 + slides.length) % slides.length); }

    function resetAuto() {
        clearInterval(interval);
        startAuto();
    }

    function startAuto() {
        interval = setInterval(next, 10000);
    }

    // interactions
    dots.forEach(d => d.addEventListener('click', () => {
        show(+d.dataset.index);
        resetAuto();
    }));
    document.addEventListener('keydown', e => {
        if (!document.querySelector('#history').offsetParent) return;
        if (e.key === 'ArrowRight') {
            next();
            resetAuto();
        }
        if (e.key === 'ArrowLeft') {
            prev();
            resetAuto();
        }
    });
    cont.addEventListener('touchstart', e => xStart = e.touches[0].clientX);
    cont.addEventListener('touchend', e => {
        if (!xStart) return;
        const dx = e.changedTouches[0].clientX - xStart;
        if (dx > 50) {
            prev();
            resetAuto();
        }
        if (dx < -50) {
            next();
            resetAuto();
        }
        xStart = null;
    });
    cont.addEventListener('mouseenter', () => clearInterval(interval));
    cont.addEventListener('mouseleave', startAuto);

    // start
    show(0);
    startAuto();
})();

// — FUN-FACTS CAROUSEL —
;
(function funFactsCarousel() {
    const section = document.querySelector('#fun-facts');
    const list = section.querySelector('.fact-list');
    const items = Array.from(list.children).map(li => li.textContent);

    // build carousel container
    const carousel = document.createElement('div');
    carousel.className = 'fact-carousel';
    items.forEach((text, i) => {
        const f = document.createElement('div');
        f.className = 'fact' + (i === 0 ? ' active' : '');
        f.textContent = text;
        carousel.appendChild(f);
    });
    section.insertBefore(carousel, list.nextElementSibling);
    list.style.display = 'none';

    // control buttons
    const randBtn = document.getElementById('factRandom');
    const facts = carousel.querySelectorAll('.fact');
    let idx = 0;

    function show(i) {
        idx = (i + facts.length) % facts.length;
        facts.forEach((f, j) => f.classList.toggle('active', j === idx));
    }

    randBtn.addEventListener('click', () => show(Math.floor(Math.random() * facts.length)));
})();