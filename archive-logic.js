/**
 * GYMPRO ELITE - ARCHIVE & ANALYTICS
 * Version: 14.1.0 (Analytics Overhaul)
 * Changes: Month-grouped archive, adaptive consistency, set-count donut,
 *          workout-type comparison chart, smart micro selector, best-E1RM PR card,
 *          trend badge on volume chart, last-workout hero info, removed streak.
 */

function finish() {
    haptic('success');
    StorageManager.clearSessionState(); 
    state.workoutDurationMins = Math.floor((Date.now() - state.workoutStartTime) / 60000);
    navigate('ui-summary');
    document.getElementById('summary-note').value = "";
    
    // --- 1. DATA PROCESSING ---
    let grouped = {};
    state.log.forEach(e => {
        if (!grouped[e.exName]) grouped[e.exName] = { sets:[], vol: 0, hasWarmup: false };
        if (e.isWarmup) grouped[e.exName].hasWarmup = true;
        else if (!e.skip) {
            let weightStr = `${e.w}kg`;
            if (isUnilateral(e.exName)) weightStr += ` (יד אחת)`;
            
            let setStr = `${weightStr} x ${e.r} (RIR ${e.rir})`;
            if (e.note) setStr += ` | Note: ${e.note}`;
            grouped[e.exName].sets.push(setStr); 
            grouped[e.exName].vol += (e.w * e.r);
        }
    });
    
    state.lastWorkoutDetails = grouped;

    // --- 2. DUAL GENERATION (Raw Text & Visual HTML) ---
    const workoutDisplayName = state.type; 
    const dateStr = new Date().toLocaleDateString('he-IL');
    
    // Raw String for Clipboard
    let summaryText = `GYMPRO ELITE SUMMARY\n${workoutDisplayName} | Week ${state.week} | ${dateStr} | ${state.workoutDurationMins}m\n\n`;

    // Visual HTML for Screen
    let html = `
    <div class="summary-overview-card">
        <div class="summary-overview-col">
            <span class="summary-overview-val">${workoutDisplayName}</span>
            <span class="summary-overview-label">תוכנית</span>
        </div>
        <div class="summary-overview-col">
            <span class="summary-overview-val">${state.week}</span>
            <span class="summary-overview-label">שבוע</span>
        </div>
        <div class="summary-overview-col">
            <span class="summary-overview-val">${state.workoutDurationMins}m</span>
            <span class="summary-overview-label">זמן</span>
        </div>
        <div class="summary-overview-col">
            <span class="summary-overview-val">${dateStr}</span>
            <span class="summary-overview-label">תאריך</span>
        </div>
    </div>`;

    let processedIndices = new Set();
    let lastClusterRound = 0;

    state.log.forEach((entry, index) => {
        if (processedIndices.has(index)) return; 
        if (entry.isWarmup) return; 

        if (entry.isCluster) {
            if (entry.round && entry.round !== lastClusterRound) {
                summaryText += `\n--- Cluster Round ${entry.round} ---\n`;
                html += `<div class="summary-cluster-round">סבב ${entry.round}</div>`;
                lastClusterRound = entry.round;
            }
            
            html += `<div class="summary-ex-card"><div class="summary-ex-header"><span class="summary-ex-title">${entry.exName}</span></div>`;
            
            let details = "";
            if (entry.skip) {
                details = "(Skipped)";
                html += `<div class="summary-tag-skip">דילוג</div>`;
            } else {
                let weightStr = `${entry.w}kg`;
                if (isUnilateral(entry.exName)) weightStr += ` (Uni)`;
                details = `${weightStr} x ${entry.r} (RIR ${entry.rir})`;
                if (entry.note) details += ` | ${entry.note}`;
                
                html += `
                <div class="summary-set-row">
                    <span class="summary-set-num">-</span>
                    <span class="summary-set-details">${weightStr} x ${entry.r} (RIR ${entry.rir})</span>
                </div>`;
                if (entry.note) html += `<div class="summary-set-note">הערה: ${entry.note}</div>`;
            }
            
            summaryText += `• ${entry.exName}: ${details}\n`;
            html += `</div>`;
            processedIndices.add(index);

        } else {
            lastClusterRound = 0;
            if(grouped[entry.exName]) {
                summaryText += `${entry.exName} (Vol: ${grouped[entry.exName].vol}kg):\n`;
                if (grouped[entry.exName].hasWarmup) summaryText += `🔥 Warmup Completed\n`;
                
                html += `<div class="summary-ex-card">
                    <div class="summary-ex-header">
                        <span class="summary-ex-title">${entry.exName}</span>
                        <span class="summary-ex-vol">[נפח: ${grouped[entry.exName].vol}kg]</span>
                    </div>`;
                    
                if (grouped[entry.exName].hasWarmup) {
                    html += `<div class="summary-tag-warmup">[ סט חימום ]</div>`;
                }

                let setCounter = 1;
                state.log.forEach((subEntry, subIndex) => {
                    if (!processedIndices.has(subIndex) && !subEntry.isCluster && subEntry.exName === entry.exName && !subEntry.isWarmup) {
                        if (subEntry.skip) {
                            summaryText += `(Skipped)\n`;
                            html += `<div class="summary-tag-skip">(דילוג)</div>`;
                        } else {
                            let weightStr = `${subEntry.w}kg`;
                            if (isUnilateral(subEntry.exName)) weightStr += ` (יד אחת)`;
                            let setStr = `${weightStr} x ${subEntry.r} (RIR ${subEntry.rir})`;
                            if (subEntry.note) setStr += ` | Note: ${subEntry.note}`;
                            summaryText += `${setStr}\n`;
                            
                            html += `
                            <div class="summary-set-row">
                                <span class="summary-set-num">${setCounter}.</span>
                                <span class="summary-set-details">${weightStr} x ${subEntry.r} (RIR ${subEntry.rir})</span>
                            </div>`;
                            if (subEntry.note) html += `<div class="summary-set-note">הערה: ${subEntry.note}</div>`;
                            setCounter++;
                        }
                        processedIndices.add(subIndex);
                    }
                });
                summaryText += `\n`; 
                html += `</div>`;
            }
        }
    });

    const summaryArea = document.getElementById('summary-area');
    summaryArea.className = "";
    summaryArea.innerHTML = html;
    summaryArea.dataset.rawSummary = summaryText.trim();
}

function copyResult() {
    const summaryArea = document.getElementById('summary-area');
    const rawText = summaryArea.dataset.rawSummary;
    
    let textToCopy = rawText;
    const userNote = document.getElementById('summary-note').value.trim();
    if (userNote) textToCopy += `\n\n📝 הערות כלליות: ${userNote}`;
    
    const workoutDisplayName = state.type;
    const dateStr = new Date().toLocaleDateString('he-IL');
    
    const archiveObj = { 
        id: Date.now(), 
        date: dateStr, 
        timestamp: Date.now(), 
        type: workoutDisplayName, 
        week: state.week, 
        duration: state.workoutDurationMins, 
        summary: textToCopy, 
        details: state.lastWorkoutDetails, 
        generalNote: userNote 
    };
    StorageManager.saveToArchive(archiveObj);
    
    if (navigator.clipboard) { 
        navigator.clipboard.writeText(textToCopy).then(() => { 
            haptic('light'); 
            alert("הסיכום נשמר בארכיון והועתק!"); 
            location.reload(); 
        }); 
    } else { 
        const el = document.createElement("textarea"); 
        el.value = textToCopy; 
        document.body.appendChild(el); 
        el.select(); 
        document.execCommand('copy'); 
        document.body.removeChild(el); 
        alert("הסיכום נשמר בארכיון והועתק!"); 
        location.reload(); 
    }
}

