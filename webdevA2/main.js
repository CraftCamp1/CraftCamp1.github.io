// values
let score = 0
let baseRate = 0
let clickValue = 1
let speedMult = 1
let magnetChance = 0
let magnetBonus = 0
let clickMultChance = 0
let clickMult = 1
let autoRate = 0
const MAX_LEVELS = {
    cursor: 100,
    coach: 60,
    farm: 50,
    ranch: 40,
    grove: 30,
    factory: 20,
    boots: 25,
    magnet: 15,
    golden: 5,
    auto: 30
};

let clickTimestamps = []

// seeded rng
function lcgMaker(seed) {
    let s = seed % 2147483647
    return function() {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
    }
}

// list of upgrade options
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
]

// prepare upgrade slots
var slots = definitions.map(function(d, i) {
    var obj = {}
    Object.keys(d).forEach(function(key) {
        obj[key] = d[key]
    })
    obj.count = 0
    obj.cost = d.base
    obj.rand = lcgMaker(d.base + i * 12345)
    obj.card = null
    obj.costEl = null
    obj.cntEl = null
    obj.barEl = null
    return obj
})

// grab dom elements
const scoreBox = document.getElementById('scoreBox')
const cpsBox = document.getElementById('cpsBox')
const rateBox = document.getElementById('bananaRate')
const bananaImg = document.getElementById('banana')
const upgradesDiv = document.getElementById('upgrades')
const tooltip = document.getElementById('tooltip') || (function() {
    const t = document.createElement('div')
    t.id = 'tooltip'
    document.body.appendChild(t)
    return t
})()

// render upgrade cards
;
(function buildUpgrades() {
    slots.forEach(function(u) {
        const div = document.createElement('div')
        div.id = u.id
        div.className = 'upgrade disabled'
        div.innerHTML =
            '<span class="css-sprite css-sprite-' + u.id + '" role="img" aria-label="' + u.name + '"></span>' +
            '<div class="name">' + u.name + '</div>' +
            '<div class="cost">Cost: <span class="costVal">' + u.cost.toLocaleString() + '</span></div>' +
            '<div class="owned">Level: <span class="ownVal">0</span></div>' +
            '<div class="progress"><div class="bar"></div></div>'

        upgradesDiv.appendChild(div)
        u.card = div
        u.costDiv = div.querySelector('.cost')
        u.costEl = div.querySelector('.costVal')
        u.cntEl = div.querySelector('.ownVal')
        u.barEl = div.querySelector('.bar')

        div.addEventListener('mouseover', function() {
            tooltip.textContent = u.desc
            tooltip.style.display = 'block'
        })
        div.addEventListener('mousemove', function(e) {
            tooltip.style.left = e.pageX + 12 + 'px'
            tooltip.style.top = e.pageY + 12 + 'px'
        })
        div.addEventListener('mouseout', function() {
            tooltip.style.display = 'none'
        })
    })
})()

// handle upgrade clicks
upgradesDiv.addEventListener('click', function(e) {
    var el = e.target.closest('.upgrade')
    if (!el) return
    var u = slots.find(function(slot) {
        return slot.id === el.id
    })
    if (u && buyUpgrade(u)) {
        playPurchaseSound()
    }
})

// play purchase sound
function playPurchaseSound() {
    const sfx = new Audio('audio/purchase.mp3')
    sfx.play()
}

// add bananas on click
bananaImg.addEventListener('click', function(e) {
    var gain = clickValue
    if (Math.random() < clickMultChance) gain *= clickMult
    score += gain
    clickTimestamps.push(Date.now())
    updateCPS()

    var fb = document.createElement('div')
    fb.className = 'click-feedback'
    fb.textContent = '+' + formatNumber(gain)
    fb.style.left = e.pageX + 'px'
    fb.style.top = e.pageY - 20 + 'px'
    document.body.appendChild(fb)

    setTimeout(function() {
        fb.remove()
    }, 1000)

    updateUI()
})

// prevent drag behavior
bananaImg.addEventListener('mousedown', function(e) {
    e.preventDefault()
})

// update clicks per second
function updateCPS() {
    const now = Date.now()
    clickTimestamps = clickTimestamps.filter(ts => now - ts <= 1000)
    if (cpsBox) cpsBox.textContent = 'CPS: ' + clickTimestamps.length
}

