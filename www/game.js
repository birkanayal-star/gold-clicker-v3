const firebaseConfig = {// Ekran kapanmasını engelle
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                requestWakeLock();
            });
        }
    } catch (e) {}
}
requestWakeLock();
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        requestWakeLock();
    }
});
    apiKey: "AIzaSyB3DgeOTZMHClqzRsKuhnxBVDNaVUq9RHk",
    authDomain: "gold-clicker-bf955.firebaseapp.com",
    databaseURL: "https://gold-clicker-bf955-default-rtdb.firebaseio.com",
    projectId: "gold-clicker-bf955",
    storageBucket: "gold-clicker-bf955.firebasestorage.app",
    messagingSenderId: "44920202750",
    appId: "1:44920202750:web:d827228faaf585d72d4caf"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let gold = 0;
let goldPerClick = 1;
let goldPerSec = 0;
let boostActive = false;
let boostTimer = 0;
let boostInterval = null;
let playerName = localStorage.getItem('playerName') || null;

const clickUpgrades = [
    { id: 'cu1', name: 'Altın Eldiven', icon: '🧤', desc: 'Tıklama gücü +2', baseCost: 50, costMult: 2.5, level: 0, maxLevel: 20, effect: () => { goldPerClick += 2; } },
    { id: 'cu2', name: 'Altın Kazma', icon: '⛏️', desc: 'Tıklama gücü +5', baseCost: 200, costMult: 3.0, level: 0, maxLevel: 15, effect: () => { goldPerClick += 5; } },
    { id: 'cu3', name: 'Elmas Kazma', icon: '💎', desc: 'Tıklama gücü +15', baseCost: 1000, costMult: 3.5, level: 0, maxLevel: 10, effect: () => { goldPerClick += 15; } },
    { id: 'cu4', name: 'Efsanevi Kazma', icon: '🔱', desc: 'Tıklama gücü +50', baseCost: 8000, costMult: 4.0, level: 0, maxLevel: 8, effect: () => { goldPerClick += 50; } },
    { id: 'cu5', name: 'Tanrı Darbesi', icon: '⚡', desc: 'Tıklama gücü +200', baseCost: 50000, costMult: 5.0, level: 0, maxLevel: 5, effect: () => { goldPerClick += 200; } },
];

const botUpgrades = [
    { id: 'bu1', name: 'Bakır Madenci', icon: '👷', desc: '+1 altın/sn', baseCost: 100, costMult: 3.0, level: 0, maxLevel: 25, gps: 1 },
    { id: 'bu2', name: 'Demir Madenci', icon: '⚙️', desc: '+3 altın/sn', baseCost: 900, costMult: 4.5, level: 0, maxLevel: 20, gps: 3 },
    { id: 'bu3', name: 'Gümüş Madenci', icon: '🔧', desc: '+8 altın/sn', baseCost: 3200, costMult: 6.0, level: 0, maxLevel: 15, gps: 8 },
    { id: 'bu4', name: 'Altın Madenci', icon: '🏗️', desc: '+25 altın/sn', baseCost: 20000, costMult: 5.0, level: 0, maxLevel: 12, gps: 25 },
    { id: 'bu5', name: 'Elmas Madenci', icon: '💠', desc: '+80 altın/sn', baseCost: 90000, costMult: 6.0, level: 0, maxLevel: 10, gps: 80 },
    { id: 'bu6', name: 'Efsanevi Robot', icon: '🤖', desc: '+300 altın/sn', baseCost: 500000, costMult: 7.0, level: 0, maxLevel: 8, gps: 300 },
    { id: 'bu7', name: 'Uzay Madeni', icon: '🚀', desc: '+1000 altın/sn', baseCost: 3000000, costMult: 8.0, level: 0, maxLevel: 5, gps: 1000 },
];

function getCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.level));
}

function formatGold(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
}