function switchArchiveView(view) {
    state.archiveView = view;
    document.getElementById('btn-view-list').className = `segment-btn ${view === 'list' ? 'active' : ''}`;
    document.getElementById('btn-view-calendar').className = `segment-btn ${view === 'calendar' ? 'active' : ''}`;
    openArchive();
}

function openArchive() {
    if (state.archiveView === 'list') {
        document.getElementById('list-view-container').style.display = 'block';
        document.getElementById('calendar-view').style.display = 'none';
        renderArchiveList();
    } else {
        document.getElementById('list-view-container').style.display = 'none';
        document.getElementById('calendar-view').style.display = 'block';
        state.calendarOffset = 0;
        renderCalendar();
    }
    navigate('ui-archive');
}

let selectedArchiveIds = new Set(); 

// ─── ARCHIVE LIST (MONTH-GROUPED) ────────
const MONTH_NAMES_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function createArchiveCard(item) {
    const card = document.createElement('div');
    card.className = "menu-card";
    card.style.cursor = "default";
    const weekStr = item.week ? ` • שבוע ${item.week}` : '';
    
    card.innerHTML = `
        <div class="archive-card-row">
            <input type="checkbox" class="archive-checkbox" data-id="${item.timestamp}">
            <div class="archive-info">
                <div class="flex-between w-100">
                    <h3 class="m-0">${item.date}</h3>
                    <span class="text-sm color-dim">${item.duration} דק'</span>
                </div>
                <p class="m-0 color-dim text-sm">${item.type}${weekStr}</p>
            </div>
            <div class="chevron"></div>
        </div>`;
        
    const checkbox = card.querySelector('.archive-checkbox');
    checkbox.addEventListener('change', (e) => toggleArchiveSelection(parseInt(e.target.dataset.id)));
    checkbox.addEventListener('click', (e) => e.stopPropagation());
    card.addEventListener('click', (e) => { if (e.target !== checkbox) showArchiveDetail(item); });
    return card;
}

function renderArchiveList() {
    const list = document.getElementById('archive-list');
    list.innerHTML = "";
    selectedArchiveIds.clear();
    updateCopySelectedBtn();
    const history = StorageManager.getArchive();
    
    if (history.length === 0) { 
        list.innerHTML = `<div class="text-center color-dim mt-md">אין אימונים שמורים</div>`; 
        return;
    }

    // Group items by year-month key
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const monthGroups = {};

    history.forEach(item => {
        const d = new Date(item.timestamp);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!monthGroups[key]) {
            monthGroups[key] = {
                year: d.getFullYear(),
                month: d.getMonth(),
                label: `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`,
                isCurrentMonth: key === currentMonthKey,
                items: []
            };
        }
        monthGroups[key].items.push(item);
    });

    // Sort month keys descending
    const sortedKeys = Object.keys(monthGroups).sort((a, b) => {
        const [ay, am] = a.split('-').map(Number);
        const [by, bm] = b.split('-').map(Number);
        return by !== ay ? by - ay : bm - am;
    });

    sortedKeys.forEach(key => {
        const group = monthGroups[key];
        const totalVol = group.items.reduce((s, item) => {
            if (!item.details) return s;
            return s + Object.values(item.details).reduce((sv, ex) => sv + (ex.vol || 0), 0);
        }, 0);
        const volStr = totalVol >= 1000 ? (totalVol / 1000).toFixed(1) + 't' : totalVol + 'kg';

        if (group.isCurrentMonth) {
            // Current month: always expanded
            const header = document.createElement('div');
            header.className = 'archive-month-header current';
            header.innerHTML = `
                <span class="archive-month-title">${group.label}</span>
                <span class="archive-month-meta">${group.items.length} אימונים • ${volStr}</span>`;
            list.appendChild(header);
            group.items.forEach(item => list.appendChild(createArchiveCard(item)));

        } else {
            // Past months: collapsible
            const monthContainer = document.createElement('div');
            monthContainer.className = 'archive-month-group';

            const header = document.createElement('div');
            header.className = 'archive-month-header collapsible';
            header.innerHTML = `
                <div class="archive-month-header-inner">
                    <span class="archive-month-title">${group.label}</span>
                    <span class="archive-month-meta">${group.items.length} אימונים • ${volStr}</span>
                </div>
                <div class="archive-month-arrow">›</div>`;

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'archive-month-items collapsed';
            group.items.forEach(item => itemsContainer.appendChild(createArchiveCard(item)));

            header.addEventListener('click', () => {
                const isOpen = !itemsContainer.classList.contains('collapsed');
                itemsContainer.classList.toggle('collapsed', isOpen);
                header.classList.toggle('open', !isOpen);
            });

            monthContainer.appendChild(header);
            monthContainer.appendChild(itemsContainer);
            list.appendChild(monthContainer);
        }
    });
}

function toggleArchiveSelection(id) { if (selectedArchiveIds.has(id)) selectedArchiveIds.delete(id); else selectedArchiveIds.add(id); updateCopySelectedBtn(); }

function updateCopySelectedBtn() {
    const btn = document.getElementById('btn-copy-selected');
    if (selectedArchiveIds.size > 0) { 
        btn.disabled = false; 
        btn.style.opacity = "1"; 
        btn.style.borderColor = "var(--accent)"; 
        btn.style.color = "var(--accent)"; 
    } else { 
        btn.disabled = true; 
        btn.style.opacity = "0.5"; 
        btn.style.borderColor = "var(--border)"; 
        btn.style.color = "var(--text-dim)"; 
    }
}

function copyBulkLog(mode) {
    const history = StorageManager.getArchive();
    let itemsToCopy = mode === 'all' ? history : history.filter(item => selectedArchiveIds.has(item.timestamp));
    if (itemsToCopy.length === 0) { alert("לא נבחרו אימונים להעתקה"); return; }
    const bulkText = itemsToCopy.map(item => item.summary).join("\n\n========================================\n\n");
    if (navigator.clipboard) { navigator.clipboard.writeText(bulkText).then(() => { haptic('success'); alert(`הועתקו ${itemsToCopy.length} אימונים בהצלחה!`); }); } 
    else { const el = document.createElement("textarea"); el.value = bulkText; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert(`הועתקו ${itemsToCopy.length} אימונים בהצלחה!`); }
}

