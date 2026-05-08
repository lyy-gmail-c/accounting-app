/**
 * MiniBook V3 - 数据层 (IndexedDB)
 * 4 表: records / categories / accounts / settings
 */

const DB_NAME = 'MiniBookV3';
const DB_VERSION = 1;

let db = null;

// ============ 默认数据 ============

const DEFAULT_CATEGORIES = [
  // 支出 - 生活 (sort 0~13)
  { id: 'e-life-food', type: 'expense', level1: '生活', level2: '饮食', icon: 'utensils', color: '#FF6B35', sort: 0 },
  { id: 'e-life-transport', type: 'expense', level1: '生活', level2: '交通', icon: 'car', color: '#4ECDC4', sort: 1 },
  { id: 'e-life-insurance', type: 'expense', level1: '生活', level2: '保险', icon: 'shield', color: '#5B8DEF', sort: 2 },
  { id: 'e-life-sport', type: 'expense', level1: '生活', level2: '运动', icon: 'dumbbell', color: '#43B882', sort: 3 },
  { id: 'e-life-medical', type: 'expense', level1: '生活', level2: '医药', icon: 'heart-pulse', color: '#E84B4B', sort: 4 },
  { id: 'e-life-entertainment', type: 'expense', level1: '生活', level2: '娱乐', icon: 'gamepad-2', color: '#9B59B6', sort: 5 },
  { id: 'e-life-daily', type: 'expense', level1: '生活', level2: '日用', icon: 'shopping-bag', color: '#F5A623', sort: 6 },
  { id: 'e-life-loss', type: 'expense', level1: '生活', level2: '盘亏', icon: 'trending-down', color: '#95A5A6', sort: 7 },
  { id: 'e-life-travel', type: 'expense', level1: '生活', level2: '出行', icon: 'plane', color: '#3498DB', sort: 8 },
  { id: 'e-life-telecom', type: 'expense', level1: '生活', level2: '通讯', icon: 'phone', color: '#1ABC9C', sort: 9 },
  { id: 'e-life-beauty', type: 'expense', level1: '生活', level2: '形体', icon: 'sparkles', color: '#E91E63', sort: 10 },
  { id: 'e-life-clothing', type: 'expense', level1: '生活', level2: '服装', icon: 'shirt', color: '#8E44AD', sort: 11 },
  { id: 'e-life-learning', type: 'expense', level1: '生活', level2: '学习', icon: 'book-open', color: '#2980B9', sort: 12 },
  { id: 'e-life-misc', type: 'expense', level1: '生活', level2: '未分类事项', icon: 'circle-help', color: '#95A5A6', sort: 13 },
  // 支出 - 家庭 (sort 100~110)
  { id: 'e-family-finance', type: 'expense', level1: '家庭', level2: 'Y家庭财务', icon: 'wallet', color: '#E67E22', sort: 100 },
  { id: 'e-family-daily', type: 'expense', level1: '家庭', level2: 'Y日常', icon: 'home', color: '#F39C12', sort: 101 },
  { id: 'e-family-baby', type: 'expense', level1: '家庭', level2: 'Y育婴', icon: 'baby', color: '#FF9FF3', sort: 102 },
  { id: 'e-family-tour', type: 'expense', level1: '家庭', level2: 'Y旅游', icon: 'map', color: '#00B894', sort: 103 },
  { id: 'e-family-food', type: 'expense', level1: '家庭', level2: 'Y餐饮', icon: 'chef-hat', color: '#FF6B35', sort: 104 },
  { id: 'e-family-transport', type: 'expense', level1: '家庭', level2: 'Y交通', icon: 'bus', color: '#4ECDC4', sort: 105 },
  { id: 'e-family-fun', type: 'expense', level1: '家庭', level2: 'Y娱乐', icon: 'clapperboard', color: '#9B59B6', sort: 106 },
  { id: 'e-family-wedding', type: 'expense', level1: '家庭', level2: 'Y婚礼', icon: 'heart', color: '#E84B4B', sort: 107 },
  { id: 'e-family-gift', type: 'expense', level1: '家庭', level2: 'Y礼品', icon: 'gift', color: '#E74C3C', sort: 108 },
  { id: 'e-family-renovation', type: 'expense', level1: '家庭', level2: 'Y装修', icon: 'hammer', color: '#D35400', sort: 109 },
  { id: 'e-family-filial', type: 'expense', level1: '家庭', level2: 'Y孝敬', icon: 'hand-heart', color: '#C0392B', sort: 110 },
  // 支出 - 他人 (sort 200~203)
  { id: 'e-others-renqing', type: 'expense', level1: '他人', level2: '人情', icon: 'users', color: '#9B59B6', sort: 200 },
  { id: 'e-others-face', type: 'expense', level1: '他人', level2: '面子', icon: 'smile', color: '#F1C40F', sort: 201 },
  { id: 'e-others-advance', type: 'expense', level1: '他人', level2: '垫付', icon: 'hand-coins', color: '#3498DB', sort: 202 },
  { id: 'e-others-elders', type: 'expense', level1: '他人', level2: '长辈', icon: 'crown', color: '#8E44AD', sort: 203 },
  // 支出 - 房屋 (sort 300~303)
  { id: 'e-house-rent', type: 'expense', level1: '房屋', level2: '房租', icon: 'building', color: '#34495E', sort: 300 },
  { id: 'e-house-utility', type: 'expense', level1: '房屋', level2: '水电', icon: 'zap', color: '#F39C12', sort: 301 },
  { id: 'e-house-purchase', type: 'expense', level1: '房屋', level2: '购置', icon: 'sofa', color: '#795548', sort: 302 },
  { id: 'e-house-move', type: 'expense', level1: '房屋', level2: '搬家', icon: 'truck', color: '#607D8B', sort: 303 },
  // 支出 - 投资 (sort 400~402)
  { id: 'e-invest-swim', type: 'expense', level1: '投资', level2: '游泳卡', icon: 'waves', color: '#00BCD4', sort: 400 },
  { id: 'e-invest-invoice', type: 'expense', level1: '投资', level2: '发票', icon: 'receipt', color: '#FF9800', sort: 401 },
  { id: 'e-invest-other', type: 'expense', level1: '投资', level2: '其他', icon: 'circle-dot', color: '#95A5A6', sort: 402 },
  // 收入 - 个人收入 (sort 0~4)
  { id: 'i-personal-salary', type: 'income', level1: '个人收入', level2: '工资', icon: 'banknote', color: '#2CA87F', sort: 0 },
  { id: 'i-personal-finance', type: 'income', level1: '个人收入', level2: '理财', icon: 'trending-up', color: '#27AE60', sort: 1 },
  { id: 'i-personal-gain', type: 'income', level1: '个人收入', level2: '盘盈', icon: 'plus-circle', color: '#2ECC71', sort: 2 },
  { id: 'i-personal-fund', type: 'income', level1: '个人收入', level2: '公积金', icon: 'landmark', color: '#3498DB', sort: 3 },
  { id: 'i-personal-medical', type: 'income', level1: '个人收入', level2: '医保', icon: 'shield-plus', color: '#1ABC9C', sort: 4 },
  // 收入 - 其他收入 (sort 100~103)
  { id: 'i-other-refund', type: 'income', level1: '其他收入', level2: '退款', icon: 'rotate-ccw', color: '#E67E22', sort: 100 },
  { id: 'i-other-misc', type: 'income', level1: '其他收入', level2: '其他', icon: 'circle-dot', color: '#95A5A6', sort: 101 },
  { id: 'i-other-share', type: 'income', level1: '其他收入', level2: '分摊费用收回', icon: 'split', color: '#9B59B6', sort: 102 },
  { id: 'i-other-swim', type: 'income', level1: '其他收入', level2: '游泳卡', icon: 'waves', color: '#00BCD4', sort: 103 },
  // 转账
  { id: 't-transfer', type: 'transfer', level1: '转账', level2: '转账', icon: 'arrow-right-left', color: '#F5A623', sort: 0 },
];