setInterval(updateCPS, 200)

// buy an upgrade and update stats
function buyUpgrade(u) {
    // stop if already at max level
    if (u.count >= MAX_LEVELS[u.id]) return false;

    // stop if not enough score
    if (score < u.cost) return false;

    // apply upgrade
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

    const m = 1.05 + u.rand() * (1.25 - 1.05);
    u.cost = Math.ceil(u.cost * m);
    u.costEl.textContent = u.cost.toLocaleString();
    u.cntEl.textContent = u.count;

    if (u.count >= MAX_LEVELS[u.id]) {
        u.cntEl.textContent = 'MAX';
    } else {
        u.cntEl.textContent = u.count;
    }

    if (u.count >= MAX_LEVELS[u.id]) {
        u.card.classList.add('disabled', 'maxed');
    }

    updateUI();
    return true;
}

function formatNumber(value) {
    const ONE_MILLION = 1000000;
    const ONE_THOUSAND = 1000;

    if (value >= ONE_MILLION) {
        const inMillions = value / ONE_MILLION;
        return inMillions.toFixed(2) + 'M';
    }

    if (value >= ONE_THOUSAND) {
        const inThousands = value / ONE_THOUSAND;
        return inThousands.toFixed(2) + 'K';
    }
    return Math.floor(value).toString();
}

// update score and upgrade availability
function updateUI() {
    scoreBox.textContent = 'Bananas: ' + formatNumber(score);
    rateBox.textContent = 'Rate: ' + formatNumber(baseRate * speedMult + autoRate * clickValue) + '/sec';

    slots.forEach(function(u, i) {
        if (i === 0 || slots[i - 1].count > 0) {
            u.card.style.display = 'block'
        } else {
            u.card.style.display = 'none'
        }

        if (score < u.cost) {
            if (!u.card.classList.contains('disabled')) {
                u.card.classList.add('disabled')
            }
        } else {
            u.card.classList.remove('disabled')
        }

        u.barEl.style.width = Math.min(score / u.cost, 1) * 100 + '%'

        const max = MAX_LEVELS[u.id]
        u.cntEl.textContent = u.count + '/' + max

        if (u.count >= max) {
            u.costDiv.style.display = 'none'
            u.card.classList.add('disabled', 'maxed')
        } else {
            u.costDiv.style.display = ''
            u.card.classList.remove('maxed')
            if (score < u.cost) u.card.classList.add('disabled')
            else u.card.classList.remove('disabled')
        }
    })
}

// reset game to initial state
function resetGame() {
    score = 0
    baseRate = 0
    clickValue = 1
    speedMult = 1
    magnetChance = 0
    magnetBonus = 0
    clickMultChance = 0
    clickMult = 1
    autoRate = 0

    slots.forEach(function(u) {
        u.count = 0
        u.cost = u.base
        u.costEl.textContent = u.cost.toLocaleString()
        u.cntEl.textContent = 0
        u.barEl.style.width = '0%'
    })

    updateUI()
}

// reset button handler
const resetLink = document.getElementById('resetBtn')
if (resetLink) {
    resetLink.addEventListener('click', function(e) {
        e.preventDefault()
        resetGame()
    })
}

// spawn golden banana
setInterval(function() {
    var btn = document.createElement('div')
    btn.className = 'golden'
    btn.textContent = '🍌'
    btn.style.left = 10 + Math.random() * 70 + '%'
    btn.style.top = 10 + Math.random() * 70 + '%'

    btn.onclick = function(e) {
        const reward = Math.floor(Math.random() * (50000 - 1000) + 1000);
        score += reward;

        const fb = document.createElement('div');
        fb.className = 'click-feedback';
        fb.textContent = '+' + formatNumber(reward);
        fb.style.left = e.pageX + 'px';
        fb.style.top = (e.pageY - 20) + 'px';
        document.body.appendChild(fb);

        setTimeout(() => fb.remove(), 1000);

        btn.remove();
        updateUI();
    };

    document.getElementById('game').appendChild(btn)
    setTimeout(function() {
        btn.remove()
    }, 10000)
}, 30000)

// add passive bananas every second
setInterval(function() {
    score += baseRate * speedMult + autoRate * clickValue
    if (Math.random() < magnetChance) score += magnetBonus
    updateUI()
}, 1000)