function renderClickUpgrades() {
    const container = document.getElementById('click-upgrades');
    container.innerHTML = '';
    clickUpgrades.forEach(u => {
        const cost = getCost(u);
        const canBuy = gold >= cost && u.level < u.maxLevel;
        const maxed = u.level >= u.maxLevel;
        const div = document.createElement('div');
        div.className = 'upgrade-card' + (canBuy ? '' : ' disabled');
        div.innerHTML = `
            <div class="upgrade-icon">${u.icon}</div>
            <div class="upgrade-info">
                <div class="upgrade-name">${u.name}</div>
                <div class="upgrade-desc">${u.desc}</div>
                <div class="upgrade-level">Seviye: ${u.level}/${u.maxLevel}</div>
            </div>
            <div class="upgrade-cost">${maxed ? '✅ MAX' : '🪙 ' + formatGold(cost)}</div>
        `;
        if (canBuy) {
            div.addEventListener('click', () => {
                gold -= cost;
                u.level++;
                u.effect();
                saveGame();
                renderAll();
            });
        }
        container.appendChild(div);
    });
}

function renderBotUpgrades() {
    const container = document.getElementById('bot-upgrades');
    container.innerHTML = '';
    botUpgrades.forEach(u => {
        const cost = getCost(u);
        const canBuy = gold >= cost && u.level < u.maxLevel;
        const maxed = u.level >= u.maxLevel;
        const div = document.createElement('div');
        div.className = 'bot-card' + (canBuy ? '' : ' disabled');
        div.innerHTML = `
            <div class="upgrade-icon">${u.icon}</div>
            <div class="upgrade-info">
                <div class="upgrade-name">${u.name}</div>
                <div class="upgrade-desc">${u.desc}</div>
                <div class="upgrade-level">Seviye: ${u.level}/${u.maxLevel}</div>
            </div>
            <div class="upgrade-cost">${maxed ? '✅ MAX' : '🪙 ' + formatGold(cost)}</div>
        `;
        if (canBuy) {
            div.addEventListener('click', () => {
                gold -= cost;
                u.level++;
                goldPerSec += u.gps;
                saveGame();
                renderAll();
            });
        }
        container.appendChild(div);
    });
}

function renderAll() {
    document.getElementById('gold-amount').textContent = formatGold(gold);
    document.getElementById('gold-per-sec').textContent = '+' + formatGold(boostActive ? goldPerSec * 2 : goldPerSec) + ' altın/sn';
    document.getElementById('click-info').textContent = 'Tıklama başına: ' + formatGold(boostActive ? goldPerClick * 2 : goldPerClick) + ' altın';
    renderClickUpgrades();
    renderBotUpgrades();
}

document.getElementById('click-btn').addEventListener('click', (e) => {
    const earned = boostActive ? goldPerClick * 2 : goldPerClick;
    gold += earned;

    const span = document.createElement('div');
    span.className = 'float-text';
    span.textContent = '+' + formatGold(earned);
    span.style.left = (e.clientX - 20) + 'px';
    span.style.top = (e.clientY - 20) + 'px';
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 1000);

    renderAll();
    saveGame();
});

document.getElementById('boost-btn').addEventListener('click', () => {
    if (boostActive) return;
    simulateAd(() => {
        activateBoost(300);
    });
});

