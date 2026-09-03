
const schedule = [
  "Lundi 20:00–22:30 • JJB Adultes",
  "Mardi 18:00–19:00 • Kids débutants",
  "Mardi 19:00–20:00 • Kids 2 intermédiaires",
  "Mercredi 20:00–22:30 • JJB Adultes",
  "Vendredi 18:00–18:50 • BJJ Kids 1 débutants",
  "Vendredi 19:00–20:00 • Kids 2 intermédiaires",
  "Samedi 10:00–11:00 • Grappling",
  "Samedi 11:00–12:00 • 100% Women",
  "Dimanche 12:00–13:30 • JJB Adultes"
];

const defaults = {
  members:[
    {id:"1",firstName:"Amine",lastName:"B.",section:"Adultes",belt:"Blanche",stripes:2},
    {id:"2",firstName:"Sofia",lastName:"M.",section:"100% Women",belt:"Bleue",stripes:1},
    {id:"3",firstName:"Noah",lastName:"K.",section:"Kids / Ados",belt:"Grise",stripes:3},
    {id:"4",firstName:"Lucas",lastName:"R.",section:"Compétiteurs",belt:"Violette",stripes:0}
  ],
  attendance:[],
  competitions:[
    {id:"c1",date:"2026-10-11",name:"Open Île-de-France",place:"Paris"},
    {id:"c2",date:"2026-11-22",name:"Challenge régional",place:"Île-de-France"}
  ]
};

const firebasePreset = {
  apiKey: "AIzaSyDWJXqKNdnbnYnvQesx5nv2oaxjyEPnFyk",
  authDomain: "gfa-chek-in.firebaseapp.com",
  projectId: "gfa-chek-in",
  storageBucket: "gfa-chek-in.firebasestorage.app",
  messagingSenderId: "17301115107",
  appId: "1:17301115107:web:cf1757811f2c88aa5b35d6"
};

const state = {
  mode:"local",
  role:"admin",
  user:{name:"Coach principal"},
  members: JSON.parse(localStorage.getItem("gfa_v2_members")||"null") || defaults.members,
  attendance: JSON.parse(localStorage.getItem("gfa_v2_attendance")||"null") || defaults.attendance,
  competitions: JSON.parse(localStorage.getItem("gfa_v2_competitions")||"null") || defaults.competitions,
  registrations: [],
  firebaseConfig: JSON.parse(localStorage.getItem("gfa_v2_firebase")||"null") || firebasePreset
};


if (!localStorage.getItem("gfa_v2_firebase")) {
  localStorage.setItem("gfa_v2_firebase", JSON.stringify(firebasePreset));
}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const saveLocal=()=>{
  localStorage.setItem("gfa_v2_members",JSON.stringify(state.members));
  localStorage.setItem("gfa_v2_attendance",JSON.stringify(state.attendance));
  localStorage.setItem("gfa_v2_competitions",JSON.stringify(state.competitions));
};
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(d));