// fun facts carousel setup
;
(function funFactsCarousel() {
    const section = document.querySelector('#fun-facts')
    if (!section) return

    const list = section.querySelector('.fact-list')
    const items = []
    const children = list.children
    for (let i = 0; i < children.length; i++) {
        items.push(children[i].textContent)
    }

    let idx = Math.floor(Math.random() * items.length)
    const carousel = document.createElement('div')
    carousel.className = 'fact-carousel'
    items.forEach(function(text, i) {
        const f = document.createElement('div')
        if (i === idx) {
            f.className = 'fact active';
        } else {
            f.className = 'fact';
        }
        f.textContent = text
        carousel.appendChild(f)
    })

    section.insertBefore(carousel, list.nextElementSibling)
    list.style.display = 'none'

    const facts = carousel.querySelectorAll('.fact')
    document.getElementById('factRandom').addEventListener('click', function() {
        idx = (Math.random() * facts.length) | 0
        facts.forEach(function(f, j) {
            f.classList.toggle('active', j === idx)
        })
    })
})()

// handle meme form submission
;
(function memeFormHandler() {
    const form = document.getElementById('memeForm')
    const submitBtn = document.getElementById('memeSubmit')
    const output = document.getElementById('memeOutput')
    if (!form || !submitBtn || !output) return

    submitBtn.addEventListener('click', function(e) {
        e.preventDefault()
        if (!form.checkValidity()) return form.reportValidity()

        const data = new FormData(form)
        const title = data.get('memeTitle')
        const desc = data.get('memeDesc')
        const file = data.get('memeFile')
        const category = data.get('memeCategory')
        const tags = data.getAll('tags')
        const visibility = data.get('visibility')
        const source = data.get('memeSource')
        const date = data.get('memeDate')

        output.innerHTML =
            '<h3>your meme submission</h3>' +
            '<p><strong>title:</strong> ' + title + '</p>' +
            '<p><strong>description:</strong> ' + desc + '</p>' +
            '<p><strong>image file:</strong> ' + file.name + '</p>' +
            '<p><strong>category:</strong> ' + category + '</p>' +
            '<p><strong>tags:</strong> ' + (tags.join(', ') || 'none') + '</p>' +
            '<p><strong>visibility:</strong> ' + visibility + '</p>' +
            '<p><strong>source url:</strong> ' + (source || 'n/a') + '</p>' +
            '<p><strong>date created:</strong> ' + date + '</p>'
        output.style.display = 'block'
        form.reset()
    })
})()

// reveal timeline sections on scroll
;
(function timelineScroll() {
    const sections = document.querySelectorAll('#history .story-section')
    if (!sections.length) return

    const anims = ['fade-up', 'slide-left', 'slide-right', 'zoom-in']
    sections.forEach(function(sec, i) {
        sec.classList.add(anims[i % anims.length])
    })

    const obs = new IntersectionObserver(function(entries, o) {
        entries.forEach(function(entry) {
            if (entry.intersectionRatio > 0.3) {
                entry.target.classList.add('active')
                o.unobserve(entry.target)
            }
        })
    }, { threshold: 0.3 })

    sections.forEach(sec => obs.observe(sec))
})()

// toggle sections via nav links
;
(function sectionNav() {
    const links = document.querySelectorAll('#section-buttons a')
    const sections = document.querySelectorAll('main section')

    function showSection(id) {
        sections.forEach(sec => {
            if (sec.id === id) {
                sec.style.display = '';
            } else {
                sec.style.display = 'none';
            }
        })
        links.forEach(link => {
            const target = link.getAttribute('href').slice(1)
            link.classList.toggle('active', target === id)
        })
    }

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault()
            playNavSound()
            showSection(link.getAttribute('href').slice(1))
        })
    })

    if (links.length) {
        showSection(links[0].getAttribute('href').slice(1))
    }
})()

// play navigation click sound
function playNavSound() {
    new Audio('audio/slip.mp3').play()
}

const BGM = new Audio('audio/banana.mp3');
BGM.loop = true;
BGM.volume = 0.6;

document.addEventListener("click", function startMusicOnce() {
    BGM.play().catch(err => console.warn('Autoplay blocked:', err));
    document.removeEventListener("click", startMusicOnce);
});