// 手机端扁平分类映射到 PC 三级分类
const MOBILE_CATEGORY_MAP = {
  '衣': 'e-life-clothing',
  '食': 'e-life-food',
  '住': 'e-house-purchase',
  '行': 'e-life-transport',
  '工资': 'i-personal-salary',
  // '其他' 需要手动/AI 补齐
};

const DEFAULT_ACCOUNTS = [
  { id: 'acc-wechat', name: '微信', icon: 'message-circle', color: '#07C160', balance: 0, sort: 0 },
  { id: 'acc-alipay', name: '支付宝', icon: 'scan', color: '#1677FF', balance: 0, sort: 1 },
  { id: 'acc-bank', name: '银行卡', icon: 'credit-card', color: '#F5A623', balance: 0, sort: 2 },
  { id: 'acc-cash', name: '现金', icon: 'coins', color: '#95A5A6', balance: 0, sort: 3 },
];

// ============ 数据库初始化 ============

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;

      // records 表
      if (!database.objectStoreNames.contains('records')) {
        const store = database.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('categoryId', 'categoryId', { unique: false });
        store.createIndex('accountId', 'accountId', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }

      // categories 表
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id' });
      }

      // accounts 表
      if (!database.objectStoreNames.contains('accounts')) {
        database.createObjectStore('accounts', { keyPath: 'id' });
      }

      // settings 表
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