async function initFirebase(){
  if(!state.firebaseConfig?.apiKey || !state.firebaseConfig?.projectId) {
    $("#loginView").classList.add("hidden");
    return false;
  }
  try{
    const appMod=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authMod=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const fsMod=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    state.fbApp=appMod.initializeApp(state.firebaseConfig);
    state.auth=authMod.getAuth(state.fbApp);
    state.authMod=authMod;
    state.db=fsMod.getFirestore(state.fbApp);
    state.fsMod=fsMod;
    state.mode="firebase";

    $("#connectionBadge").textContent="Firebase prêt";
    $("#connectionBadge").className="badge warning";

    authMod.onAuthStateChanged(state.auth, async user=>{
      if(user){
        state.user={name:user.email || "Coach principal"};
        state.role="admin";
        $("#loginView").classList.add("hidden");
        $("#connectionBadge").textContent="Firebase connecté";
        $("#connectionBadge").className="badge success";
        try{
          await loadCloudData();
        }catch(e){
          console.error(e);
          $("#connectionBadge").textContent="Erreur Firestore";
          alert("Connexion réussie, mais Firestore refuse l'accès. Vérifie les règles Firestore.");
        }
        renderAll();
      }else{
        $("#loginView").classList.remove("hidden");
        $("#connectionBadge").textContent="Connexion requise";
        $("#connectionBadge").className="badge warning";
      }
    });
    return true;
  }catch(e){
    console.error(e);
    $("#connectionBadge").textContent="Firebase non disponible";
    $("#loginView").classList.remove("hidden");
    $("#loginMessage").textContent="Impossible de charger Firebase. Recharge la page.";
    return false;
  }
}
async function loadCloudData(){
  if(state.mode!=="firebase") return;
  const {collection,getDocs}=state.fsMod;
  const mem=await getDocs(collection(state.db,"members"));
  const att=await getDocs(collection(state.db,"attendance"));
  const cmp=await getDocs(collection(state.db,"competitions"));const reg = await getDocs(collection(state.db,"registrations"));
  if(!mem.empty) state.members=mem.docs.map(d=>({id:d.id,...d.data()}));
  if(!att.empty) state.attendance=att.docs.map(d=>({id:d.id,...d.data()}));
  if(!cmp.empty) state.competitions=cmp.docs.map(d=>({id:d.id,...d.data()}));if(!reg.empty) 
    state.registrations=reg.docs.map(d=>({id:d.id,...d.data()}));
  renderAll();
}
async function addCloud(collectionName,data){
  if(state.mode!=="firebase") return null;
  const {collection,addDoc}=state.fsMod;
  const ref=await addDoc(collection(state.db,collectionName),data);
  return ref.id;
}async function updateCloud(collectionName, id, data){
  if(state.mode!=="firebase") return;
  const {doc, updateDoc}=state.fsMod;
  await updateDoc(doc(state.db, collectionName, id), data);
}

