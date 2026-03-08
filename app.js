// settings & urls
const API = {
    all: "https://phi-lab-server.vercel.app/api/v1/lab/issues",
    single: "https://phi-lab-server.vercel.app/api/v1/lab/issue/",
    search: "https://phi-lab-server.vercel.app/api/v1/lab/issues/search?q="
};

let state = {
    issues: [],
    filter: "All",
    isLoading: false
};

const fetchIssues = async (url = API.all, isSearch = false) => {
    toggleLoading(true);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data");
        const data = await res.json();
        state.issues = data.data || data;

        if (isSearch) resetTabActiveState();
        updateTopStats();
        renderIssues();
    } catch (err) {
        showErrorMessage("Oops! We couldn't sync with the server. Please try again later.");
        console.error("API Error:", err);
    } finally {
        toggleLoading(false);
    }
};

const renderIssues = () => {
    const container = document.getElementById("issue-container");
    container.innerHTML = "";

    const filtered = state.issues.filter(issue => {
        if (state.filter === "All") return true;
        return issue.status.toLowerCase() === state.filter.toLowerCase();
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-20 text-center space-y-4 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                <div class="text-4xl">🔍</div>
                <h3 class="text-xl font-bold text-slate-900">No issues found</h3>
                <p class="text-slate-500 font-medium">Try adjusting your search or filter</p>
                <button onclick="fetchAllIssues()" class="text-[#422ad5] font-bold hover:underline">Clear all</button>
            </div>
        `;
        return;
    }

    filtered.forEach(issue => {
        const card = createIssueCard(issue);
        container.appendChild(card);
    });
};

const createIssueCard = (issue) => {
    const status = issue.status.toLowerCase();
    const isClosed = status === "closed";
    const borderColor = isClosed ? "border-t-[#422ad5]" : "border-t-emerald-500";
    const statusIcon = isClosed ?
        `<svg class="w-5 h-5 text-[#422ad5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` :
        `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2.5"></circle></svg>`;

    const priority = (issue.priority || "LOW").toUpperCase();
    let priorityTheme = "bg-slate-100 text-slate-600";
    if (priority === "HIGH") priorityTheme = "bg-red-50 text-red-600";
    if (priority === "MEDIUM") priorityTheme = "bg-amber-50 text-amber-600";

    const el = document.createElement("div");
    el.className = `bg-white rounded-2xl shadow-sm border border-slate-100 border-t-4 ${borderColor} p-6 flex flex-col gap-5 card-hover cursor-pointer`;

    el.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex items-center justify-center">
                ${statusIcon}
            </div>
            <span class="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${priorityTheme}">
                ${priority}
            </span>
        </div>
        <div class="flex-grow space-y-2">
            <h3 class="font-bold text-[#111827] text-[20px] leading-snug line-clamp-2">${issue.title}</h3>
            <p class="text-slate-500 text-[16px] font-medium line-clamp-2 leading-relaxed">${issue.description}</p>
        </div>
        <div class="flex flex-wrap gap-2">${generateLabelHTML(issue.labels)}</div>
        <div class="pt-5 border-t border-slate-50 flex flex-col gap-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                ${issue.author}
            </p>
            <p class="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                ${new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
        </div>
    `;

    el.onclick = () => openIssueDetails(issue.id || issue._id);
    return el;
};

const updateTopStats = () => {
    const stats = {
        total: state.issues.length,
        open: state.issues.filter(i => i.status.toLowerCase() === "open").length,
        closed: state.issues.filter(i => i.status.toLowerCase() === "closed").length
    };

    document.getElementById("all-issues-count").innerText = stats.total;
    document.getElementById("open-count").innerText = stats.open;
    document.getElementById("closed-count").innerText = stats.closed;
};

const generateLabelHTML = (labels = []) => {
    return labels.map(label => {
        const tag = label.toLowerCase();
        let theme = "bg-slate-50 text-slate-500 border-slate-100";
        let dot = "bg-slate-300";

        if (tag.includes("bug")) { theme = "bg-red-50 text-red-500 border-red-100"; dot = "bg-red-500"; }
        if (tag.includes("help")) { theme = "bg-amber-50 text-amber-500 border-amber-100"; dot = "bg-amber-500"; }
        if (tag.includes("feat") || tag.includes("enhan")) { theme = "bg-emerald-50 text-emerald-500 border-emerald-100"; dot = "bg-emerald-500"; }

        return `
            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${theme}">
                <span class="w-1.5 h-1.5 rounded-full ${dot}"></span>
                ${label}
            </span>
        `;
    }).join("");
};

const toggleLoading = (show) => {
    state.isLoading = show;
    document.getElementById("loading-spinner").classList.toggle("hidden", !show);
    document.getElementById("issue-container").classList.toggle("hidden", show);
};

const showErrorMessage = (msg) => {
    const container = document.getElementById("issue-container");
    container.innerHTML = `
        <div class="col-span-full py-20 text-center space-y-4">
            <div class="text-4xl">⚠️</div>
            <h3 class="text-xl font-bold text-red-600">${msg}</h3>
            <button onclick="fetchAllIssues()" class="btn btn-sm bg-slate-100 border-none font-bold">Try Again</button>
        </div>
    `;
};


const openIssueDetails = async (id) => {
    const modal = document.getElementById("issue-modal");
    const content = document.getElementById("modal-content");
    content.innerHTML = "<div class='p-20 text-center'><span class='loading loading-spinner loading-lg text-[#422ad5]'></span></div>";
    modal.showModal();

    const res = await fetch(API.single + id);
    const data = await res.json();
    const issue = data.data || data;
    const isClosed = issue.status.toLowerCase() === "closed";

    const priority = (issue.priority || "LOW").toUpperCase();
    let priorityBadge = "bg-slate-200 text-slate-600";
    if (priority === "HIGH") priorityBadge = "bg-red-600 text-white";
    if (priority === "MEDIUM") priorityBadge = "bg-amber-600 text-white";

    content.innerHTML = `
            <div class="p-10 space-y-8">
                <div class="pr-16">
                    <h2 class="text-3xl font-black text-slate-900 leading-tight">${issue.title}</h2>
                </div>

                <div class="flex items-center gap-3 text-slate-400 text-sm font-bold">
                    <span class="px-4 py-1 rounded-md text-xs font-black uppercase tracking-widest ${isClosed ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}">
                        ${issue.status}
                    </span>
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span>Opened by ${issue.author}</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span>${new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
                </div>

                <div class="flex flex-wrap gap-2">
                    ${generateLabelHTML(issue.labels)}
                </div>

                <div>
                    <p class="text-slate-500 leading-relaxed font-medium text-lg">${issue.description}</p>
                </div>

                <div class="bg-blue-50/30 p-8 rounded-[1.5rem] grid grid-cols-2 gap-4 border border-blue-50">
                    <div class="space-y-2">
                        <p class="text-slate-400 font-bold text-sm">Assignee:</p>
                        <p class="font-extrabold text-slate-800 text-xl">${issue.author}</p>
                    </div>
                    <div class="space-y-2">
                        <p class="text-slate-400 font-bold text-sm">Priority:</p>
                        <span class="inline-block px-5 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest ${priorityBadge}">
                            ${priority}
                        </span>
                    </div>
                </div>

                <div class="flex justify-end pt-4">
                    <form method="dialog">
                        <button class="btn bg-[#422ad5] hover:bg-[#3520b5] border-none text-white px-12 h-14 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 transition-all active:scale-95">Close</button>
                    </form>
                </div>
            </div>
        `;
};


document.getElementById("login-button")?.addEventListener("click", () => {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (user === "admin" && pass === "admin123") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        fetchIssues();
    } else {
        alert("Try admin / admin123");
    }
});



document.getElementById("search-button")?.addEventListener("click", () => {
    const val = document.getElementById("search-input").value.trim();
    if (val) fetchIssues(API.search + encodeURIComponent(val), true);
    else fetchIssues();
});

const tabIds = ["all-tab", "open-tab", "closed-tab"];
tabIds.forEach(id => {
    document.getElementById(id)?.addEventListener("click", function () {
        tabIds.forEach(tid => {
            const el = document.getElementById(tid);
            el.classList.remove("bg-[#422ad5]", "text-white", "border-none");
            el.classList.add("bg-slate-100", "text-slate-600");
        });
        this.classList.remove("bg-slate-100", "text-slate-600");
        this.classList.add("bg-[#422ad5]", "text-white", "border-none");

        state.filter = this.innerText.trim();
        renderIssues();
    });
});

const resetTabActiveState = () => {
    tabIds.forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove("bg-[#422ad5]", "text-white", "border-none");
        el.classList.add("bg-slate-100", "text-slate-600");
    });
    const allTab = document.getElementById("all-tab");
    allTab.classList.remove("bg-slate-100", "text-slate-600");
    allTab.classList.add("bg-[#422ad5]", "text-white", "border-none");
    state.filter = "All";
};



window.fetchAllIssues = () => fetchIssues();
