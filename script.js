import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// إعدادات قاعدة البيانات (جاهزة للعمل فوراً)
const firebaseConfig = {
    databaseURL: "https://cave-gym-db-default-rtdb.firebaseio.com/" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'gym_data');

let members = [];
let finance = { draws: [] };

// جلب البيانات "أونلاين" وتحديث الشاشة تلقائياً
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

// دالة التبديل بين الصفحات
function changePage(pageId, element) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    element.classList.add('active');
    render();
}

// عرض البيانات على الشاشة
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
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:18px;">${m.name}</b>
                    <span style="font-size:12px; font-weight:bold; color:${isExpired ? '#ff4444' : '#00ff88'}">${isExpired ? 'منتهي' : 'فعال'}</span>
                </div>
                <div class="card-btns">
                    <button class="btn-ui btn-info">التفاصيل</button>
                    <button class="btn-ui btn-renew">تجديد</button>
                    <button class="btn-ui btn-del">حذف</button>
                </div>`;
            
            card.querySelector('.btn-info').onclick = () => showInfo(m.id);
            card.querySelector('.btn-renew').onclick = () => renew(m.id);
            card.querySelector('.btn-del').onclick = () => del(m.id);
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

// العمليات الأساسية
function addMember() {
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
    alert("تم الحفظ أونلاين");
    document.querySelectorAll('#add-page input').forEach(i => i.value = "");
    changePage('list-page', document.getElementById('navList'));
}

function renew(id) {
    const m = members.find(x => x.id === id);
    const p = prompt("مبلغ التجديد:", "25000");
    if(p) {
        m.price = parseFloat(p);
        m.expiry = (m.expiry > Date.now() ? m.expiry : Date.now()) + (30*24*60*60*1000);
        sync();
    }
}

function del(id) {
    if(confirm("حذف؟")) { members = members.filter(x => x.id !== id); sync(); }
}

function addDraw() {
    const a = document.getElementById('drawAmount').value;
    if(!a) return;
    finance.draws.unshift({ 
        p: document.getElementById('drawPerson').value, 
        a: a, 
        t: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) 
    });
    document.getElementById('drawAmount').value = "";
    sync();
}

function showInfo(id) {
    const m = members.find(x => x.id === id);
    document.getElementById('in-name').innerText = m.name;
    document.getElementById('in-details').innerHTML = `
        <div class="m-row"><span>رقم الهاتف:</span><b>${m.phone || '---'}</b></div>
        <div class="m-row"><span>اشتراك الشهر:</span><b>${(m.price || 0).toLocaleString()} د.ع</b></div>
        <div class="m-row"><span>تاريخ الانتهاء:</span><b>${new Date(m.expiry).toLocaleDateString('ar-EG')}</b></div>
    `;
    document.getElementById('infoModal').style.display = 'flex';
}

// ربط الأحداث بالأزرار
document.getElementById('saveBtn').onclick = addMember;
document.getElementById('addDrawBtn').onclick = addDraw;
document.getElementById('resetBtn').onclick = () => { if(confirm("تصفير؟")) { finance.draws=[]; members.forEach(m=>m.price=0); sync(); }};
document.getElementById('searchInput').onkeyup = (e) => render(e.target.value);
document.getElementById('navAdd').onclick = function() { changePage('add-page', this) };
document.getElementById('navList').onclick = function() { changePage('list-page', this) };
document.getElementById('navFin').onclick = function() { changePage('finance-page', this) };
