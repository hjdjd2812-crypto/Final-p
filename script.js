import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// إعدادات قاعدة البيانات
const firebaseConfig = {
    databaseURL: "https://cave-gym-db-default-rtdb.firebaseio.com/" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'gym_data');

let members = [];
let finance = { draws: [] };

// جلب البيانات وتحديث الشاشة تلقائياً
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        members = data.members || [];
        finance = data.finance || { draws: [] };
    }
    render();
});

// دالة الحفظ السحابي
function sync() {
    set(dbRef, { members, finance });
}

// جعل الدوال متاحة للـ HTML (حل مشكلة عدم ضغط الأزرار)
window.changePage = function(pageId, element) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (element) element.classList.add('active');
    render();
};

window.addMember = function() {
    const name = document.getElementById('name').value;
    const price = document.getElementById('price').value;
    if(!name || !price) return alert("يرجى ملء الاسم والسعر!");
    
    members.push({
        id: Date.now(),
        name,
        phone: document.getElementById('phone').value,
        weight: document.getElementById('weight').value,
        goal: document.getElementById('goal').value,
        job: document.getElementById('job').value,
        price: parseFloat(price) || 0,
        expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    });
    sync();
    alert("تم تسجيل البطل في الكهف!");
    document.querySelectorAll('#add-page input').forEach(i => i.value = "");
    window.changePage('list-page', document.getElementById('navList'));
};

window.showInfo = function(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    document.getElementById('in-name').innerText = m.name;
    // عرض جميع التفاصيل التي طلبتها
    document.getElementById('in-details').innerHTML = `
        <div class="m-row"><span>رقم الهاتف:</span><b>${m.phone || '---'}</b></div>
        <div class="m-row"><span>الوزن:</span><b>${m.weight || '---'} كغم</b></div>
        <div class="m-row"><span>الهدف:</span><b>${m.goal || '---'}</b></div>
        <div class="m-row"><span>الوظيفة:</span><b>${m.job || '---'}</b></div>
        <div class="m-row"><span>الاشتراك:</span><b>${(m.price || 0).toLocaleString()} د.ع</b></div>
        <div class="m-row"><span>ينتهي في:</span><b>${new Date(m.expiry).toLocaleDateString('ar-EG')}</b></div>
    `;
    document.getElementById('infoModal').style.display = 'flex';
};

window.renew = function(id) {
    const m = members.find(x => x.id === id);
    const p = prompt("مبلغ التجديد:", "25000");
    if(p) {
        m.price = parseFloat(p);
        m.expiry = (m.expiry > Date.now() ? m.expiry : Date.now()) + (30*24*60*60*1000);
        sync();
    }
};

window.del = function(id) {
    if(confirm("هل تريد حذف هذا البطل نهائياً؟")) { 
        members = members.filter(x => x.id !== id); 
        sync(); 
    }
};

window.addDraw = function() {
    const a = document.getElementById('drawAmount').value;
    if(!a) return;
    finance.draws.unshift({ 
        p: document.getElementById('drawPerson').value, 
        a: a, 
        t: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) 
    });
    document.getElementById('drawAmount').value = "";
    sync();
};

window.resetData = function() {
    if(confirm("تنبيه: سيتم تصفير السحوبات وتصفير مبالغ المشتركين لهذا الشهر. هل أنت متأكد؟")) {
        finance.draws = [];
        members.forEach(m => m.price = 0);
        sync();
    }
}

// دالة العرض الأساسية
function render(filter = "") {
    const grid = document.getElementById('membersGrid');
    if(!grid) return;
    grid.innerHTML = '';
    let totalIncome = 0;
    let activeCount = 0;
    const now = new Date().getTime();

    members.forEach(m => {
        const isExpired = m.expiry < now;
        if (!isExpired) activeCount++;
        totalIncome += (m.price || 0);

        if (m.name.includes(filter)) {
            const card = document.createElement('div');
            card.className = 'member-card';
            card.style.borderRight = `5px solid ${isExpired ? '#ff4444' : '#00ff88'}`;
            // استخدام onclick المباشر لأننا ربطنا الدوال بـ window
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:18px;">${m.name}</b>
                    <span style="font-size:12px; font-weight:bold; color:${isExpired ? '#ff4444' : '#00ff88'}">${isExpired ? 'منتهي' : 'فعال'}</span>
                </div>
                <div class="card-btns">
                    <button class="btn-ui btn-info" onclick="showInfo(${m.id})">التفاصيل</button>
                    <button class="btn-ui btn-renew" onclick="renew(${m.id})">تجديد</button>
                    <button class="btn-ui btn-del" onclick="del(${m.id})">حذف</button>
                </div>`;
            grid.appendChild(card);
        }
    });

    let coachTotal = 0, alaaTotal = 0;
    finance.draws.forEach(d => {
        if (d.p === "الكوتش") coachTotal += parseFloat(d.a) || 0;
        else alaaTotal += parseFloat(d.a) || 0;
    });

    document.getElementById('incomeDisp').innerText = totalIncome.toLocaleString() + " د.ع";
    document.getElementById('coachDrawsDisp').innerText = coachTotal.toLocaleString() + " د.ع";
    document.getElementById('alaaDrawsDisp').innerText = alaaTotal.toLocaleString() + " د.ع";
    document.getElementById('totalDisp').innerText = members.length;
    document.getElementById('activeDisp').innerText = activeCount;
    document.getElementById('drawLog').innerHTML = finance.draws.map(d => `
        <div class="m-row"><span>${d.p}: <b>${parseFloat(d.a).toLocaleString()}</b></span><small>${d.t}</small></div>
    `).join('');
}

// ربط أحداث العناصر الأساسية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveBtn').onclick = window.addMember;
    document.getElementById('addDrawBtn').onclick = window.addDraw;
    document.getElementById('resetBtn').onclick = window.resetData;
    document.getElementById('searchInput').onkeyup = (e) => render(e.target.value);
    document.getElementById('navAdd').onclick = function() { window.changePage('add-page', this) };
    document.getElementById('navList').onclick = function() { window.changePage('list-page', this) };
    document.getElementById('navFin').onclick = function() { window.changePage('finance-page', this) };
});