function changeMonth(delta) { state.calendarOffset += delta; renderCalendar(); }
function renderCalendar() {
    const grid = document.getElementById('calendar-days');
    grid.innerHTML = "";
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + state.calendarOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    document.getElementById('current-month-display').innerText = `${MONTH_NAMES_HE[month]} ${year}`;
    const firstDayIndex = targetDate.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const history = StorageManager.getArchive();
    
    const monthWorkouts = history.filter(item => {
        const d = new Date(item.timestamp);
        return d.getMonth() === month && d.getFullYear() === year;
    });
    
    for(let i = 0; i < firstDayIndex; i++) { 
        const cell = document.createElement('div'); 
        cell.className = "calendar-cell empty"; 
        grid.appendChild(cell); 
    }
    
    const today = new Date();
    for(let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div'); cell.className = "calendar-cell";
        cell.innerHTML = `<span>${day}</span>`;
        if(state.calendarOffset === 0 && day === today.getDate()) cell.classList.add('today');
        
        const dailyWorkouts = monthWorkouts.filter(item => new Date(item.timestamp).getDate() === day);
        if(dailyWorkouts.length > 0) {
            const dotsContainer = document.createElement('div'); 
            dotsContainer.className = "dots-container";
            
            dailyWorkouts.forEach(wo => {
                const dot = document.createElement('div');
                let dotClass = 'type-free';
                if(wo.type.includes('כתפיים - גב - חזה') || wo.type.includes('A')) dotClass = 'type-a';
                else if(wo.type.includes('רגליים - גב') || wo.type.includes('B')) dotClass = 'type-b';
                else if(wo.type.includes('חזה - כתפיים') || wo.type.includes('C')) dotClass = 'type-c';
                dot.className = `dot ${dotClass}`;
                dotsContainer.appendChild(dot);
            });
            cell.appendChild(dotsContainer);
            cell.onclick = () => openDayDrawer(dailyWorkouts, day, MONTH_NAMES_HE[month]);
        }
        grid.appendChild(cell);
    }
}

function openDayDrawer(workouts, day, monthName) {
    const drawer = document.getElementById('sheet-modal');
    const overlay = document.getElementById('sheet-overlay');
    const content = document.getElementById('sheet-content');
    
    let html = `<h3>${day} ב${monthName}</h3>`;
    
    if(workouts.length === 0) { 
        html += `<p class="color-dim text-sm">אין אימונים ביום זה</p>`; 
    } else {
        html += `<p class="color-dim text-sm">נמצאו ${workouts.length} אימונים:</p>`;
        workouts.forEach(wo => {
            let dotColor = '#BF5AF2';
            if(wo.type.includes('כתפיים - גב - חזה') || wo.type.includes('A')) dotColor = '#0A84FF';
            else if(wo.type.includes('רגליים - גב') || wo.type.includes('B')) dotColor = '#32D74B';
            else if(wo.type.includes('חזה - כתפיים') || wo.type.includes('C')) dotColor = '#FF9F0A';
            
            html += `
            <div class="mini-workout-item" onclick='openArchiveFromDrawer(${JSON.stringify(wo).replace(/'/g, "&#39;")})'>
                <div class="mini-dot" style="background:${dotColor}"></div>
                <div style="flex-grow:1;">
                    <div class="font-semi text-base">${wo.type}</div>
                    <div class="text-xs color-dim">${wo.duration} דק' • ${new Date(wo.timestamp).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
                <div class="chevron"></div>
            </div>`;
        });
    }
    content.innerHTML = html;
    overlay.style.display = 'block';
    drawer.classList.add('open');
    haptic('light');
}

function closeDayDrawer() {
    const drawer = document.getElementById('sheet-modal');
    const overlay = document.getElementById('sheet-overlay');
    drawer.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

function openArchiveFromDrawer(itemData) {
    closeDayDrawer();
    const realItem = StorageManager.getArchive().find(i => i.timestamp === itemData.timestamp);
    if(realItem) showArchiveDetail(realItem);
}

function showArchiveDetail(item) {
    currentArchiveItem = item; 
    document.getElementById('archive-detail-content').innerText = item.summary;
    document.getElementById('btn-archive-copy').onclick = () => navigator.clipboard.writeText(item.summary).then(() => alert("הועתק!"));
    
    document.getElementById('btn-archive-delete').onclick = () => { 
        if(confirm("למחוק אימון זה מהארכיון?")) { 
            StorageManager.deleteFromArchive(item.timestamp); 
            state.historyStack.pop(); 
            openArchive(); 
        } 
    };
    
    navigate('ui-archive-detail');
}

function exportData() {
    const data = StorageManager.getAllData();
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: "application/json"})); 
    a.download = `gympro_backup_${new Date().toISOString().slice(0,10)}.json`; 
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function triggerImport() { document.getElementById('import-file').click(); }

function importData(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(confirm("האם לדרוס את הנתונים הקיימים ולשחזר מהגיבוי?")) { 
                StorageManager.restoreData(data); 
                alert("הנתונים שוחזרו בהצלחה!"); 
                location.reload(); 
            }
        } catch(err) { alert("שגיאה בטעינת הקובץ."); }
    };
    reader.readAsText(file);
}

function triggerConfigImport() { document.getElementById('import-config-file').click(); }

function processConfigImport(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { 
        try { 
            StorageManager.importConfiguration(JSON.parse(e.target.result)); 
        } catch(err) { 
            alert("שגיאה בטעינת הקובץ."); 
        } 
    };
    reader.readAsText(file);
}

function openSessionLog() {
    const drawer = document.getElementById('sheet-modal');
    const overlay = document.getElementById('sheet-overlay');
    const content = document.getElementById('sheet-content');

    let html = `<h3>יומן אימון נוכחי</h3>`;
    
    if (state.log.length === 0) {
        html += `<p class="text-center mt-lg color-dim">טרם בוצעו סטים באימון זה</p>`;
    } else {
        html += `<div class="vertical-stack mt-sm">`;
        state.log.forEach((entry, index) => {
            const isSkip = entry.skip;
            const isWarmup = entry.isWarmup;
            let displayTitle = entry.exName;
            let details = "";
            let dotColor = "var(--text-dim)";

            if (isSkip) { details = "דילוג על תרגיל"; } 
            else if (isWarmup) { details = "סט חימום"; dotColor = "#ff3b30"; } 
            else { details = `${entry.w}kg x ${entry.r} (RIR ${entry.rir})`; if (entry.note) details += ` | 📝`; dotColor = "var(--accent)"; }

            html += `
            <div class="mini-workout-item" onclick="openEditSet(${index})">
                <div class="mini-dot" style="background:${dotColor}"></div>
                <div style="flex-grow:1;">
                    <div class="font-semi text-sm">${index + 1}. ${displayTitle}</div>
                    <div class="text-sm color-dim mt-xs">${details}</div>
                </div>
                <div class="chevron"></div>
            </div>`;
        });
        html += `</div>`;
    }

    content.innerHTML = html;
    overlay.style.display = 'block';
    drawer.classList.add('open');
    haptic('light');
}

