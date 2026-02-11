// ===== 数据与工具 =====
const STORAGE_KEY = "ss_world_records";

const animalSounds = [
  "🐱 喵呜～",
  "🐱 喵喵喵",
  "🐶 汪汪！",
  "🐶 嗷呜～",
  "🐦 啾啾～",
  "🐦 叽叽叽",
  "🐸 呱呱～",
  "🐸 咕咕咕",
  "🐮 哞哞～",
  "🐷 哼哼～",
  "🐑 咩咩～",
  "🦊 嗷呜嗷",
  "🐯 吼吼～",
  "🐰 吱吱～",
  "🐹 啾啾啾",
  "🦆 嘎嘎嘎",
  "🐧 呜呜～",
  "🦉 咕咕～",
  "🐿️ 吱吱吱",
  "🦋 嗡嗡～",
  "🦁 嗷呜！",
  "🐨 嗯嗯～",
  "🐼 嗯呐～",
  "🦔 嘶嘶～",
  "🦝 呜呜～",
  "🦌 呦呦～",
  "🦩 嘎嘎～",
  "🦜 唧唧～",
  "🦫 啪啪～",
  "🐾 哒哒～",
];

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const CATEGORY_EMOJI = {
  时空: "🌌",
  宇宙: "🪐",
};

function getRandomSound() {
  return animalSounds[Math.floor(Math.random() * animalSounds.length)];
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("loadRecords error", e);
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error("saveRecords error", e);
    showToast("保存失败，可能空间已满");
    return false;
  }
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const w = WEEKDAYS[d.getDay()];
  return `${m}-${day} 周${w}`;
}