function applyRole(){
  $$(".admin").forEach(el=>el.classList.toggle("hidden",state.role!=="admin"));
  $$(".coach").forEach(el=>el.classList.toggle("hidden",state.role==="member"));
  $("#userName").textContent=state.user.name;
  $("#userRole").textContent=state.role==="admin"?"Administrateur":state.role==="assistant"?"Coach assistant":"Adhérent";
}
function renderStats(){
  const todayCount=state.attendance.filter(a=>a.date===today()).length;
  const cards=[
    ["Adhérents",state.members.length],
    ["Présents aujourd’hui",todayCount],
    ["Pointages",state.attendance.length],
    ["Compétitions",state.competitions.length]
  ];
  $("#stats").innerHTML=cards.map(([l,n])=>`<div class="card stat"><strong>${n}</strong><span>${l}</span></div>`).join("");
}
function renderToday(){
  const list=state.attendance.filter(a=>a.date===today()).slice().reverse();
  $("#todayList").innerHTML=list.length?list.map(a=>`<div class="list-item"><b>${a.name}</b><span>${a.section}</span></div>`).join(""):`<p class="muted">Aucun pointage aujourd’hui.</p>`;
}
function renderEvents(){
  const list=state.competitions.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  $("#nextEvents").innerHTML=list.map(c=>`<div class="list-item"><b>${c.name}</b><span>${fmt(c.date)}</span></div>`).join("");
}
function renderMembers(){
  const q = $("#memberSearch").value.toLowerCase();
  const f = $("#memberSectionFilter").value;

  const list = state.members.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) &&
    (!f || m.section === f)
  );

  $("#membersGrid").innerHTML = list.map(m => `
    <div class="member-card">
      <h4>${m.firstName} ${m.lastName}</h4>
      <p>${m.section}</p>
      <div class="belt-info">
        <span>${m.belt || "Blanche"}</span>
        <span>${m.stripes || 0}/4 barrettes</span>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("#membersGrid .member-card").forEach((card,index)=>{
    card.addEventListener("click",()=>openMemberDetails(list[index]));
  });

  $("#checkinMember").innerHTML = state.members
    .map(m => `<option value="${m.id}">${m.firstName} ${m.lastName}</option>`)
    .join("");
}

function renderAttendance(){
  $("#attendanceBody").innerHTML=state.attendance.slice().reverse().map(a=>`<tr><td>${fmt(a.date)}</td><td>${a.name}</td><td>${a.section}</td><td>${a.className}</td></tr>`).join("");
}
function renderGrades(){
  $("#gradesGrid").innerHTML=state.members.map(m=>`<div class="member-card"><h4>${m.firstName} ${m.lastName}</h4><p>${m.section}</p><div class="belt belt-${m.belt}"></div><div class="meta"><span>${m.belt}</span><span>${m.stripes||0}/4</span></div></div>`).join("");
}
function renderCompetitions(){
  $("#competitionList").innerHTML=state.competitions.map(c=>`<div class="event"><strong>${fmt(c.date)}</strong><div><b>${c.name}</b><p>${c.place||""}</p></div><span class="badge warning">À venir</span></div>`).join("");
}function renderRegistrations(){
  const grid = $("#registrationsGrid");
  if(!grid) return;

  const list = (state.registrations || []).filter(r => r.status !== "rejected");

  if(!list.length){
    grid.innerHTML = `<div class="card"><p>Aucune nouvelle inscription.</p></div>`;
    return;
  }

  grid.innerHTML = list.map(r => `
    <div class="member-card">
      <h4>${r.firstName || ""} ${r.lastName || ""}</h4>
      <p>${r.section || ""}</p>
      <p><strong>Téléphone :</strong> ${r.phone || ""}</p>
      <p><strong>Email :</strong> ${r.email || ""}</p>
      <p><strong>Adresse :</strong> ${r.address || ""}</p>
      <p><strong>Urgence :</strong> ${r.emergency || ""}</p>
      <p><strong>Tél. urgence :</strong> ${r.emergencyPhone || ""}</p>
      <div class="toolbar">
       <button type="button" class="primary" data-accept-registration="${r.id}">Accepter</button>
<button type="button" class="secondary" data-reject-registration="${r.id}">Refuser</button>
      </div>
    </div>
  `).join("");
}
function renderAll(){renderStats();renderToday();renderEvents();renderMembers();renderAttendance();renderGrades();renderCompetitions();renderRegistrations();applyRole()}
$$(".nav").forEach(b=>b.addEventListener("click",()=>{
  if(b.classList.contains("hidden")) return;
  $$(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#"+b.dataset.view).classList.add("active");$("#title").textContent=b.textContent;
}));

$("#memberSearch").addEventListener("input",renderMembers);
$("#memberSectionFilter").addEventListener("change",renderMembers);

$("#addMemberBtn").addEventListener("click",()=>$("#memberModal").showModal());
$("#closeMemberModal").addEventListener("click",()=>$("#memberModal").close());
$("#cancelMember").addEventListener("click",()=>$("#memberModal").close());
$("#memberForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const submitBtn=e.target.querySelector('button[type="submit"], button:not([type])');
  const oldText=submitBtn?.textContent || "Enregistrer";
  if(submitBtn){submitBtn.disabled=true;submitBtn.textContent="Enregistrement...";}
  try{
    const data=Object.fromEntries(new FormData(e.target));
    delete data.medicalCertificate;
    data.stripes=Number(data.stripes||0);
   const localId=crypto.randomUUID();

if(state.mode==="firebase"){
  if(!state.auth?.currentUser){
    throw new Error("Vous devez être connecté avant d'enregistrer un adhérent.");
  }

  if(selectedMemberId){
    await updateCloud("members", selectedMemberId, data);
    state.members = state.members.map(m =>
      m.id === selectedMemberId ? {id:m.id,...data} : m
    );
  } else {
    const id=await addCloud("members",data);
    state.members.push({id,...data});
  }
} else {
  if(selectedMemberId){
    state.members = state.members.map(m =>
      m.id === selectedMemberId ? {id:m.id,...data} : m
    );
  } else {
    state.members.push({id:localId,...data});
  }
}

selectedMemberId = null;

    saveLocal();
    e.target.reset();
    $("#memberModal").close();
    renderAll();
  }catch(err){
    console.error(err);
    alert("Enregistrement impossible : " + (err?.message || "erreur inconnue"));
  }finally{
    if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=oldText;}
  }
});

$("#checkinClass").innerHTML=schedule.map(s=>`<option>${s}</option>`).join("");
$("#checkinSubmit").addEventListener("click",async()=>{
  const id=$("#checkinMember").value, m=state.members.find(x=>x.id===id);
  if(!m) return;
  if(state.attendance.some(a=>a.memberId===id&&a.date===today())){
    $("#checkinMsg").textContent="Présence déjà enregistrée aujourd’hui."; $("#checkinMsg").className="message"; return;
  }
  const data={memberId:id,name:`${m.firstName} ${m.lastName}`,section:$("#checkinSection").value,className:$("#checkinClass").value,date:today(),createdAt:new Date().toISOString()};
  if(state.mode==="firebase"){const rid=await addCloud("attendance",data);state.attendance.push({id:rid,...data})}
  else state.attendance.push({id:crypto.randomUUID(),...data});
  saveLocal(); renderAll(); $("#checkinMsg").textContent="Présence enregistrée ✓"; $("#checkinMsg").className="message ok";
});

$("#addCompetitionBtn").addEventListener("click",async()=>{
  const name=prompt("Nom de la compétition :"); if(!name)return;
  const date=prompt("Date (AAAA-MM-JJ) :"); if(!date)return;
  const place=prompt("Lieu :")||"";
  const data={name,date,place};
  if(state.mode==="firebase"){const id=await addCloud("competitions",data);state.competitions.push({id,...data})}
  else state.competitions.push({id:crypto.randomUUID(),...data});
  saveLocal();renderAll();
});

$("#exportBtn").addEventListener("click",()=>{
  const rows=[["Date","Nom","Section","Cours"],...state.attendance.map(a=>[a.date,a.name,a.section,a.className])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=u;a.download="gfa-presences.csv";a.click();URL.revokeObjectURL(u);
});

$("#saveFirebaseBtn").addEventListener("click",async()=>{
  const cfg={
    apiKey:$("#fbApiKey").value.trim(),authDomain:$("#fbAuthDomain").value.trim(),projectId:$("#fbProjectId").value.trim(),
    storageBucket:$("#fbStorageBucket").value.trim(),messagingSenderId:$("#fbMessagingSenderId").value.trim(),appId:$("#fbAppId").value.trim()
  };
  localStorage.setItem("gfa_v2_firebase",JSON.stringify(cfg));state.firebaseConfig=cfg;
  $("#firebaseMsg").textContent="Configuration enregistrée. Recharge la page pour activer Firebase.";$("#firebaseMsg").className="message ok";
});

$("#demoBtn").addEventListener("click",()=>{state.mode="local";$("#loginView").classList.add("hidden");state.role="admin";$("#connectionBadge").textContent="Mode démo local";$("#connectionBadge").className="badge warning";renderAll()});
$("#loginBtn").addEventListener("click",async()=>{
  if(state.mode!=="firebase"){ $("#loginMessage").textContent="Configure Firebase dans Paramètres ou utilise le mode démo."; return; }
  try{
    const cred=await state.authMod.signInWithEmailAndPassword(state.auth,$("#loginEmail").value,$("#loginPassword").value);
    state.user={name:cred.user.email}; state.role="admin"; $("#loginView").classList.add("hidden");renderAll();
  }catch(e){$("#loginMessage").textContent="Connexion impossible : "+e.message}
});
$("#logoutBtn").addEventListener("click",async()=>{
  if(state.mode==="firebase"&&state.auth) await state.authMod.signOut(state.auth);
  $("#loginView").classList.remove("hidden");
});

if(state.firebaseConfig){
  ["ApiKey","AuthDomain","ProjectId","StorageBucket","MessagingSenderId","AppId"].forEach(k=>{
    const prop=k[0].toLowerCase()+k.slice(1); const el=$("#fb"+k); if(el) el.value=state.firebaseConfig[prop]||"";
  });
}
// Fiche adhérent
let selectedMemberId = null;

function openMemberDetails(member) {
  selectedMemberId = member.id;

  $("#memberDetailsContent").innerHTML = `
    <p><strong>Nom :</strong> ${member.lastName || ""}</p>
    <p><strong>Prénom :</strong> ${member.firstName || ""}</p>
    <p><strong>Section :</strong> ${member.section || ""}</p>
    <p><strong>Grade :</strong> ${member.belt || ""}</p>
    <p><strong>Barrettes :</strong> ${member.stripes || 0}</p>
    <p><strong>Téléphone :</strong> ${member.phone || ""}</p>
    <p><strong>Email :</strong> ${member.email || ""}</p>
    <p><strong>Adresse :</strong> ${member.address || ""}</p>
    <p><strong>Urgence :</strong> ${member.emergency || ""}</p>
    <p><strong>Téléphone urgence :</strong> ${member.emergencyPhone || ""}</p>
    <p><strong>Certificat médical :</strong> ${member.medicalCertificateToProvide ? "À fournir au club" : "Non renseigné"}</p>
  `;

  $("#memberDetailsModal").showModal();
}

$("#closeMemberDetails").addEventListener("click", () => {
  $("#memberDetailsModal").close();
});

$("#editMemberBtn").addEventListener("click", () => {
  if (!selectedMemberId) return;

  const member = state.members.find(m => m.id === selectedMemberId);
  if (!member) return;

  const form = $("#memberForm");

  form.elements["firstName"].value = member.firstName || "";
  form.elements["lastName"].value = member.lastName || "";
  form.elements["birthDate"].value = member.birthDate || "";
  form.elements["section"].value = member.section || "Adultes";
  form.elements["belt"].value = member.belt || "Blanche";
  form.elements["stripes"].value = member.stripes || 0;
  form.elements["phone"].value = member.phone || "";
  form.elements["email"].value = member.email || "";
  form.elements["address"].value = member.address || "";
  form.elements["emergency"].value = member.emergency || "";
  form.elements["emergencyPhone"].value = member.emergencyPhone || "";

  $("#memberDetailsModal").close();
  $("#memberModal").showModal();
});

$("#deleteMemberBtn").addEventListener("click", async () => {
  if (!selectedMemberId) return;

  const member = state.members.find(m => m.id === selectedMemberId);
  if (!member) return;

  if (!confirm(`Supprimer ${member.firstName} ${member.lastName} ?`)) return;
await deleteCloud("members", selectedMemberId);
  state.members = state.members.filter(m => m.id !== selectedMemberId);
  selectedMemberId = null;

  $("#memberDetailsModal").close();
  await save();
  renderAll();
});async function deleteCloud(collectionName, id){
  if(state.mode !== "firebase") return;
  const {doc, deleteDoc} = state.fsMod;
  await deleteDoc(doc(state.db, collectionName, id));
}

document.addEventListener("click", async (e) => {


  const acceptBtn = e.target.closest("[data-accept-registration]");
  if(acceptBtn){
    e.preventDefault();
    const id = acceptBtn.dataset.acceptRegistration;
    const registration = state.registrations.find(r => r.id === id);
    if(!registration) return;

    if(!confirm(`Accepter l'inscription de ${registration.firstName || ""} ${registration.lastName || ""} ?`)) return;

    try{
      const memberData = {
        firstName: registration.firstName || "",
        lastName: registration.lastName || "",
        birthDate: registration.birthDate || "",
        section: registration.section || "Adultes",
        belt: "Blanche",
        stripes: 0,
        phone: registration.phone || "",
        email: registration.email || "",
        address: registration.address || "",
        emergency: registration.emergency || "",
       emergencyPhone: registration.emergencyPhone || "",
medicalCertificateToProvide: registration.medicalCertificateToProvide || ""
      };

      const memberId = await addCloud("members", memberData);
      state.members.push({id: memberId, ...memberData});

      await deleteCloud("registrations", id);
      state.registrations = state.registrations.filter(r => r.id !== id);

      renderAll();
      alert("Adhérent ajouté avec succès.");
    }catch(err){
      console.error(err);
      alert("Impossible d'accepter cette inscription.");
    }
    return;
  }

  const rejectBtn = e.target.closest("[data-reject-registration]");
  if(rejectBtn){
    e.preventDefault();
    const id = rejectBtn.dataset.rejectRegistration;
    const registration = state.registrations.find(r => r.id === id);
    if(!registration) return;

    if(!confirm(`Refuser l'inscription de ${registration.firstName || ""} ${registration.lastName || ""} ?`)) return;

    try{
      await deleteCloud("registrations", id);
      state.registrations = state.registrations.filter(r => r.id !== id);
      renderAll();
    }catch(err){
      console.error(err);
      alert("Impossible de refuser cette inscription.");
    }
  }
});
renderAll();
await initFirebase();