function simulateAd(callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.92); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white;
    `;
    let sec = 5;
    overlay.innerHTML = `
        <div style="font-size:4rem">📺</div>
        <div style="font-size:1.3rem;margin:15px 0">Reklam izleniyor...</div>
        <div id="ad-countdown" style="font-size:3rem;color:#ffd700;font-weight:bold">${sec}</div>
        <div style="font-size:0.85rem;color:#aaa;margin-top:15px">Reklam bittikten sonra otomatik kapanır</div>
        <div style="margin-top:20px;font-size:0.9rem;color:#667eea">⚡ 2x Hız ödülü kazanıyorsun!</div>
    `;
    document.body.appendChild(overlay);

    const interval = setInterval(() => {
        sec--;
        const cd = document.getElementById('ad-countdown');
        if (cd) cd.textContent = sec;
        if (sec <= 0) {
            clearInterval(interval);
            overlay.remove();
            callback();
        }
    }, 1000);
}

function activateBoost(seconds) {
    boostActive = true;
    boostTimer = seconds;
    document.getElementById('boost-btn').disabled = true;
    document.getElementById('boost-btn').style.opacity = '0.5';
    document.getElementById('boost-active').style.display = 'block';

    if (boostInterval) clearInterval(boostInterval);
    boostInterval = setInterval(() => {
        boostTimer--;
        document.getElementById('boost-countdown').textContent = boostTimer + 'sn';
        if (boostTimer <= 0) {
            boostActive = false;
            clearInterval(boostInterval);
            document.getElementById('boost-btn').disabled = false;
            document.getElementById('boost-btn').style.opacity = '1';
            document.getElementById('boost-active').style.display = 'none';
            renderAll();
        }
    }, 1000);
    renderAll();
}

setInterval(() => {
    if (goldPerSec > 0) {
        const earned = boostActive ? goldPerSec * 2 : goldPerSec;
        gold += earned;
        renderAll();
        saveGame();
    }
}, 1000);

function loadLeaderboard() {
    db.ref('leaderboard').orderByValue().limitToLast(10).on('value', snap => {
        const data = snap.val();
        if (!data) return;
        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const lb = document.getElementById('leaderboard');
        lb.innerHTML = sorted.map((entry, i) => `
            <div class="lb-row">
                <span class="lb-rank">${medals[i] || (i+1)}</span>
                <span class="lb-name">${entry[0]}</span>
                <span class="lb-score">${formatGold(entry[1])}</span>
            </div>
        `).join('');
    });
}

function saveToLeaderboard() {
    if (!playerName) {
        playerName = prompt('Liderlik tablosu için adını gir:');
        if (!playerName) return;
        localStorage.setItem('playerName', playerName);
    }
    db.ref('leaderboard/' + playerName).set(Math.floor(gold));
}

function saveGame() {
    const state = {
        gold, goldPerClick, goldPerSec,
        clickUpgrades: clickUpgrades.map(u => u.level),
        botUpgrades: botUpgrades.map(u => u.level)
    };
    localStorage.setItem('goldClickerV3', JSON.stringify(state));
    saveToLeaderboard();
}

function loadGame() {
    const saved = localStorage.getItem('goldClickerV3');
    if (!saved) return;
    const state = JSON.parse(saved);
    gold = state.gold || 0;
    goldPerClick = state.goldPerClick || 1;
    goldPerSec = state.goldPerSec || 0;
    if (state.clickUpgrades) {
        state.clickUpgrades.forEach((level, i) => {
            if (clickUpgrades[i]) clickUpgrades[i].level = level;
        });
    }
    if (state.botUpgrades) {
        state.botUpgrades.forEach((level, i) => {
            if (botUpgrades[i]) botUpgrades[i].level = level;
        });
    }
}
// REWARDED INTERSTITIAL - Her 3 dakikada bir
setInterval(() => {
    showRewardedInterstitial();
}, 3 * 60 * 1000);

function showRewardedInterstitial() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.92); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white;
    `;
    let sec = 15;
    overlay.innerHTML = `
        <div style="font-size:4rem">📺</div>
        <div style="font-size:1.3rem;margin:15px 0">Reklam izleniyor...</div>
        <div id="ri-countdown" style="font-size:3rem;color:#ffd700;font-weight:bold">${sec}</div>
        <div style="font-size:0.85rem;color:#aaa;margin-top:15px">Otomatik kapanacak</div>
        <div style="margin-top:10px;font-size:0.9rem;color:#2ecc71">🎁 +500 altın kazanıyorsun!</div>
    `;
    document.body.appendChild(overlay);

    const interval = setInterval(() => {
        sec--;
        const cd = document.getElementById('ri-countdown');
        if (cd) cd.textContent = sec;
        if (sec <= 0) {
            clearInterval(interval);
            overlay.remove();
            gold += 500;
            renderAll();
            saveGame();
        }
    }, 1000);
}
loadGame();
renderAll();
loadLeaderboard();