function getYearMonth(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { year: 0, month: 0 };
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/* 简单 HTML 转义与高亮 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const q = query.trim();
  if (!q) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reg = new RegExp(safe, "gi");
  return escaped.replace(reg, (m) => `<mark class="highlight">${m}</mark>`);
}

// ===== 日期搜索解析（根据 PRD 示例简化实现） =====
function parseMonthFromChinese(str) {
  const map = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    十一: 11,
    十二: 12,
  };
  return map[str] || null;
}

function parseWeekdayFromChinese(str) {
  const ch = str.replace(/^[周星期]/, "");
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  return map[ch] ?? null;
}

function parseDateQuery(query) {
  const q = query.trim();
  if (!q) return { type: "text" };

  // 纯数字年份，例如 2024 / 2024年
  if (/^\d{4}年?$/.test(q)) {
    return { type: "year", value: q.match(/\d{4}/)[0] };
  }

  // "1月" / "一月"
  if (/^[一二三四五六七八九十\d]{1,2}月$/.test(q)) {
    const inner = q.slice(0, -1);
    let m;
    if (/^\d+$/.test(inner)) {
      m = parseInt(inner, 10);
    } else {
      m = parseMonthFromChinese(inner);
    }
    if (m) return { type: "month", month: m };
  }

  // "1月15" / "1.15"
  if (/^\d{1,2}[月.]\d{1,2}$/.test(q)) {
    const m = q.match(/^(\d{1,2})[月.](\d{1,2})$/);
    if (m) {
      return {
        type: "date",
        month: parseInt(m[1], 10),
        day: parseInt(m[2], 10),
      };
    }
  }

  // "2024年1月"
  if (/^\d{4}年\d{1,2}月$/.test(q)) {
    const m = q.match(/^(\d{4})年(\d{1,2})月$/);
    if (m) {
      return {
        type: "year-month",
        year: parseInt(m[1], 10),
        month: parseInt(m[2], 10),
      };
    }
  }

  // "周四" / "星期四"
  if (/^[周星期][一二三四五六日天]$/.test(q)) {
    const w = parseWeekdayFromChinese(q);
    if (w != null) return { type: "weekday", weekday: w };
  }

  return { type: "text" };
}

// ===== 状态与 DOM 引用 =====
let records = [];
let filteredRecords = [];
let currentQuery = "";
let visibleCount = 20;
let editingId = null;
let pendingDeleteId = null;
let searchDebounceTimer = null;

const timelineContainer = document.getElementById("timelineContainer");
const loadMoreWrapper = document.getElementById("loadMoreWrapper");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const searchPanel = document.getElementById("searchPanel");
const searchInput = document.getElementById("searchInput");
const searchInfo = document.getElementById("searchInfo");
const searchClearBtn = document.getElementById("searchClearBtn");
const headerSearchBtn = document.querySelector(".header-search-btn");

const newRecordBtn = document.getElementById("newRecordBtn");

const editorView = document.getElementById("editorView");
const editorTitle = document.getElementById("editorTitle");
const backToHomeBtn = document.getElementById("backToHomeBtn");

const photoInput = document.getElementById("photoInput");
const photoPlaceholder = document.getElementById("photoPlaceholder");
const photoPreview = document.getElementById("photoPreview");
const photoError = document.getElementById("photoError");

const categoryButtons = document.querySelectorAll(".category-btn");
const categoryError = document.getElementById("categoryError");

const moodInput = document.getElementById("moodInput");
const moodCount = document.getElementById("moodCount");
const moodError = document.getElementById("moodError");

const saveRecordBtn = document.getElementById("saveRecordBtn");

const confirmDialogOverlay = document.getElementById("confirmDialogOverlay");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const toastEl = document.getElementById("toast");

// 当前表单状态
let formPhotoDataUrl = null;
let formCategory = null;

// ===== 初始化 =====
document.addEventListener("DOMContentLoaded", () => {
  records = loadRecords().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  filteredRecords = records.slice();
  renderTimeline();
  setupEventListeners();
});

// ===== 事件绑定 =====
function setupEventListeners() {
  headerSearchBtn.addEventListener("click", toggleSearchPanel);
  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentQuery = "";
    visibleCount = 20;
    filteredRecords = records.slice();
    renderTimeline();
    updateSearchInfo();
  });

  searchInput.addEventListener("input", () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentQuery = searchInput.value.trim();
      applySearch();
    }, 300);
  });

  newRecordBtn.addEventListener("click", () => {
    openEditorForCreate();
  });

  backToHomeBtn.addEventListener("click", () => {
    if (hasUnsavedChanges()) {
      const ok = window.confirm("有未保存内容，确定要返回吗？");
      if (!ok) return;
    }
    closeEditor();
  });

  photoInput.addEventListener("change", handlePhotoChange);

  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-category");
      setCategory(value);
    });
  });

  moodInput.addEventListener("input", () => {
    const len = moodInput.value.length;
    moodCount.textContent = `${len}/200字`;
    validateForm();
  });

  saveRecordBtn.addEventListener("click", handleSaveRecord);

  // 删除对话框
  cancelDeleteBtn.addEventListener("click", () => {
    pendingDeleteId = null;
    hideConfirmDialog();
  });
  confirmDeleteBtn.addEventListener("click", () => {
    if (pendingDeleteId) {
      deleteRecord(pendingDeleteId);
      pendingDeleteId = null;
    }
    hideConfirmDialog();
  });

  // 时间线中的编辑 / 删除（事件委托）
  timelineContainer.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-action='edit']");
    const delBtn = e.target.closest("[data-action='delete']");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      openEditorForEdit(id);
    } else if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      showConfirmDialog(id);
    }
  });

  loadMoreBtn.addEventListener("click", () => {
    visibleCount += 20;
    renderTimeline();
  });
}

// ===== 搜索逻辑 =====
function toggleSearchPanel() {
  const isCollapsed = searchPanel.classList.contains("collapsed");
  if (isCollapsed) {
    searchPanel.classList.remove("collapsed");
    searchPanel.classList.add("expanded");
    searchPanel.setAttribute("aria-hidden", "false");
    setTimeout(() => searchInput.focus(), 50);
  } else {
    searchPanel.classList.add("collapsed");
    searchPanel.classList.remove("expanded");
    searchPanel.setAttribute("aria-hidden", "true");
    searchInput.value = "";
    currentQuery = "";
    filteredRecords = records.slice();
    visibleCount = 20;
    renderTimeline();
    updateSearchInfo();
  }
}

function applySearch() {
  const q = currentQuery;
  if (!q) {
    filteredRecords = records.slice();
    visibleCount = 20;
    renderTimeline();
    updateSearchInfo();
    return;
  }

  const lower = q.toLowerCase();
  const parsed = parseDateQuery(q);
  const thisYear = new Date().getFullYear();

  filteredRecords = records.filter((rec) => {
    const mood = rec.mood || "";
    const category = rec.category || "";
    const created = new Date(rec.createdAt);

    // 文本 / 分类 / emoji 模糊匹配
    const emoji = CATEGORY_EMOJI[category] || "";
    const textMatch =
      mood.toLowerCase().includes(lower) ||
      category.includes(q) ||
      emoji.includes(q);

    if (parsed.type === "text") return textMatch;

    if (parsed.type === "year") {
      return created.getFullYear() === Number(parsed.value);
    }
    if (parsed.type === "month") {
      return (
        created.getFullYear() === thisYear &&
        created.getMonth() + 1 === parsed.month
      );
    }
    if (parsed.type === "date") {
      return (
        created.getFullYear() === thisYear &&
        created.getMonth() + 1 === parsed.month &&
        created.getDate() === parsed.day
      );
    }
    if (parsed.type === "year-month") {
      return (
        created.getFullYear() === parsed.year &&
        created.getMonth() + 1 === parsed.month
      );
    }
    if (parsed.type === "weekday") {
      return created.getDay() === parsed.weekday;
    }

    return textMatch;
  });

  visibleCount = 20;
  renderTimeline();
  updateSearchInfo();
}

function updateSearchInfo() {
  if (!currentQuery) {
    searchInfo.textContent = "";
    return;
  }
  const count = filteredRecords.length;
  if (count === 0) {
    searchInfo.innerHTML = `没有找到相关记录 🌿 换个关键词试试？`;
  } else {
    searchInfo.textContent = `找到 ${count} 条记录 📸`;
  }
}

// ===== 时间线渲染 =====
function renderTimeline() {
  timelineContainer.innerHTML = "";

  const source = filteredRecords.slice(0, visibleCount);

  if (source.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "empty-state";
    emptyDiv.innerHTML = `
      <div class="empty-state-title">还没有记录哦～</div>
      <div class="empty-state-text">
        点击上方按钮开始记录你的第一个游戏时刻吧 🌿
      </div>
    `;
    timelineContainer.appendChild(emptyDiv);
    loadMoreWrapper.classList.add("hidden");
    return;
  }

  // 按年-月分组
  const groups = new Map();
  source.forEach((rec) => {
    const { year, month } = getYearMonth(rec.createdAt);
    const key = `${year}-${month}`;
    if (!groups.has(key)) {
      groups.set(key, { year, month, items: [] });
    }
    groups.get(key).items.push(rec);
  });

  const sortedKeys = Array.from(groups.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  sortedKeys.forEach((g) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "month-group";

    const header = document.createElement("div");
    header.className = "month-header";
    header.innerHTML = `
      <span>${g.year}年${g.month}月</span>
      <div class="month-header-line"></div>
    `;
    groupDiv.appendChild(header);

    g.items.forEach((rec) => {
      const card = createRecordCard(rec);
      groupDiv.appendChild(card);
    });

    timelineContainer.appendChild(groupDiv);
  });

  // 是否需要显示"加载更多"
  if (filteredRecords.length > visibleCount) {
    loadMoreWrapper.classList.remove("hidden");
  } else {
    loadMoreWrapper.classList.add("hidden");
  }
}

function createRecordCard(rec) {
  const card = document.createElement("article");
  card.className = "record-card";

  const header = document.createElement("div");
  header.className = "record-header";
  const emoji = CATEGORY_EMOJI[rec.category] || "";
  header.innerHTML = `
    <div class="category-tag">
      <span>${emoji}</span>
      <span>${rec.category}</span>
    </div>
    <div class="record-date">${formatDateLabel(rec.createdAt)}</div>
  `;
  card.appendChild(header);

  if (rec.photo) {
    const photoWrap = document.createElement("div");
    photoWrap.className = "record-photo-wrapper";
    photoWrap.innerHTML = `<img class="record-photo" src="${rec.photo}" alt="游戏照片" />`;
    card.appendChild(photoWrap);
  }

  const moodDiv = document.createElement("div");
  moodDiv.className = "record-mood";
  if (currentQuery) {
    moodDiv.innerHTML = highlightText(rec.mood || "", currentQuery);
  } else {
    moodDiv.textContent = rec.mood || "";
  }
  card.appendChild(moodDiv);

  const animalDiv = document.createElement("div");
  animalDiv.className = "record-animal";
  animalDiv.textContent = rec.animalReply || "";
  card.appendChild(animalDiv);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "record-actions";
  actionsDiv.innerHTML = `
    <button class="record-action-btn" data-action="edit" data-id="${rec.id}">编辑</button>
    <button class="record-action-btn record-delete-btn" data-action="delete" data-id="${rec.id}">删除</button>
  `;
  card.appendChild(actionsDiv);

  return card;
}

// ===== 编辑 / 表单逻辑 =====
function resetForm() {
  formPhotoDataUrl = null;
  photoInput.value = "";
  photoPreview.src = "";
  photoPreview.classList.add("hidden");
  photoPlaceholder.classList.remove("hidden");
  photoError.classList.add("hidden");
  photoError.textContent = "";

  formCategory = null;
  categoryButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");
  });
  categoryError.classList.add("hidden");
  categoryError.textContent = "";

  moodInput.value = "";
  moodCount.textContent = "0/200字";
  moodError.classList.add("hidden");
  moodError.textContent = "";
}

function openEditorForCreate() {
  editingId = null;
  resetForm();
  editorTitle.textContent = "记录美好时刻";
  openEditor();
}

function openEditorForEdit(id) {
  const rec = records.find((r) => r.id === id);
  if (!rec) return;
  editingId = id;
  resetForm();

  // 预填充
  if (rec.photo) {
    formPhotoDataUrl = rec.photo;
    photoPreview.src = rec.photo;
    photoPreview.classList.remove("hidden");
    photoPlaceholder.classList.add("hidden");
  }
  if (rec.category) {
    setCategory(rec.category);
  }
  if (rec.mood) {
    moodInput.value = rec.mood;
    moodCount.textContent = `${rec.mood.length}/200字`;
  }

  editorTitle.textContent = "编辑记录";
  openEditor();
}

function openEditor() {
  editorView.classList.remove("hidden");
  requestAnimationFrame(() => {
    editorView.classList.add("active");
  });
  validateForm();
}

function closeEditor() {
  editorView.classList.remove("active");
  setTimeout(() => {
    editorView.classList.add("hidden");
  }, 300);
}

function handlePhotoChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!/image\/(jpeg|png)/.test(file.type)) {
    photoError.textContent = "只支持 JPG 或 PNG 格式";
    photoError.classList.remove("hidden");
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    formPhotoDataUrl = ev.target.result;
    photoPreview.src = formPhotoDataUrl;
    photoPreview.classList.remove("hidden");
    photoPlaceholder.classList.add("hidden");
    photoError.classList.add("hidden");
    validateForm();
  };
  reader.readAsDataURL(file);
}

function setCategory(value) {
  formCategory = value;
  categoryButtons.forEach((btn) => {
    const v = btn.getAttribute("data-category");
    btn.setAttribute("aria-pressed", v === value ? "true" : "false");
  });
  categoryError.classList.add("hidden");
  validateForm();
}

function hasUnsavedChanges() {
  return (
    formPhotoDataUrl !== null ||
    formCategory !== null ||
    (moodInput.value && moodInput.value.trim().length > 0)
  );
}

function validateForm() {
  let ok = true;

  if (!formPhotoDataUrl) {
    ok = false;
  }

  if (!formCategory) {
    ok = false;
  }

  const text = moodInput.value.trim();
  if (!text) {
    ok = false;
  }

  saveRecordBtn.disabled = !ok;
  return ok;
}

function handleSaveRecord() {
  if (!validateForm()) {
    if (!formPhotoDataUrl) {
      photoError.textContent = "请上传一张照片";
      photoError.classList.remove("hidden");
    }
    if (!formCategory) {
      categoryError.textContent = "请选择游戏分类";
      categoryError.classList.remove("hidden");
    }
    if (!moodInput.value.trim()) {
      moodError.textContent = "请写一点心情文字";
      moodError.classList.remove("hidden");
    }
    return;
  }

  const now = new Date().toISOString();
  const mood = moodInput.value.trim();

  if (editingId) {
    const idx = records.findIndex((r) => r.id === editingId);
    if (idx === -1) return;
    const old = records[idx];
    const updated = {
      ...old,
      photo: formPhotoDataUrl,
      category: formCategory,
      mood,
      updatedAt: now,
      // 叫声保持不变
    };
    records.splice(idx, 1, updated);
    showToast("已更新 🐶 汪汪！");
  } else {
    const newRecord = {
      id: uuidv4(),
      photo: formPhotoDataUrl,
      category: formCategory,
      mood,
      animalReply: getRandomSound(),
      createdAt: now,
      updatedAt: now,
    };
    records.unshift(newRecord);
    showToast("已保存 🐱 喵呜～");
  }

  if (!saveRecords(records)) {
    return;
  }

  filteredRecords = records.slice();
  visibleCount = 20;
  renderTimeline();
  closeEditor();
}

// ===== 删除逻辑 =====
function showConfirmDialog(id) {
  pendingDeleteId = id;
  confirmDialogOverlay.classList.remove("hidden");
  confirmDialogOverlay.setAttribute("aria-hidden", "false");
}

function hideConfirmDialog() {
  confirmDialogOverlay.classList.add("hidden");
  confirmDialogOverlay.setAttribute("aria-hidden", "true");
}

function deleteRecord(id) {
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return;
  records.splice(idx, 1);
  saveRecords(records);
  filteredRecords = records.slice();
  visibleCount = 20;
  renderTimeline();
  showToast("已删除 🍃");
}

// ===== Toast =====
let toastTimer = null;

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2000);
}