async function initDB() {
  await openDB();
  // 初始化默认分类
  const cats = await getAll('categories');
  if (cats.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await put('categories', cat);
    }
  }
  // 初始化默认账户
  const accs = await getAll('accounts');
  if (accs.length === 0) {
    for (const acc of DEFAULT_ACCOUNTS) {
      await put('accounts', acc);
    }
  }
}

// ============ 通用 CRUD ============

function getTransaction(storeName, mode = 'readonly') {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function put(storeName, data) {
  return new Promise((resolve, reject) => {
    const store = getTransaction(storeName, 'readwrite');
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function get(storeName, id) {
  return new Promise((resolve, reject) => {
    const store = getTransaction(storeName, 'readonly');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const store = getTransaction(storeName, 'readonly');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function del(storeName, id) {
  return new Promise((resolve, reject) => {
    const store = getTransaction(storeName, 'readwrite');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const store = getTransaction(storeName, 'readwrite');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============ Records API ============

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function addRecord(record) {
  const data = {
    id: generateId(),
    date: record.date || localToday(),
    time: record.time || new Date().toTimeString().slice(0, 5),
    type: record.type, // 'expense' | 'income' | 'transfer'
    amount: parseFloat(record.amount),
    categoryId: record.categoryId || null,
    accountId: record.accountId || null,
    accountFromId: record.accountFromId || null, // 转账-转出
    accountToId: record.accountToId || null,     // 转账-转入
    note: record.note || '',
    source: record.source || 'pc',
    enriched: record.enriched !== undefined ? record.enriched : true,
    createdAt: Date.now(),
  };
  await put('records', data);
  // 更新账户余额
  if (data.type === 'expense' && data.accountId) {
    await updateAccountBalance(data.accountId, -data.amount);
  } else if (data.type === 'income' && data.accountId) {
    await updateAccountBalance(data.accountId, data.amount);
  } else if (data.type === 'transfer') {
    if (data.accountFromId) await updateAccountBalance(data.accountFromId, -data.amount);
    if (data.accountToId) await updateAccountBalance(data.accountToId, data.amount);
  }
  return data;
}

async function updateRecord(id, changes) {
  const existing = await get('records', id);
  if (!existing) throw new Error('Record not found');

  // 撤销旧的余额影响
  if (existing.type === 'expense' && existing.accountId) {
    await updateAccountBalance(existing.accountId, existing.amount);
  } else if (existing.type === 'income' && existing.accountId) {
    await updateAccountBalance(existing.accountId, -existing.amount);
  } else if (existing.type === 'transfer') {
    if (existing.accountFromId) await updateAccountBalance(existing.accountFromId, existing.amount);
    if (existing.accountToId) await updateAccountBalance(existing.accountToId, -existing.amount);
  }

  const updated = { ...existing, ...changes, updatedAt: Date.now() };
  await put('records', updated);

  // 应用新的余额影响
  if (updated.type === 'expense' && updated.accountId) {
    await updateAccountBalance(updated.accountId, -updated.amount);
  } else if (updated.type === 'income' && updated.accountId) {
    await updateAccountBalance(updated.accountId, updated.amount);
  } else if (updated.type === 'transfer') {
    if (updated.accountFromId) await updateAccountBalance(updated.accountFromId, -updated.amount);
    if (updated.accountToId) await updateAccountBalance(updated.accountToId, updated.amount);
  }

  return updated;
}

async function deleteRecord(id) {
  const existing = await get('records', id);
  if (!existing) return;

  // 撤销余额影响
  if (existing.type === 'expense' && existing.accountId) {
    await updateAccountBalance(existing.accountId, existing.amount);
  } else if (existing.type === 'income' && existing.accountId) {
    await updateAccountBalance(existing.accountId, -existing.amount);
  } else if (existing.type === 'transfer') {
    if (existing.accountFromId) await updateAccountBalance(existing.accountFromId, existing.amount);
    if (existing.accountToId) await updateAccountBalance(existing.accountToId, -existing.amount);
  }

  await del('records', id);
}

async function getRecordsByDate(date) {
  const all = await getAll('records');
  return all.filter(r => r.date === date).sort((a, b) => b.createdAt - a.createdAt);
}

async function getRecordsByMonth(yearMonth) {
  const all = await getAll('records');
  return all.filter(r => r.date.startsWith(yearMonth)).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}

async function getRecordsByFilter(filters = {}) {
  let records = await getAll('records');

  if (filters.dateFrom) records = records.filter(r => r.date >= filters.dateFrom);
  if (filters.dateTo) records = records.filter(r => r.date <= filters.dateTo);
  if (filters.type) records = records.filter(r => r.type === filters.type);
  if (filters.categoryId) records = records.filter(r => r.categoryId === filters.categoryId);
  if (filters.accountId) {
    records = records.filter(r =>
      r.accountId === filters.accountId ||
      r.accountFromId === filters.accountId ||
      r.accountToId === filters.accountId
    );
  }
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    records = records.filter(r => (r.note || '').toLowerCase().includes(kw));
  }
  if (filters.source) records = records.filter(r => r.source === filters.source);

  return records.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}

// ============ Accounts API ============

async function updateAccountBalance(accountId, delta) {
  const acc = await get('accounts', accountId);
  if (!acc) return;
  acc.balance = (acc.balance || 0) + delta;
  await put('accounts', acc);
}

async function recalculateAllBalances() {
  const accounts = await getAll('accounts');
  // 以 initialBalance 作为起点（向后兼容：旧数据无 initialBalance 字段时按 0 起算）
  for (const acc of accounts) {
    acc.balance = Number(acc.initialBalance) || 0;
    await put('accounts', acc);
  }
  // 叠加所有流水
  const records = await getAll('records');
  for (const r of records) {
    if (r.type === 'expense' && r.accountId) {
      await updateAccountBalance(r.accountId, -r.amount);
    } else if (r.type === 'income' && r.accountId) {
      await updateAccountBalance(r.accountId, r.amount);
    } else if (r.type === 'transfer') {
      if (r.accountFromId) await updateAccountBalance(r.accountFromId, -r.amount);
      if (r.accountToId) await updateAccountBalance(r.accountToId, r.amount);
    }
  }
}

// ============ Categories API ============

async function getCategoriesByType(type) {
  const all = await getAll('categories');
  return all.filter(c => c.type === type);
}

async function getCategoryTree(type) {
  const cats = await getCategoriesByType(type);
  const tree = {};
  for (const cat of cats) {
    if (!tree[cat.level1]) tree[cat.level1] = [];
    tree[cat.level1].push(cat);
  }
  return tree;
}

// ============ Settings API ============

async function getSetting(key, defaultValue = null) {
  const item = await get('settings', key);
  return item ? item.value : defaultValue;
}

async function setSetting(key, value) {
  await put('settings', { key, value });
}

// ============ 数据导入导出 ============

async function exportAllData() {
  const records = await getAll('records');
  const categories = await getAll('categories');
  const accounts = await getAll('accounts');
  const settings = await getAll('settings');
  return { records, categories, accounts, settings, exportedAt: new Date().toISOString(), version: 'v3' };
}

// ---- 分类配置 导入/导出 ----
async function exportCategoriesConfig() {
  const categories = (await getAll('categories')).slice().sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return (a.sort ?? 0) - (b.sort ?? 0);
  });
  return { type: 'minibook-categories', version: 'v3', exportedAt: new Date().toISOString(), categories };
}

/**
 * 导入分类配置
 * @param {Array} categories 分类数组
 * @param {Object} options { mode: 'replace' | 'merge' }
 *   replace: 清空 categories 表后整体写入（完全一致，包括顺序）
 *   merge:   按 id upsert，保留未出现在导入数据中的已有分类
 */
async function importCategoriesConfig(categories, options = {}) {
  const mode = options.mode || 'replace';
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('分类数据为空或格式不正确');
  }
  // 基础字段校验
  for (const c of categories) {
    if (!c.id || !c.type || !c.level1 || !c.level2) {
      throw new Error(`分类数据缺少必要字段: ${JSON.stringify(c).slice(0, 80)}`);
    }
  }
  const result = { added: 0, updated: 0, kept: 0 };
  if (mode === 'replace') {
    await clearStore('categories');
    for (const c of categories) {
      await put('categories', {
        id: c.id, type: c.type, level1: c.level1, level2: c.level2,
        icon: c.icon || 'circle-dot', color: c.color || '#95A5A6',
        sort: c.sort ?? 0,
      });
      result.added++;
    }
  } else {
    const existing = await getAll('categories');
    const existingMap = new Map(existing.map(c => [c.id, c]));
    for (const c of categories) {
      if (existingMap.has(c.id)) result.updated++; else result.added++;
      await put('categories', {
        id: c.id, type: c.type, level1: c.level1, level2: c.level2,
        icon: c.icon || 'circle-dot', color: c.color || '#95A5A6',
        sort: c.sort ?? 0,
      });
    }
    result.kept = existing.filter(c => !categories.find(x => x.id === c.id)).length;
  }
  return result;
}

// ---- 账户配置 导入/导出 ----
async function exportAccountsConfig() {
  const accounts = (await getAll('accounts')).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return { type: 'minibook-accounts', version: 'v3', exportedAt: new Date().toISOString(), accounts };
}

/**
 * 导入账户配置
 * @param {Array} accounts 账户数组
 * @param {Object} options { mode: 'replace' | 'merge', keepBalance: boolean, importInitialBalance: boolean }
 *   replace: 清空 accounts 表后整体写入
 *   merge:   按 id upsert，保留未出现在导入数据中的已有账户
 *   keepBalance: 是否保留运行中的 balance 字段（默认 true）；若导入 initialBalance 后会重算 balance，所以这个字段在重算后会被覆盖
 *   importInitialBalance: 是否导入文件中的 initialBalance（默认 false，保留现有 initialBalance）
 * 注意：账户余额是根据 records 自动计算的，导入后调用方应调用 recalculateAllBalances()
 */
async function importAccountsConfig(accounts, options = {}) {
  const mode = options.mode || 'replace';
  const keepBalance = options.keepBalance !== false; // 默认保留现有余额
  const importInitialBalance = options.importInitialBalance === true; // 默认不导入初始金额
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('账户数据为空或格式不正确');
  }
  for (const a of accounts) {
    if (!a.id || !a.name) {
      throw new Error(`账户数据缺少必要字段: ${JSON.stringify(a).slice(0, 80)}`);
    }
  }
  const result = { added: 0, updated: 0, kept: 0 };
  const existing = await getAll('accounts');
  const existingMap = new Map(existing.map(a => [a.id, a]));

  // 决定 initialBalance 的取值
  const pickInitial = (a, old) => {
    if (importInitialBalance && a.initialBalance != null) return Number(a.initialBalance) || 0;
    if (old && old.initialBalance != null) return Number(old.initialBalance) || 0;
    // 新账户且不从文件取，则默认 0
    return 0;
  };

  if (mode === 'replace') {
    await clearStore('accounts');
    for (const a of accounts) {
      const old = existingMap.get(a.id);
      const balance = keepBalance && old ? (old.balance ?? 0) : (a.balance ?? 0);
      await put('accounts', {
        id: a.id, name: a.name,
        icon: a.icon || 'wallet', color: a.color || '#95A5A6',
        balance, sort: a.sort ?? 0,
        initialBalance: pickInitial(a, old),
      });
      result.added++;
    }
  } else {
    for (const a of accounts) {
      const old = existingMap.get(a.id);
      if (old) result.updated++; else result.added++;
      const balance = keepBalance && old ? (old.balance ?? 0) : (a.balance ?? 0);
      await put('accounts', {
        id: a.id, name: a.name,
        icon: a.icon || 'wallet', color: a.color || '#95A5A6',
        balance, sort: a.sort ?? 0,
        initialBalance: pickInitial(a, old),
      });
    }
    result.kept = existing.filter(a => !accounts.find(x => x.id === a.id)).length;
  }
  return result;
}

/**
 * 全局导入：用一份完整的 exportAllData() JSON 全局覆盖当前数据库
 * 流程：清空 records / categories / accounts / settings → 按文件内容写入 → 重算余额
 * @param {Object} data exportAllData() 输出的 JSON
 */
async function importAllData(data) {
  if (!data || typeof data !== 'object') throw new Error('数据格式不正确');
  if (!Array.isArray(data.records) && !Array.isArray(data.accounts) && !Array.isArray(data.categories)) {
    throw new Error('文件不是有效的全局备份（缺少 records / accounts / categories 字段）');
  }
  // 全部清空
  await clearStore('records');
  await clearStore('categories');
  await clearStore('accounts');
  await clearStore('settings');

  // 按文件写入
  if (Array.isArray(data.categories)) {
    for (const c of data.categories) await put('categories', c);
  }
  if (Array.isArray(data.accounts)) {
    for (const a of data.accounts) await put('accounts', a);
  }
  if (Array.isArray(data.records)) {
    for (const r of data.records) await put('records', r);
  }
  if (Array.isArray(data.settings)) {
    for (const s of data.settings) await put('settings', s);
  }

  // 重算余额（基于 initialBalance + records）
  await recalculateAllBalances();

  return {
    records: (data.records || []).length,
    categories: (data.categories || []).length,
    accounts: (data.accounts || []).length,
    settings: (data.settings || []).length,
  };
}

async function importData(data, options = {}) {
  const result = { added: 0, skipped: 0, needEnrich: 0 };

  if (data.categories && options.importCategories) {
    await clearStore('categories');
    for (const cat of data.categories) await put('categories', cat);
  }

  if (data.accounts && options.importAccounts) {
    await clearStore('accounts');
    for (const acc of data.accounts) await put('accounts', acc);
  }

  if (data.records) {
    // insert 模式：直接追加，对已有 id 的记录重新生成 id 以避免覆盖
    const existing = await getAll('records');
    const existingIds = new Set(existing.map(r => r.id));

    for (const record of data.records) {
      const rec = { ...record };
      if (options.mode === 'insert') {
        // 强制生成新 id，避免覆盖
        if (!rec.id || existingIds.has(rec.id)) rec.id = generateId();
      } else {
        if (existingIds.has(rec.id) && !options.overwrite) {
          result.skipped++;
          continue;
        }
      }
      if (!rec.createdAt) rec.createdAt = Date.now();
      if (rec.source === undefined) rec.source = 'pc';
      if (rec.enriched === undefined) rec.enriched = true;
      await put('records', rec);
      existingIds.add(rec.id);
      result.added++;
      if (!rec.enriched) result.needEnrich++;
    }
  }

  if (options.recalcBalance) await recalculateAllBalances();
  return result;
}

/**
 * 解析 CSV 文本为 records 数组（匹配 exportCsv 的表头格式）
 * 表头: 日期,时间,类型,分类,金额,账户,转入账户,备注,来源
 */
function parseCsvToRecords(csvText, categories, accounts) {
  // 剥离 BOM
  let text = csvText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // 解析一行 CSV（支持带引号的字段）
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  // 建立名称 -> id 映射
  const catByLevel2 = {};
  for (const c of categories) catByLevel2[c.level2] = c;
  const accByName = {};
  for (const a of accounts) accByName[a.name] = a;

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseLine(line);
    // 至少需要 5 列（日期,时间,类型,分类,金额）
    if (cols.length < 5) continue;
    const [date, time, typeCn, catName, amountStr, accName = '', accToName = '', note = '', source = 'pc'] = cols;
    const type = typeCn === '支出' ? 'expense' : typeCn === '收入' ? 'income' : typeCn === '转账' ? 'transfer' : null;
    if (!type) continue;
    const amount = parseFloat(amountStr);
    if (!(amount > 0)) continue;

    const cat = catByLevel2[catName];
    const acc = accByName[accName];
    const accTo = accByName[accToName];

    const rec = {
      id: generateId(),
      date,
      time: time || '00:00',
      type,
      amount,
      categoryId: cat ? cat.id : (type === 'transfer' ? 't-transfer' : null),
      note,
      source: source || 'pc',
      enriched: true,
      createdAt: Date.now(),
    };
    if (type === 'transfer') {
      rec.accountFromId = acc ? acc.id : null;
      rec.accountToId = accTo ? accTo.id : null;
    } else {
      rec.accountId = acc ? acc.id : null;
    }
    records.push(rec);
  }
  return records;
}

/**
 * 预处理手机端记录（不写入数据库，返回待人工确认的 pending 列表）
 * 每条 pending 包含：原始字段、规则引擎预填充的 categoryId 与 accountId、
 * 以及置信度 confidence（high / medium / low）。
 * 由 UI 展示确认页，用户确认后再调用 commitMobileRecords 批量写入。
 */
async function prepareMobileImport(mobileRecords) {
  const result = { total: mobileRecords.length, pending: [] };

  for (const mr of mobileRecords) {
    // 支持 '支出'/'收入' 或 'expense'/'income' 两种写法
    let type;
    if (mr.type === 'expense' || mr.type === '支出') type = 'expense';
    else if (mr.type === 'income' || mr.type === '收入') type = 'income';
    else type = mr.amount < 0 ? 'expense' : 'income';

    // 规则引擎：预填充分类
    const mappedCatId = ruleEngineGuessCategory(mr, type);
    // 规则引擎：预填充账户
    const mappedAccId = ruleEngineGuessAccount(mr);

    // 计算置信度
    let confidence = 'low';
    if (mappedCatId && mappedAccId) confidence = 'high';
    else if (mappedCatId || mappedAccId) confidence = 'medium';

    result.pending.push({
      id: mr.id || generateId(),
      date: mr.date,
      time: mr.time || '00:00',
      type,
      amount: Math.abs(parseFloat(mr.amount)),
      note: mr.note || '',
      rawCategory: mr.category || '',
      categoryId: mappedCatId,
      accountId: mappedAccId,
      confidence,
      source: 'mobile',
    });
  }
  return result;
}

/**
 * 规则引擎：猜分类（当前只实现基础的扁平分类映射，备注 + 金额规则由后续完善）
 */
function ruleEngineGuessCategory(mr, type) {
  // 1. 原始分类直接命中
  if (mr.category && MOBILE_CATEGORY_MAP[mr.category]) {
    return MOBILE_CATEGORY_MAP[mr.category];
  }
  // 2. TODO: 基于 note 关键词的规则引擎（待用户提供示例数据后完善）
  //    例如：note 含 "滴滴/地铁/公交" → e-life-transport
  // 3. 兜底
  if (type === 'expense') return null; // 让用户手动选
  if (type === 'income') return mr.category === '工资' ? 'i-personal-salary' : null;
  return null;
}

/**
 * 规则引擎：猜账户（TODO: 待用户提供示例数据后完善）
 * 例如：note 含 "微信支付" → acc-wechat，含 "支付宝" → acc-alipay
 */
function ruleEngineGuessAccount(mr) {
  const note = (mr.note || '').toLowerCase();
  if (note.includes('微信')) return 'acc-wechat';
  if (note.includes('支付宝') || note.includes('alipay')) return 'acc-alipay';
  if (note.includes('银行') || note.includes('卡')) return 'acc-bank';
  if (note.includes('现金')) return 'acc-cash';
  return null;
}

/**
 * 将人工确认后的 pending 列表批量写入数据库
 */
async function commitMobileRecords(confirmedList) {
  const result = { added: 0 };
  for (const p of confirmedList) {
    const rec = {
      id: p.id,
      date: p.date,
      time: p.time || '00:00',
      type: p.type,
      amount: p.amount,
      categoryId: p.categoryId,
      accountId: p.accountId,
      note: p.note || '',
      source: 'mobile',
      enriched: true,
      createdAt: Date.now(),
    };
    await put('records', rec);
    result.added++;
  }
  await recalculateAllBalances();
  return result;
}

// 旧 API 保留以兼容老代码（直接使用 prepareMobileImport，不写库）
async function importMobileData(mobileRecords) {
  const prepared = await prepareMobileImport(mobileRecords);
  return { total: prepared.total, autoMapped: prepared.pending.filter(p => p.confidence === 'high').length, needEnrich: prepared.pending };
}

// ============ 统计 API ============

async function getMonthStats(yearMonth) {
  const records = await getRecordsByMonth(yearMonth);
  let totalExpense = 0, totalIncome = 0;
  const byCategory = {};

  for (const r of records) {
    if (r.type === 'expense') {
      totalExpense += r.amount;
      if (r.categoryId) {
        byCategory[r.categoryId] = (byCategory[r.categoryId] || 0) + r.amount;
      }
    } else if (r.type === 'income') {
      totalIncome += r.amount;
    }
  }

  return {
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    byCategory,
    recordCount: records.length,
  };
}

async function getDayStats(date) {
  const records = await getRecordsByDate(date);
  let totalExpense = 0, totalIncome = 0;

  for (const r of records) {
    if (r.type === 'expense') totalExpense += r.amount;
    else if (r.type === 'income') totalIncome += r.amount;
  }

  return { totalExpense, totalIncome, records };
}