function openHistoryDrawer() {
    const drawer = document.getElementById('sheet-modal');
    const overlay = document.getElementById('sheet-overlay');
    const content = document.getElementById('sheet-content');
    
    const history = getLastPerformance(state.currentExName);
    
    let html = `<h3>היסטוריה: ${state.currentExName}</h3>`;
    
    if (!history) {
        html += `<p class="text-center mt-lg color-dim">אין נתונים מהאימון הקודם</p>`;
    } else {
        html += `<div class="text-sm color-dim mb-md text-right mt-xs">📅 ביצוע אחרון: ${history.date}</div>`;
        
        html += `
        <div class="history-header">
            <div>סט</div>
            <div>משקל</div>
            <div>חזרות</div>
            <div>RIR</div>
        </div>
        <div class="history-list">`;
        
        history.sets.forEach((setStr, idx) => {
            let weight = "-", reps = "-", rir = "-";
            try {
                let coreStr = setStr;
                if (setStr.includes('| Note:')) {
                    coreStr = setStr.split('| Note:')[0].trim();
                }

                const parts = coreStr.split('x');
                if(parts.length > 1) {
                    weight = parts[0].replace('kg', '').trim();
                    const rest = parts[1];
                    const rirMatch = rest.match(/\(RIR (.*?)\)/);
                    reps = rest.split('(')[0].trim();
                    if(rirMatch) rir = rirMatch[1];
                }
            } catch(e) {}

            html += `
            <div class="history-row">
                <div class="history-col set-idx">#${idx + 1}</div>
                <div class="history-col">${weight}</div>
                <div class="history-col">${reps}</div>
                <div class="history-col rir-note">${rir}</div>
            </div>`;
        });
        html += `</div>`;
    }

    content.innerHTML = html;
    overlay.style.display = 'block';
    drawer.classList.add('open');
    haptic('light');
}

function getLastPerformance(exName) {
    const archive = StorageManager.getArchive();
    for (const item of archive) {
        if (item.week === 'deload') continue;
        if (item.details && item.details[exName]) {
            if (item.details[exName].sets && item.details[exName].sets.length > 0) {
                return { date: item.date, sets: item.details[exName].sets };
            }
        }
    }
    return null;
}

