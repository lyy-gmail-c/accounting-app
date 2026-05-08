/**
 * MiniBook V3 - 手机端 UI 逻辑
 */

const MobileUI = {
  currentTab: 'record',
  currentType: 'expense',
  currentAmount: '',
  currentNote: '',
  currentDate: null,  // 延迟到 init() 中用 localToday() 赋值
  statsMonth: null,   // 延迟到 init() 中用 localMonth() 赋值

  // 手机端分类
  mobileCategories: {
    expense: [
      { id: 'clothing', name: '衣', pcId: 'e-life-clothing', icon: 'shirt', color: '#8E44AD' },
      { id: 'food', name: '食', pcId: 'e-life-food', icon: 'utensils', color: '#FF6B35' },
      { id: 'housing', name: '住', pcId: 'e-house-purchase', icon: 'sofa', color: '#795548' },
      { id: 'transport', name: '行', pcId: 'e-life-transport', icon: 'car', color: '#4ECDC4' },
      { id: 'other', name: '其他', pcId: null, icon: 'circle-help', color: '#95A5A6' },
    ],
    income: [
      { id: 'salary', name: '工资', pcId: 'i-personal-salary', icon: 'banknote', color: '#2CA87F' },
      { id: 'other', name: '其他', pcId: null, icon: 'circle-dot', color: '#95A5A6' },
    ],
  },

  init() {
    this.currentDate = localToday();
    this.statsMonth = localMonth();
    this.renderTabs();
    this.switchTab('record');
  },

  // ============ Tab 导航 ============
  renderTabs() {
    const tabs = document.getElementById('bottom-tabs');
    if (!tabs) return;
    tabs.innerHTML = `
      <div class="tab-item active" data-tab="record">
        ${Icons.get('pen-line', 22)}
        <span>记账</span>
      </div>
      <div class="tab-item" data-tab="detail">
        ${Icons.get('list', 22)}
        <span>明细</span>
      </div>
      <div class="tab-item" data-tab="stats">
        ${Icons.get('bar-chart-2', 22)}
        <span>统计</span>
      </div>
      <div class="tab-item" data-tab="profile">
        ${Icons.get('user', 22)}
        <span>我的</span>
      </div>
    `;
    tabs.querySelectorAll('.tab-item').forEach(item => {
      item.addEventListener('click', () => this.switchTab(item.dataset.tab));
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    // 更新 Tab 样式
    document.querySelectorAll('#bottom-tabs .tab-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    // 切换页面
    document.querySelectorAll('.mobile-page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`mobile-page-${tab}`);
    if (page) page.classList.add('active');

    // 按页面渲染
    if (tab === 'record') this.renderRecordPage();
    else if (tab === 'detail') this.renderDetailPage();
    else if (tab === 'stats') this.renderStatsPage();
    else if (tab === 'profile') this.renderProfilePage();
  },

  // ============ 记账页 ============
  async renderRecordPage() {
    const page = document.getElementById('mobile-page-record');
    if (!page) return;

    const cats = this.mobileCategories[this.currentType];
    const today = localToday();
    const dayStats = await getDayStats(today);

    page.innerHTML = `
      <div class="type-toggle">
        <div class="type-toggle-btn ${this.currentType === 'expense' ? 'active-expense' : ''}" data-type="expense">支出</div>
        <div class="type-toggle-btn ${this.currentType === 'income' ? 'active-income' : ''}" data-type="income">收入</div>
      </div>

      <div class="amount-section" id="amount-section">
        <div class="amount-label">金额</div>
        <div class="amount-display" id="amount-display">
          <span class="currency">¥</span>
          <span id="amount-text">${this.currentAmount || '0'}</span>
        </div>
        <input type="number" class="amount-input-hidden" id="amount-input"
               value="${this.currentAmount}" step="0.01" inputmode="decimal"
               placeholder="0.00">
      </div>

      <div class="note-section">
        <div class="note-icon">${Icons.get('pen-line', 18)}</div>
        <input type="text" class="note-input" id="note-input"
               placeholder="添加备注（可选）" value="${this.currentNote}">
      </div>

      <div class="date-section">
        <span class="date-label">日期</span>
        <input type="date" id="date-input" value="${this.currentDate}" style="width:auto;">
      </div>

      <div class="category-grid" id="category-grid">
        ${cats.map(c => `
          <div class="category-item" data-cat-id="${c.id}">
            <div class="cat-icon" style="background:${c.color}">
              ${Icons.get(c.icon, 22)}
            </div>
            <div class="cat-name">${c.name}</div>
          </div>
        `).join('')}
      </div>

      <div class="today-summary">
        <div class="today-header">
          <div class="today-title">今日记录</div>
          <div class="today-stats">
            支出 ¥${dayStats.totalExpense.toFixed(2)} · 收入 ¥${dayStats.totalIncome.toFixed(2)}
          </div>
        </div>
        <div class="today-list" id="today-list">
          ${this.renderTodayRecords(dayStats.records)}
        </div>
      </div>
    `;

    this.bindRecordEvents(page);
  },

  renderTodayRecords(records) {
    if (!records || records.length === 0) {
      return '<div class="empty-state"><div class="text-caption">今天还没有记录</div></div>';
    }
    return records.map(r => {
      const cat = this.findCategory(r);
      const amountClass = r.type === 'expense' ? 'amount-expense' : 'amount-income';
      const prefix = r.type === 'expense' ? '-' : '+';
      return `
        <div class="record-item" data-record-id="${r.id}">
          <div class="rec-icon" style="background:${cat.color}">
            ${Icons.get(cat.icon, 16)}
          </div>
          <div class="rec-info">
            <div class="rec-category">${cat.name}</div>
            <div class="rec-meta">${r.note ? r.note + ' · ' : ''}${r.time}</div>
          </div>
          <div class="rec-amount ${amountClass}">${prefix}¥${r.amount.toFixed(2)}</div>
        </div>
      `;
    }).join('');
  },

  findCategory(record) {
    // 从手机分类或PC分类查找
    const mobileCats = [...this.mobileCategories.expense, ...this.mobileCategories.income];
    const mc = mobileCats.find(c => c.pcId === record.categoryId);
    if (mc) return mc;

    // 从 PC 分类查找
    const pcCat = DEFAULT_CATEGORIES.find(c => c.id === record.categoryId);
    if (pcCat) return { name: pcCat.level2, icon: pcCat.icon, color: pcCat.color };

    return { name: '未分类', icon: 'circle-help', color: '#95A5A6' };
  },

  bindRecordEvents(page) {
    // 类型切换
    page.querySelectorAll('.type-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentType = btn.dataset.type;
        this.renderRecordPage();
      });
    });

    // 金额输入
    const amountSection = page.querySelector('#amount-section');
    const amountInput = page.querySelector('#amount-input');
    const amountText = page.querySelector('#amount-text');

    amountSection.addEventListener('click', () => {
      amountInput.focus();
    });

    amountInput.addEventListener('input', () => {
      this.currentAmount = amountInput.value;
      amountText.textContent = this.currentAmount || '0';
    });

    // 备注
    page.querySelector('#note-input').addEventListener('input', (e) => {
      this.currentNote = e.target.value;
    });

    // 日期
    page.querySelector('#date-input').addEventListener('change', (e) => {
      this.currentDate = e.target.value;
    });

    // 分类点击 → 保存
    page.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => this.saveRecord(item.dataset.catId));
    });

    // 今日记录点击 → 弹出编辑浮层
    page.querySelectorAll('.today-list .record-item[data-record-id]').forEach(item => {
      item.addEventListener('click', () => this.showEditSheet(item.dataset.recordId));
    });
  },

  async saveRecord(categoryMobileId) {
    if (!this.currentAmount || parseFloat(this.currentAmount) <= 0) {
      App.showToast('请输入金额');
      return;
    }

    const cats = this.mobileCategories[this.currentType];
    const cat = cats.find(c => c.id === categoryMobileId);
    if (!cat) return;

    const record = {
      date: this.currentDate,
      time: new Date().toTimeString().slice(0, 5),
      type: this.currentType,
      amount: this.currentAmount,
      categoryId: cat.pcId || (this.currentType === 'expense' ? 'e-life-misc' : 'i-other-misc'),
      note: this.currentNote,
      source: 'mobile',
      enriched: !!cat.pcId, // 有映射的为 true
    };

    await addRecord(record);

    // 震动反馈
    if (navigator.vibrate) navigator.vibrate(50);

    App.showToast('已保存');

    // 重置
    this.currentAmount = '';
    this.currentNote = '';
    this.currentDate = localToday();
    this.renderRecordPage();
  },

  // ============ 明细页（按月增量加载） ============
  detailState: {
    type: 'all',           // 'all' | 'expense' | 'income'
    monthsToLoad: [],      // 待加载月份列表（倒序，如 ['2026-05','2026-04',...]）
    loadedMonths: [],      // 已加载月份
    recordsByDate: {},     // 聚合后的 { 'YYYY-MM-DD': [records] }
    isLoading: false,
    hasMore: true,
    scrollHandler: null,   // 保存引用用于解绑
  },

  async renderDetailPage() {
    const page = document.getElementById('mobile-page-detail');
    if (!page) return;

    // 初始化状态：扫描所有记录，拿到所有出现过的月份（倒序）
    const allRecords = await getAll('records');
    const monthSet = new Set();
    for (const r of allRecords) {
      if (r.date) monthSet.add(r.date.slice(0, 7));
    }
    const allMonths = [...monthSet].sort((a, b) => b.localeCompare(a));

    this.detailState.monthsToLoad = allMonths;
    this.detailState.loadedMonths = [];
    this.detailState.recordsByDate = {};
    this.detailState.hasMore = allMonths.length > 0;
    this.detailState.isLoading = false;

    // 渲染骨架
    page.innerHTML = `
      <div class="detail-filter">
        <div class="filter-chip ${this.detailState.type === 'all' ? 'active' : ''}" data-type="all">全部</div>
        <div class="filter-chip ${this.detailState.type === 'expense' ? 'active' : ''}" data-type="expense">支出</div>
        <div class="filter-chip ${this.detailState.type === 'income' ? 'active' : ''}" data-type="income">收入</div>
      </div>
      <div id="detail-list"></div>
      <div id="detail-load-more" style="text-align:center;padding:16px;color:#999;font-size:12px;display:none"></div>
    `;

    // 绑定类型筛选
    page.querySelectorAll('.filter-chip[data-type]').forEach(el => {
      el.addEventListener('click', () => {
        this.detailState.type = el.dataset.type;
        this.renderDetailPage();
      });
    });

    // 加载第一个月
    await this.loadNextMonthOfDetail();

    // 绑定滚动监听（窗口级）—— 替换旧 handler
    if (this.detailState.scrollHandler) {
      window.removeEventListener('scroll', this.detailState.scrollHandler);
    }
    this.detailState.scrollHandler = () => {
      if (this.currentTab !== 'detail') return;
      if (this.detailState.isLoading || !this.detailState.hasMore) return;
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      // 距底部 ≤ 200px 时触发
      if (scrollY + viewportH >= docH - 200) {
        this.loadNextMonthOfDetail();
      }
    };
    window.addEventListener('scroll', this.detailState.scrollHandler, { passive: true });
  },

  async loadNextMonthOfDetail() {
    const st = this.detailState;
    if (st.isLoading || !st.hasMore) return;

    const nextMonth = st.monthsToLoad.shift();
    if (!nextMonth) {
      st.hasMore = false;
      this._updateDetailLoadMore();
      return;
    }

    st.isLoading = true;
    this._updateDetailLoadMore('加载中…');

    const dateFrom = nextMonth + '-01';
    // 月末：用下个月1号 - 1 天
    const [y, m] = nextMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0); // m 是 1-12，Date 的 month 0-11，传入 m 相当于下月，day=0 即上月末日
    const dateTo = localDateStr(lastDay);

    const filters = { dateFrom, dateTo };
    if (st.type !== 'all') filters.type = st.type;
    const records = await getRecordsByFilter(filters);

    for (const r of records) {
      if (!st.recordsByDate[r.date]) st.recordsByDate[r.date] = [];
      st.recordsByDate[r.date].push(r);
    }

    st.loadedMonths.push(nextMonth);
    st.hasMore = st.monthsToLoad.length > 0;
    st.isLoading = false;

    this._renderDetailList();
    this._updateDetailLoadMore();
  },

  _renderDetailList() {
    const list = document.getElementById('detail-list');
    if (!list) return;

    const st = this.detailState;
    const dates = Object.keys(st.recordsByDate).sort((a, b) => b.localeCompare(a));

    if (dates.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="text-caption">暂无记录</div></div>';
      return;
    }

    // 按月分段显示月份标题
    let html = '';
    let lastMonth = null;
    for (const date of dates) {
      const ym = date.slice(0, 7);
      if (ym !== lastMonth) {
        lastMonth = ym;
        html += `<div class="detail-month-divider">${ym}</div>`;
      }
      const recs = st.recordsByDate[date];
      const dayExpense = recs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      const dayIncome = recs.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
      html += `
        <div class="day-group">
          <div class="day-group-header">
            <span>${this.formatDate(date)}</span>
            <span>支 ¥${dayExpense.toFixed(0)} · 收 ¥${dayIncome.toFixed(0)}</span>
          </div>
          ${recs.map(r => this.renderDetailItem(r)).join('')}
        </div>
      `;
    }
    list.innerHTML = html;

    // 重新绑定左滑
    this.bindSwipeEvents(list);
  },

  _updateDetailLoadMore(text) {
    const el = document.getElementById('detail-load-more');
    if (!el) return;
    const st = this.detailState;
    if (text) {
      el.style.display = 'block';
      el.textContent = text;
    } else if (!st.hasMore) {
      if (st.loadedMonths.length > 0) {
        el.style.display = 'block';
        el.textContent = '— 已加载全部 —';
      } else {
        el.style.display = 'none';
      }
    } else {
      el.style.display = 'block';
      el.textContent = '上滑加载更早的记录';
    }
  },

  renderDetailItem(r) {
    const cat = this.findCategory(r);
    const amountClass = r.type === 'expense' ? 'amount-expense' : 'amount-income';
    const prefix = r.type === 'expense' ? '-' : '+';
    return `
      <div class="swipe-wrapper">
        <div class="record-item" data-record-id="${r.id}">
          <div class="rec-icon" style="background:${cat.color}">
            ${Icons.get(cat.icon, 16)}
          </div>
          <div class="rec-info">
            <div class="rec-category">${cat.name}</div>
            <div class="rec-meta">${r.note ? r.note + ' · ' : ''}${r.time}</div>
          </div>
          <div class="rec-amount ${amountClass}">${prefix}¥${r.amount.toFixed(2)}</div>
        </div>
      </div>
    `;
  },

  formatDate(dateStr) {
    return dateStr; // 直接显示 yyyy-mm-dd
  },

  // ============ 统计页 ============
  async renderStatsPage() {
    const page = document.getElementById('mobile-page-stats');
    if (!page) return;

    // 获取所有记录，按月汇总
    const allRecords = await getAll('records');
    const monthMap = {};
    let totalBalance = 0;

    for (const r of allRecords) {
      const ym = r.date.slice(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { expense: 0, income: 0 };
      if (r.type === 'expense') monthMap[ym].expense += r.amount;
      else if (r.type === 'income') monthMap[ym].income += r.amount;
    }

    // 按月份倒序
    const months = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));
    for (const ym of months) {
      monthMap[ym].balance = monthMap[ym].income - monthMap[ym].expense;
      totalBalance += monthMap[ym].balance;
    }

    page.innerHTML = `
      <div class="stats-total-balance">
        <div class="stats-total-label">总余额</div>
        <div class="stats-total-value ${totalBalance >= 0 ? 'amount-income' : 'amount-expense'}">
          ¥${totalBalance.toFixed(2)}
        </div>
      </div>

      <div class="stats-month-list">
        ${months.length === 0 ? '<div class="empty-state"><div class="text-caption">暂无数据</div></div>' : ''}
        ${months.map(ym => {
          const m = monthMap[ym];
          const [y, mo] = ym.split('-');
          return `
            <div class="stats-month-row">
              <div class="stats-month-label">${y}-${mo}</div>
              <div class="stats-month-numbers">
                <span class="amount-expense">支 ¥${m.expense.toFixed(0)}</span>
                <span class="amount-income">收 ¥${m.income.toFixed(0)}</span>
                <span class="${m.balance >= 0 ? 'amount-income' : 'amount-expense'}">余 ¥${m.balance.toFixed(0)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ============ 我的页 ============
  renderProfilePage() {
    const page = document.getElementById('mobile-page-profile');
    if (!page) return;

    page.innerHTML = `
      <div class="profile-section">
        <div class="profile-header">MiniBook</div>
        <div class="profile-subtitle">极简双端记账 · 数据自主</div>
      </div>
      <div class="menu-list">
        <div class="menu-item" id="menu-export">
          ${Icons.get('download', 20)}
          <div class="menu-label">导出数据 (JSON)</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" id="menu-import">
          ${Icons.get('upload', 20)}
          <div class="menu-label">导入数据 (JSON)</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" id="menu-clear">
          ${Icons.get('trash-2', 20)}
          <div class="menu-label">清除所有数据</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" id="menu-about">
          ${Icons.get('circle-help', 20)}
          <div class="menu-label">关于 MiniBook</div>
          <div class="menu-arrow">›</div>
        </div>
      </div>
    `;

    page.querySelector('#menu-export').addEventListener('click', () => this.handleExport());
    page.querySelector('#menu-import').addEventListener('click', () => this.handleImport());
    page.querySelector('#menu-clear').addEventListener('click', () => this.handleClear());
    page.querySelector('#menu-about').addEventListener('click', () => this.showAbout());
  },

  showAbout() {
    const html = `
      <div class="about-modal">
        <div class="about-header">
          <div class="about-title">关于 MiniBook</div>
          <button class="about-close" aria-label="关闭">✕</button>
        </div>
        <div class="about-body">
          <div class="about-tagline">极简记账 · 手机记账 PC 对账 · 数据本地存储</div>

          <div class="about-section">
            <div class="about-section-title">✨ 项目特点</div>
            <ul class="about-list">
              <li><strong>极简设计</strong>：零外部依赖，纯原生实现，启动即用</li>
              <li><strong>双端协作</strong>：手机快速记账，PC 多账户对账统计</li>
              <li><strong>数据安全</strong>：全部存于本地 IndexedDB，不上传任何服务器</li>
              <li><strong>离线可用</strong>：PWA 安装后无需网络也能使用</li>
            </ul>
          </div>

          <div class="about-section">
            <div class="about-section-title">🌐 在线访问</div>
            <a class="about-link" href="https://lyy-gmail-c.github.io/accounting-app/" target="_blank" rel="noopener">
              https://lyy-gmail-c.github.io/accounting-app/
            </a>
          </div>

          <div class="about-section">
            <div class="about-section-title">📱 手机端功能</div>
            <ul class="about-list">
              <li>支出 / 收入 快速记账</li>
              <li>5 大扁平分类（衣食住行 + 其他）</li>
              <li>今日记录摘要 + 月度统计</li>
              <li>JSON 数据导出（支持系统分享）</li>
            </ul>
          </div>

          <div class="about-section">
            <div class="about-section-title">💻 PC 端功能</div>
            <ul class="about-list">
              <li>支出 / 收入 / 转账 三种记账类型</li>
              <li>多账户管理 + 三级分类体系</li>
              <li>账户粒度对账统计 + 趋势图</li>
              <li>数据导入导出 + 智能补齐</li>
            </ul>
          </div>

          <div class="about-section">
            <div class="about-section-title">🛠 技术栈</div>
            <div class="about-tech">原生 HTML + JS + CSS · IndexedDB · Service Worker · GitHub Pages</div>
          </div>

          <div class="about-footer">MIT License · 个人项目 · 欢迎 Fork 自用</div>
        </div>
      </div>
      <div class="about-backdrop"></div>
    `;

    const wrap = document.createElement('div');
    wrap.className = 'about-wrap';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector('.about-close').addEventListener('click', close);
    wrap.querySelector('.about-backdrop').addEventListener('click', close);
  },

  async handleExport() {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const filename = `minibook_export_${localToday()}.json`;
    const blob = new Blob([json], { type: 'application/json' });

    // 优先尝试 Web Share API（支持分享文件）
    try {
      if (navigator.canShare && typeof File !== 'undefined') {
        const file = new File([blob], filename, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '记账数据备份',
            text: `MiniBook 导出数据 · ${localToday()}`,
          });
          App.showToast('已调起分享');
          return;
        }
      }
    } catch (err) {
      // AbortError = 用户取消分享，不当作错误，直接返回
      if (err && err.name === 'AbortError') {
        return;
      }
      console.warn('[share] 分享失败，回退到下载:', err);
    }

    // 回退：传统下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('已下载到本地');
  },

  handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await importData(data, { recalcBalance: true });
        App.showToast(`导入完成: ${result.added}条新增, ${result.skipped}条跳过`);
        this.switchTab(this.currentTab);
      } catch (err) {
        App.showToast('导入失败: ' + err.message);
      }
    };
    input.click();
  },

  handleClear() {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      if (confirm('再次确认：真的要删除所有记录吗？')) {
        clearStore('records').then(() => {
          recalculateAllBalances().then(() => {
            App.showToast('数据已清除');
            this.switchTab('record');
          });
        });
      }
    }
  },

  // ============ 编辑浮层 ============
  async showEditSheet(recordId) {
    const record = await get('records', recordId);
    if (!record) return;

    // 移除可能存在的旧浮层
    document.querySelector('.modal-overlay')?.remove();

    const cats = this.mobileCategories[record.type] || this.mobileCategories.expense;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="width:90%;max-width:360px">
        <div style="font-size:15px;font-weight:500;margin-bottom:16px">编辑记录</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:40px;font-size:12px;color:#999">金额</label>
            <input type="number" id="edit-amount" value="${record.amount}" step="0.01" 
              style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:40px;font-size:12px;color:#999">分类</label>
            <select id="edit-category" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px">
              ${cats.map(c => `<option value="${c.pcId || (record.type === 'expense' ? 'e-life-misc' : 'i-other-misc')}" ${record.categoryId === c.pcId ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:40px;font-size:12px;color:#999">备注</label>
            <input type="text" id="edit-note" value="${record.note || ''}" placeholder="可选"
              style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:40px;font-size:12px;color:#999">日期</label>
            <input type="date" id="edit-date" value="${record.date}"
              style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px">
          <button id="edit-delete" style="flex:1;padding:10px;background:#FFF0F0;color:#E84B4B;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer">删除</button>
          <button id="edit-cancel" style="flex:1;padding:10px;background:#F5F5F5;color:#333;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer">取消</button>
          <button id="edit-save" style="flex:1;padding:10px;background:#1A73E8;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#edit-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#edit-save').addEventListener('click', async () => {
      const newAmount = parseFloat(overlay.querySelector('#edit-amount').value);
      if (!newAmount || newAmount <= 0) { App.showToast('请输入金额'); return; }
      await updateRecord(recordId, {
        amount: newAmount,
        categoryId: overlay.querySelector('#edit-category').value,
        note: overlay.querySelector('#edit-note').value,
        date: overlay.querySelector('#edit-date').value,
      });
      overlay.remove();
      App.showToast('已更新');
      this.renderRecordPage();
    });

    overlay.querySelector('#edit-delete').addEventListener('click', async () => {
      if (confirm('确定要删除这条记录吗？')) {
        await deleteRecord(recordId);
        overlay.remove();
        App.showToast('已删除');
        this.renderRecordPage();
      }
    });
  },

  // ============ 左滑操作 ============
  bindSwipeEvents(container) {
    const items = container.querySelectorAll('.swipe-wrapper');
    items.forEach(wrapper => {
      const recordItem = wrapper.querySelector('.record-item');
      const recordId = recordItem?.dataset.recordId;
      if (!recordId) return;

      let startX = 0, currentX = 0, isDragging = false;
      const THRESHOLD = 60;

      // 添加操作按钮
      const actions = document.createElement('div');
      actions.className = 'swipe-actions';
      actions.innerHTML = `
        <div class="swipe-action-btn swipe-action-edit">编辑</div>
        <div class="swipe-action-btn swipe-action-delete">删除</div>
      `;
      wrapper.appendChild(actions);

      const onStart = (x) => { startX = x; isDragging = true; currentX = 0; };
      const onMove = (x) => {
        if (!isDragging) return;
        currentX = x - startX;
        if (currentX > 0) currentX = 0;
        if (currentX < -120) currentX = -120;
        recordItem.style.transform = `translateX(${currentX}px)`;
        recordItem.style.transition = 'none';
      };
      const onEnd = () => {
        isDragging = false;
        if (currentX < -THRESHOLD) {
          recordItem.style.transition = 'transform 200ms';
          recordItem.style.transform = 'translateX(-120px)';
        } else {
          recordItem.style.transition = 'transform 200ms';
          recordItem.style.transform = 'translateX(0)';
        }
      };

      // Touch events
      recordItem.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX));
      recordItem.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e.touches[0].clientX); });
      recordItem.addEventListener('touchend', onEnd);

      // Mouse events (desktop simulation)
      recordItem.addEventListener('mousedown', (e) => { onStart(e.clientX); e.preventDefault(); });
      document.addEventListener('mousemove', (e) => { if (isDragging) onMove(e.clientX); });
      document.addEventListener('mouseup', () => { if (isDragging) onEnd(); });

      // 操作按钮事件
      actions.querySelector('.swipe-action-edit').addEventListener('click', () => {
        recordItem.style.transition = 'transform 200ms';
        recordItem.style.transform = 'translateX(0)';
        this.showEditSheet(recordId);
      });
      actions.querySelector('.swipe-action-delete').addEventListener('click', async () => {
        if (confirm('确定删除？')) {
          await deleteRecord(recordId);
          App.showToast('已删除');
          // 从已加载状态里剔除，避免整页重刷丢失滚动位置
          const st = this.detailState;
          if (st && st.recordsByDate) {
            for (const d of Object.keys(st.recordsByDate)) {
              st.recordsByDate[d] = st.recordsByDate[d].filter(r => r.id !== recordId);
              if (st.recordsByDate[d].length === 0) delete st.recordsByDate[d];
            }
            this._renderDetailList();
          } else {
            this.renderDetailPage();
          }
        }
      });
    });
  },
};