function openEditSet(index) {
    const entry = state.log[index];
    if (entry.skip || entry.isWarmup) { alert("לא ניתן לערוך דילוגים או סטים של חימום כרגע."); return; }
    state.editingIndex = index;
    document.getElementById('edit-weight').value = entry.w;
    document.getElementById('edit-reps').value = entry.r;
    document.getElementById('edit-rir').value = entry.rir;
    document.getElementById('edit-note').value = entry.note || "";
    
    document.getElementById('btn-delete-set').style.display = 'block';
    closeDayDrawer(); 
    document.getElementById('edit-set-modal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('edit-set-modal').style.display = 'none'; state.editingIndex = -1; }

function saveSetEdit() {
    if (state.editingIndex === -1) return;
    const w = parseFloat(document.getElementById('edit-weight').value);
    const r = parseInt(document.getElementById('edit-reps').value);
    const rir = document.getElementById('edit-rir').value;
    const note = document.getElementById('edit-note').value;
    if (isNaN(w) || isNaN(r)) { alert("נא להזין ערכים תקינים"); return; }
    
    state.log[state.editingIndex].w = w;
    state.log[state.editingIndex].r = r;
    state.log[state.editingIndex].rir = rir;
    state.log[state.editingIndex].note = note;

    if (state.editingIndex === state.log.length - 1) {
        state.lastLoggedSet = state.log[state.editingIndex];
        const hist = document.getElementById('last-set-info');
        hist.innerText = `סט אחרון: ${state.lastLoggedSet.w}kg x ${state.lastLoggedSet.r} (RIR ${state.lastLoggedSet.rir})`;
    }
    StorageManager.saveSessionState();
    closeEditModal(); haptic('success'); openSessionLog(); 
}

function deleteSetFromLog() {
    if (state.editingIndex === -1) return;
    if (!confirm("האם למחוק את הסט הזה?")) return;
    
    const removedEntry = state.log[state.editingIndex];
    state.log.splice(state.editingIndex, 1);
    
    if (removedEntry.exName === state.currentExName) {
        if (state.setIdx > 0) state.setIdx--;
        const relevantLogs = state.log.filter(l => l.exName === state.currentExName && !l.skip && !l.isWarmup);
        if (relevantLogs.length > 0) {
            state.lastLoggedSet = relevantLogs[relevantLogs.length - 1];
        } else {
            state.lastLoggedSet = null;
        }
    }
    
    StorageManager.saveSessionState();
    closeEditModal();
    haptic('warning');
    
    if (document.getElementById('ui-main').classList.contains('active')) {
        if(typeof initPickers === 'function') initPickers();
    }
    openSessionLog();
}

// =========================================
// ANALYTICS ENGINE v14.1
// =========================================

// ─── PREFS ───────────────────────────────
const ANALYTICS_PREFS_KEY = 'gympro_analytics_prefs';
const ANALYTICS_DEFAULTS = {
    name: '', units: 'kg', formula: 'epley',
    heroMetrics: ['days', 'vol', 'duration'],
    volumeRange: 8, muscleRange: '3m',
    consistencyRange: 8, microPoints: 6, microAxis: 'e1rm'
};

function getAnalyticsPrefs() {
    const stored = StorageManager.getData(ANALYTICS_PREFS_KEY);
    return Object.assign({}, ANALYTICS_DEFAULTS, stored || {});
}
function saveAnalyticsPrefs(prefs) {
    StorageManager.saveData(ANALYTICS_PREFS_KEY, prefs);
}

// ─── 1RM FORMULAS ────────────────────────
function calc1RM(weight, reps, formula) {
    if (reps <= 1) return weight;
    switch (formula) {
        case 'brzycki':  return weight * (36 / (37 - reps));
        case 'lombardi': return weight * Math.pow(reps, 0.10);
        default:         return weight * (1 + reps / 30); // epley
    }
}

// ─── DATA HELPERS ────────────────────────
function getArchiveClean() {
    return StorageManager.getArchive().filter(a => a.week !== 'deload');
}

function getWorkoutVolume(workout) {
    if (!workout.details) return 0;
    return Object.values(workout.details).reduce((s, ex) => s + (ex.vol || 0), 0);
}

// Volume-based muscle map (kept for reference / future use)
function getMuscleVolumes(archive, range) {
    const now = Date.now();
    const cutoff = range === '1m' ? now - 30 * 86400000
                 : range === '3m' ? now - 90 * 86400000 : 0;
    const filtered = archive.filter(a => a.timestamp >= cutoff);
    const map = {};
    filtered.forEach(w => {
        if (!w.details) return;
        Object.entries(w.details).forEach(([exName, data]) => {
            const ex = state.exercises.find(e => e.name === exName);
            const muscle = (ex && ex.muscles && ex.muscles[0]) ? ex.muscles[0] : 'אחר';
            map[muscle] = (map[muscle] || 0) + (data.vol || 0);
        });
    });
    return map;
}

// Set-count-based muscle map — fair comparison across muscle groups
function getMuscleSetCounts(archive, range) {
    const now = Date.now();
    const cutoff = range === '1m' ? now - 30 * 86400000
                 : range === '3m' ? now - 90 * 86400000 : 0;
    const filtered = archive.filter(a => a.timestamp >= cutoff);
    const map = {};
    filtered.forEach(w => {
        if (!w.details) return;
        Object.entries(w.details).forEach(([exName, data]) => {
            const ex = state.exercises.find(e => e.name === exName);
            const muscle = (ex && ex.muscles && ex.muscles[0]) ? ex.muscles[0] : 'אחר';
            const setCount = (data.sets && data.sets.length) ? data.sets.length : 0;
            map[muscle] = (map[muscle] || 0) + setCount;
        });
    });
    return map;
}

function parseSetsFromStrings(sets) {
    return sets.map(s => {
        try {
            const core = s.includes('| Note:') ? s.split('| Note:')[0].trim() : s;
            const parts = core.split('x');
            if (parts.length < 2) return null;
            const w = parseFloat(parts[0].replace('kg','').replace('(יד אחת)','').trim());
            const repsMatch = parts[1].match(/\d+/);
            const r = repsMatch ? parseInt(repsMatch[0]) : 1;
            const rirMatch = core.match(/RIR\s*(\S+)/);
            const rir = rirMatch ? rirMatch[1] : '—';
            if (isNaN(w)) return null;
            return { w, r, rir };
        } catch (e) { return null; }
    }).filter(Boolean);
}

// ─── HERO CARD ───────────────────────────
const HERO_METRIC_DEFS = {
    days: (archive) => {
        if (!archive.length) return { val: '—', lbl: 'ימים מאז\nאחרון' };
        const d = Math.floor((Date.now() - archive[0].timestamp) / 86400000);
        return { val: d, lbl: 'ימים מאז\nאחרון' };
    },
    vol: (archive) => {
        const v = archive.length ? getWorkoutVolume(archive[0]) : 0;
        return { val: v ? v + 'kg' : '—', lbl: 'נפח\nאחרון' };
    },
    duration: (archive) => ({
        val: (archive.length && archive[0].duration) ? archive[0].duration + 'm' : '—',
        lbl: 'משך\nאחרון'
    }),
    avg_vol: (archive) => {
        const slice = archive.slice(0, 4);
        const avg = slice.length ? Math.round(slice.reduce((s,a) => s + getWorkoutVolume(a), 0) / slice.length) : 0;
        return { val: avg ? avg + 'kg' : '—', lbl: 'ממוצע נפח\n4 אימונים' };
    },
    total: (archive) => ({ val: archive.length, lbl: 'סך\nאימונים' })
};

function renderHeroCard() {
    const prefs = getAnalyticsPrefs();
    const archive = getArchiveClean();

    // Last workout info (replaces streak)
    const lastWoEl = document.getElementById('hero-last-workout');
    if (lastWoEl) {
        if (archive.length > 0) {
            const last = archive[0];
            const days = Math.floor((Date.now() - last.timestamp) / 86400000);
            const daysStr = days === 0 ? 'היום' : days === 1 ? 'אתמול' : `לפני ${days} ימים`;
            lastWoEl.textContent = `${last.type} • ${daysStr}`;
        } else {
            lastWoEl.textContent = 'טרם בוצעו אימונים';
        }
    }

    prefs.heroMetrics.forEach((key, i) => {
        const def = HERO_METRIC_DEFS[key];
        const m = def ? def(archive) : { val: '—', lbl: '—' };
        const el = document.getElementById('hero-stat-' + i);
        if (!el) return;
        el.querySelector('.hero-stat-val').textContent = m.val;
        el.querySelector('.hero-stat-lbl').textContent = m.lbl;
    });
}

// ─── TAB BAR ─────────────────────────────
function switchMainTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('tabbtn-' + name);
    if (activeBtn) activeBtn.classList.add('active');

    if (name === 'workout') {
        navigate('ui-week', true);
    } else if (name === 'analytics') {
        navigate('ui-analytics', true);
        renderAnalyticsDashboard();
    } else if (name === 'archive') {
        navigate('ui-archive', true);
        openArchive();
    }
    haptic('light');
}

// ─── ANALYTICS MAIN RENDER ───────────────
function renderAnalyticsDashboard() {
    const prefs = getAnalyticsPrefs();
    const archive = getArchiveClean();
    renderHeroMetricsGrid(archive);
    renderVolumeBarChart(archive, prefs.volumeRange);
    renderWorkoutTypeChart(archive);
    renderDonutChart(archive, prefs.muscleRange);
    renderConsistencyTrack(archive, prefs.consistencyRange);
    populateMicroSelector(archive);
}

// ─── HERO METRICS GRID ───────────────────
function renderHeroMetricsGrid(archive) {
    const total = archive.length;
    const totalVol = archive.reduce((s, a) => s + getWorkoutVolume(a), 0);
    const totalDurMins = archive.reduce((s, a) => s + (a.duration || 0), 0);
    const bestVol = archive.reduce((mx, a) => Math.max(mx, getWorkoutVolume(a)), 0);
    const avgDur = total ? Math.round(totalDurMins / total) : 0;

    const el = document.getElementById('hero-metrics-grid');
    if (!el) return;
    el.innerHTML = `
        <div class="metric-tile">
            <div class="metric-tile-lbl">נפח כולל</div>
            <div class="metric-tile-val" style="color:var(--accent)">${(totalVol / 1000).toFixed(1)}t</div>
            <div class="metric-tile-sub">${total} אימונים</div>
        </div>
        <div class="metric-tile">
            <div class="metric-tile-lbl">זמן כולל</div>
            <div class="metric-tile-val">${Math.round(totalDurMins / 60)}h</div>
            <div class="metric-tile-sub">ממוצע ${avgDur}m</div>
        </div>
        <div class="metric-tile">
            <div class="metric-tile-lbl">אימונים</div>
            <div class="metric-tile-val">${total}</div>
            <div class="metric-tile-sub">&nbsp;</div>
        </div>
        <div class="metric-tile highlight">
            <div class="metric-tile-lbl" style="color:var(--type-b)">🏆 שיא נפח</div>
            <div class="metric-tile-val" style="color:var(--type-b)">${(bestVol / 1000).toFixed(1)}t</div>
            <div class="metric-tile-sub">&nbsp;</div>
        </div>
    `;
}

// ─── VOLUME BAR CHART ────────────────────
function renderVolumeBarChart(archive, n) {
    const el = document.getElementById('vol-bar-chart');
    if (!el) return;
    const data = archive.slice(0, n).reverse(); // oldest → newest (left → right)

    // Trend badge: compare avg of recent half vs older half
    const trendEl = document.getElementById('vol-trend-badge');
    if (trendEl) {
        if (data.length >= 4) {
            const half = Math.floor(data.length / 2);
            const recentVols = data.slice(half).map(a => getWorkoutVolume(a));
            const olderVols  = data.slice(0, half).map(a => getWorkoutVolume(a));
            const avgRecent = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
            const avgOlder  = olderVols.reduce((s, v) => s + v, 0) / olderVols.length;
            if (avgOlder > 0) {
                const pct = Math.round((avgRecent - avgOlder) / avgOlder * 100);
                const arrow = pct >= 0 ? '↑' : '↓';
                const color = pct >= 0 ? 'var(--type-b)' : 'var(--danger)';
                trendEl.innerHTML = `<span style="color:${color};font-size:0.78em;font-weight:700;margin-right:6px;">${arrow} ${Math.abs(pct)}%</span>`;
            } else {
                trendEl.innerHTML = '';
            }
        } else {
            trendEl.innerHTML = '';
        }
    }

    if (!data.length) { el.innerHTML = '<p class="color-dim text-sm text-center mt-md">אין נתונים</p>'; return; }
    const vols = data.map(a => getWorkoutVolume(a));
    const maxV = Math.max(...vols) || 1;
    el.innerHTML = data.map((a, i) => {
        const pct = (vols[i] / maxV * 88).toFixed(1);
        const isPeak = vols[i] === maxV;
        const dt = (a.date || '').slice(0, 5);
        const label = vols[i] >= 1000 ? (vols[i] / 1000).toFixed(1) + 't' : vols[i] + 'kg';
        return `<div class="bar-col-wrap">
            <div class="bar-col-track">
                <div class="bar-col-val">${label}</div>
                <div class="bar-col-fill${isPeak ? ' peak' : ''}" style="height:${pct}%"></div>
            </div>
            <div class="bar-col-date">${dt}</div>
        </div>`;
    }).join('');

    // Scroll to show most recent (rightmost)
    const scrollEl = el.parentElement;
    if (scrollEl) setTimeout(() => { scrollEl.scrollLeft = scrollEl.scrollWidth; }, 60);
}

// ─── WORKOUT TYPE COMPARISON CHART ───────
function renderWorkoutTypeChart(archive) {
    const el = document.getElementById('workout-type-chart');
    if (!el) return;

    const typeMap = {};
    archive.forEach(w => {
        const type = w.type || 'אחר';
        if (!typeMap[type]) typeMap[type] = { total: 0, count: 0 };
        typeMap[type].total += getWorkoutVolume(w);
        typeMap[type].count++;
    });

    const entries = Object.entries(typeMap)
        .map(([type, d]) => ({ type, avg: Math.round(d.total / d.count), count: d.count }))
        .filter(e => e.count >= 2) // minimum 2 workouts for meaningful average
        .sort((a, b) => b.avg - a.avg);

    if (!entries.length) {
        el.innerHTML = '<p class="color-dim text-sm text-center mt-md">נדרשים לפחות 2 אימונים לכל סוג</p>';
        return;
    }

    const maxAvg = Math.max(...entries.map(e => e.avg)) || 1;
    const COLORS = ['var(--type-a)', 'var(--type-b)', 'var(--type-c)', 'var(--type-free)', 'var(--accent)'];

    el.innerHTML = entries.map((e, i) => {
        const pct = (e.avg / maxAvg * 88).toFixed(1);
        const color = COLORS[i % COLORS.length];
        const label = e.avg >= 1000 ? (e.avg / 1000).toFixed(1) + 't' : e.avg + 'kg';
        const shortType = e.type.length > 14 ? e.type.slice(0, 12) + '…' : e.type;
        return `<div class="bar-col-wrap">
            <div class="bar-col-track">
                <div class="bar-col-val">${label}</div>
                <div class="bar-col-fill" style="height:${pct}%;background:${color};"></div>
            </div>
            <div class="bar-col-date" title="${e.type}">${shortType}</div>
            <div class="bar-col-count">${e.count}×</div>
        </div>`;
    }).join('');
}

// ─── DONUT CHART (set counts) ─────────────
const DONUT_COLORS = ['#0A84FF','#32D74B','#FF9F0A','#BF5AF2','#ff453a','#AEAEB2'];

function renderDonutChart(archive, range) {
    const svgEl = document.getElementById('donut-svg-el');
    const centerEl = document.getElementById('donut-center-lbl');
    const legendEl = document.getElementById('donut-legend-el');
    if (!svgEl || !centerEl || !legendEl) return;

    const map = getMuscleSetCounts(archive, range);
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = entries.reduce((s, e) => s + e[1], 0);

    if (!total) {
        svgEl.innerHTML = '';
        centerEl.innerHTML = '<div class="donut-center-val">—</div>';
        legendEl.innerHTML = '<div class="color-dim text-sm">אין נתונים</div>';
        return;
    }

    const r = 46, ci = 2 * Math.PI * r;
    let offset = 0;
    let circles = '';
    let legendHtml = '';

    entries.forEach(([name, sets], i) => {
        const pct = sets / total;
        const da = (pct * ci).toFixed(2);
        const gap = (ci - parseFloat(da)).toFixed(2);
        circles += `<circle cx="60" cy="60" r="${r}" fill="none"
            stroke="${DONUT_COLORS[i]}" stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${da} ${gap}"
            stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
        legendHtml += `<div class="donut-legend-row">
            <div class="donut-legend-dot" style="background:${DONUT_COLORS[i]}"></div>
            <div class="donut-legend-name">${name}</div>
            <div class="donut-legend-pct">${sets} סטים</div>
        </div>`;
        offset += parseFloat(da);
    });

    svgEl.innerHTML = `<circle cx="60" cy="60" r="${r}" fill="none"
        stroke="rgba(255,255,255,0.04)" stroke-width="14"/>${circles}`;
    centerEl.innerHTML = `<div class="donut-center-val">${total}</div>
        <div class="donut-center-sub">סטים</div>`;
    legendEl.innerHTML = legendHtml;
}

// ─── CONSISTENCY TRACK (adaptive thresholds) ─
function renderConsistencyTrack(archive, n) {
    const el = document.getElementById('cons-track');
    if (!el) return;
    const data = archive.slice(0, n).reverse();
    if (data.length < 2) {
        el.innerHTML = '<p class="color-dim text-sm">נדרשים לפחות 2 אימונים</p>';
        return;
    }

    // Compute personal median gap from full archive
    let medianGap = 7;
    if (archive.length >= 3) {
        const allGaps = [];
        for (let i = 1; i < archive.length; i++) {
            allGaps.push((archive[i-1].timestamp - archive[i].timestamp) / 86400000);
        }
        allGaps.sort((a, b) => a - b);
        medianGap = allGaps[Math.floor(allGaps.length / 2)];
    }
    const greenThreshold  = Math.max(2, Math.round(medianGap * 1.25));
    const orangeThreshold = Math.max(greenThreshold + 1, Math.round(medianGap * 1.75));

    // Update legend dynamically
    const legendEl = document.getElementById('cons-legend');
    if (legendEl) {
        legendEl.innerHTML = `
            <span style="color:var(--type-b)">● ≤${greenThreshold} ימים</span>
            <span style="color:var(--type-c)">● ${greenThreshold + 1}–${orangeThreshold} ימים</span>
            <span style="color:var(--danger)">● ${orangeThreshold + 1}+ ימים</span>`;
    }

    let html = '';
    data.forEach((w, i) => {
        let cls = 'today', label = '●';
        if (i > 0) {
            const days = Math.round((data[i].timestamp - data[i-1].timestamp) / 86400000);
            cls = days <= greenThreshold ? 'green' : days <= orangeThreshold ? 'orange' : 'red';
            label = days + 'd';
        }
        const dt = (w.date || '').slice(0, 5);
        html += `<div class="cons-node-wrap">
            <div class="cons-node ${cls}">${label}</div>
            <div class="cons-node-date">${dt}</div>
        </div>`;
        if (i < data.length - 1) html += `<div class="cons-connector"></div>`;
    });
    el.innerHTML = html;

    // Scroll to show most recent (rightmost)
    setTimeout(() => { el.scrollLeft = el.scrollWidth; }, 60);
}

// ─── MICRO: SELECTOR (smart sort) ────────
function populateMicroSelector(archive) {
    const sel = document.getElementById('micro-ex-selector');
    if (!sel) return;

    // Build map: exName → { isCalc, lastSeenIdx (lower = more recent) }
    const exMap = {};
    archive.forEach((w, idx) => {
        if (!w.details) return;
        Object.keys(w.details).forEach(exName => {
            if (!exMap[exName]) {
                const exData = state.exercises.find(e => e.name === exName);
                exMap[exName] = {
                    isCalc: exData ? !!exData.isCalc : false,
                    lastSeenIdx: idx
                };
            }
        });
    });

    // Sort: Main exercises first → then by recency (most recent first)
    const sorted = Object.keys(exMap).sort((a, b) => {
        const da = exMap[a], db = exMap[b];
        if (da.isCalc !== db.isCalc) return da.isCalc ? -1 : 1;
        return da.lastSeenIdx - db.lastSeenIdx;
    });

    const current = sel.value;
    sel.innerHTML = sorted.map(e => `<option value="${e}">${e}</option>`).join('');
    if (current && exMap[current]) sel.value = current;
    if (sel.value) loadMicroData(sel.value);
}

// ─── MICRO: LOAD DATA ────────────────────
function loadMicroData(exName) {
    if (!exName) return;
    const prefs = getAnalyticsPrefs();
    const archive = getArchiveClean();

    const relevant = archive
        .filter(w => w.details && w.details[exName] && w.details[exName].sets && w.details[exName].sets.length)
        .slice(0, prefs.microPoints)
        .reverse();

    if (!relevant.length) return;

    const vals = relevant.map(w => {
        const parsed = parseSetsFromStrings(w.details[exName].sets);
        if (!parsed.length) return 0;
        if (prefs.microAxis === 'vol') return w.details[exName].vol || 0;
        if (prefs.microAxis === 'maxw') return Math.max(...parsed.map(s => s.w));
        // e1rm (default)
        return Math.max(...parsed.map(s => calc1RM(s.w, s.r, prefs.formula)));
    });

    const dates = relevant.map(w => w.date || '');
    drawMicroLineChart(vals, dates);
    renderIntensityScore(vals);
    renderPRCard(exName, relevant, prefs);
}

// ─── MICRO: LINE CHART ───────────────────
function drawMicroLineChart(vals, dates) {
    const svg = document.getElementById('micro-line-svg');
    if (!svg) return;
    const n = vals.length;
    if (n < 2) { svg.innerHTML = '<text x="160" y="82" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-family="-apple-system,sans-serif" font-size="12">אין מספיק נתונים</text>'; return; }

    const W = 320, H = 165;
    const pad = { t: 22, r: 20, b: 28, l: 40 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
    const mn = Math.min(...vals) * 0.965, mx = Math.max(...vals) * 1.035;
    const px = i => pad.l + (i / (n - 1)) * cW;
    const py = v => pad.t + cH - ((v - mn) / ((mx - mn) || 1)) * cH;
    const pts = vals.map((v, i) => [px(i), py(v)]);

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L${pts[n-1][0].toFixed(1)},${(pad.t + cH).toFixed(1)} L${pts[0][0].toFixed(1)},${(pad.t + cH).toFixed(1)} Z`;

    const yLabels = [mn, (mn + mx) / 2, mx].map(v =>
        `<text x="${pad.l - 5}" y="${py(v) + 4}" fill="rgba(255,255,255,0.28)" font-size="8.5" text-anchor="end" font-family="-apple-system,sans-serif">${Math.round(v)}</text>`
    ).join('');

    const xLabels = dates.map((d, i) => i % 2 === 0
        ? `<text x="${px(i).toFixed(1)}" y="${H - 5}" fill="rgba(255,255,255,0.28)" font-size="8" text-anchor="middle" font-family="-apple-system,sans-serif">${d.slice(0, 5)}</text>`
        : ''
    ).join('');

    const dots = pts.map(p =>
        `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="#000" stroke="#32D74B" stroke-width="2.5"/>`
    ).join('');

    const lp = pts[n - 1];
    const tx = lp[0] > W - 72 ? lp[0] - 52 : lp[0] + 6;
    const tooltip = `
        <rect x="${tx}" y="${lp[1] - 22}" width="50" height="18" rx="5"
            fill="rgba(50,215,75,0.18)" stroke="rgba(50,215,75,0.45)" stroke-width="0.5"/>
        <text x="${(tx + 25).toFixed(1)}" y="${lp[1] - 9}" fill="#32D74B"
            font-size="9.5" text-anchor="middle" font-weight="700"
            font-family="-apple-system,sans-serif">${Math.round(vals[n - 1])}</text>`;

    svg.innerHTML = `
        <defs>
            <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#32D74B" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#32D74B" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#lcGrad)"/>
        <path d="${linePath}" fill="none" stroke="#32D74B" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"
            style="filter:drop-shadow(0 0 6px rgba(50,215,75,0.5))"/>
        ${yLabels}${xLabels}${dots}${tooltip}`;
}

// ─── MICRO: INTENSITY SCORE ──────────────
function renderIntensityScore(vals) {
    const valEl = document.getElementById('intensity-score-val');
    const deltaEl = document.getElementById('intensity-score-delta');
    const sparkEl = document.getElementById('micro-sparkline');
    if (!valEl || !vals.length) return;

    const last = vals[vals.length - 1];
    const prev = vals.length > 1 ? vals[vals.length - 2] : last;
    const score = (last * 0.85).toFixed(1);
    const delta = (last - prev).toFixed(1);

    valEl.textContent = score;
    if (deltaEl) {
        deltaEl.textContent = (parseFloat(delta) >= 0 ? '↑ ' : '↓ ') + Math.abs(delta) + ' מהפעם הקודמת';
        deltaEl.style.color = parseFloat(delta) >= 0 ? '#32D74B' : '#ff453a';
    }

    if (sparkEl && vals.length >= 2) {
        const n = vals.length;
        const W = 140, H = 52;
        const mn = Math.min(...vals), mx = Math.max(...vals);
        const spx = i => (i / (n - 1)) * W;
        const spy = v => H - 4 - ((v - mn) / ((mx - mn) || 1)) * (H - 8);
        const pts = vals.map((v, i) => [spx(i), spy(v)]);
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const lp = pts[n - 1];
        sparkEl.innerHTML = `
            <path d="${path}" fill="none" stroke="rgba(255,159,10,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="3.5" fill="#FF9F0A"/>`;
    }
}

// ─── MICRO: PR CARD (best E1RM set) ──────
function renderPRCard(exName, relevant, prefs) {
    // Find the set with the highest E1RM (not just heaviest weight)
    let bestE1RM = 0, prW = 0, prR = 1, prRIR = '—', prDate = '';
    relevant.forEach(w => {
        if (!w.details || !w.details[exName]) return;
        const parsed = parseSetsFromStrings(w.details[exName].sets);
        parsed.forEach(s => {
            const e1rm = calc1RM(s.w, s.r, prefs.formula);
            if (e1rm > bestE1RM) {
                bestE1RM = e1rm;
                prW = s.w; prR = s.r; prRIR = s.rir; prDate = w.date || '';
            }
        });
    });

    const wEl = document.getElementById('pr-card-weight');
    const dEl = document.getElementById('pr-card-date');
    const gEl = document.getElementById('pr-stats-row');
    const nEl = document.getElementById('pr-context-note');

    if (wEl) wEl.textContent = prW ? prW + ' kg' : '—';
    if (dEl) dEl.textContent = prDate;
    if (gEl) gEl.innerHTML = `
        <div><div class="pr-stat-val">${prR}</div><div class="pr-stat-lbl">חזרות</div></div>
        <div><div class="pr-stat-val">RIR ${prRIR}</div><div class="pr-stat-lbl">RIR</div></div>
        <div><div class="pr-stat-val">${prW ? Math.round(bestE1RM) : '—'}</div><div class="pr-stat-lbl">1RM משוער</div></div>`;
    if (nEl) nEl.textContent = prW ? `שיא E1RM בתרגיל: ${exName}` : '';
}

function togglePRCard() {
    const body = document.getElementById('pr-expand-body');
    const arrow = document.getElementById('pr-expand-arrow');
    if (!body) return;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    if (arrow) arrow.classList.toggle('open', !isOpen);
}

// ─── ANALYTICS TAB SWITCH ────────────────
function switchAnalyticsTab(name, btn) {
    document.querySelectorAll('#analytics-seg .segment-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const macro = document.getElementById('analytics-macro');
    const micro = document.getElementById('analytics-micro');
    if (macro) macro.style.display = name === 'macro' ? 'block' : 'none';
    if (micro) micro.style.display = name === 'micro' ? 'block' : 'none';
}

// ─── RANGE SETTERS ───────────────────────
function _updateChipGroup(containerId, activeBtn) {
    const c = document.getElementById(containerId);
    if (c) c.querySelectorAll('.range-chip').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

function setVolRange(n, btn) {
    _updateChipGroup('vol-chips', btn);
    const prefs = getAnalyticsPrefs(); prefs.volumeRange = n; saveAnalyticsPrefs(prefs);
    renderVolumeBarChart(getArchiveClean(), n);
}
function setMuscleRange(r, btn) {
    _updateChipGroup('muscle-chips', btn);
    const prefs = getAnalyticsPrefs(); prefs.muscleRange = r; saveAnalyticsPrefs(prefs);
    renderDonutChart(getArchiveClean(), r);
}
function setConsRange(n, btn) {
    _updateChipGroup('cons-chips', btn);
    const prefs = getAnalyticsPrefs(); prefs.consistencyRange = n; saveAnalyticsPrefs(prefs);
    renderConsistencyTrack(getArchiveClean(), n);
}
function setMicroPoints(n, btn) {
    _updateChipGroup('micro-pts-chips', btn);
    const prefs = getAnalyticsPrefs(); prefs.microPoints = n; saveAnalyticsPrefs(prefs);
    const sel = document.getElementById('micro-ex-selector');
    if (sel && sel.value) loadMicroData(sel.value);
}
function setMicroAxis(ax, btn) {
    const container = document.getElementById('micro-axis-chips');
    if (container) container.querySelectorAll('.range-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const prefs = getAnalyticsPrefs(); prefs.microAxis = ax; saveAnalyticsPrefs(prefs);
    const sel = document.getElementById('micro-ex-selector');
    if (sel && sel.value) loadMicroData(sel.value);
}

// ─── ANALYTICS SETTINGS SHEET ────────────
function openAnalyticsSettings() {
    const prefs = getAnalyticsPrefs();
    const nameEl = document.getElementById('pref-name');
    const unitsEl = document.getElementById('pref-units');
    const formulaEl = document.getElementById('pref-formula');
    if (nameEl) nameEl.value = prefs.name || '';
    if (unitsEl) unitsEl.value = prefs.units || 'kg';
    if (formulaEl) formulaEl.value = prefs.formula || 'epley';
    const overlay = document.getElementById('analytics-settings-overlay');
    const sheet = document.getElementById('analytics-settings-sheet');
    if (overlay) overlay.style.display = 'block';
    if (sheet) sheet.classList.add('open');
    haptic('light');
}
function closeAnalyticsSettings() {
    const overlay = document.getElementById('analytics-settings-overlay');
    const sheet = document.getElementById('analytics-settings-sheet');
    if (overlay) overlay.style.display = 'none';
    if (sheet) sheet.classList.remove('open');
}
function saveAnalyticsSettingsPrefs() {
    const prefs = getAnalyticsPrefs();
    const nameEl = document.getElementById('pref-name');
    const unitsEl = document.getElementById('pref-units');
    const formulaEl = document.getElementById('pref-formula');
    if (nameEl) prefs.name = nameEl.value.trim();
    if (unitsEl) prefs.units = unitsEl.value;
    if (formulaEl) prefs.formula = formulaEl.value;
    saveAnalyticsPrefs(prefs);
    closeAnalyticsSettings();
    renderAnalyticsDashboard();
    renderHeroCard();
    haptic('success');
}

// ─── HERO SETTINGS SHEET ─────────────────
const HERO_METRIC_OPTIONS = [
    { key: 'days',     label: 'ימים מאימון אחרון' },
    { key: 'vol',      label: 'נפח אימון אחרון' },
    { key: 'duration', label: 'משך אימון אחרון' },
    { key: 'avg_vol',  label: 'ממוצע נפח (4 אימונים)' },
    { key: 'total',    label: 'סך אימונים כולל' }
];

function openHeroSettings() {
    const prefs = getAnalyticsPrefs();
    const picker = document.getElementById('hero-metric-picker');
    if (!picker) return;
    picker.innerHTML = HERO_METRIC_OPTIONS.map(m => `
        <div class="flex-between border-bottom pb-sm">
            <label class="input-label m-0">${m.label}</label>
            <input type="checkbox" class="archive-checkbox" value="${m.key}"
                ${prefs.heroMetrics.includes(m.key) ? 'checked' : ''}
                onchange="onHeroMetricChange()">
        </div>`).join('');
    const overlay = document.getElementById('hero-settings-overlay');
    const sheet = document.getElementById('hero-settings-sheet');
    if (overlay) overlay.style.display = 'block';
    if (sheet) sheet.classList.add('open');
    haptic('light');
}
function onHeroMetricChange() {
    const checked = [...document.querySelectorAll('#hero-metric-picker input:checked')];
    if (checked.length > 3) checked[checked.length - 1].checked = false;
}
function closeHeroSettings() {
    const overlay = document.getElementById('hero-settings-overlay');
    const sheet = document.getElementById('hero-settings-sheet');
    if (overlay) overlay.style.display = 'none';
    if (sheet) sheet.classList.remove('open');
}
function saveHeroSettings() {
    const checked = [...document.querySelectorAll('#hero-metric-picker input:checked')].map(i => i.value);
    if (checked.length !== 3) { alert('יש לבחור בדיוק 3 מדדים'); return; }
    const prefs = getAnalyticsPrefs();
    prefs.heroMetrics = checked;
    saveAnalyticsPrefs(prefs);
    closeHeroSettings();
    renderHeroCard();
    haptic('success');
}
