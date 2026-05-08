/**
 * MiniBook V3 - PC 端 UI 逻辑
 */

const DesktopUI = {
  currentNav: 'records',
  formType: 'expense',
  statsView: 'category',
  // 统计页时间范围
  statsRange: 'month', // 'month' | '3month' | '6month' | 'year' | 'custom'
  statsDateFrom: '',
  statsDateTo: '',

  // 筛选状态
  filters: {
    dateFrom: localMonth() + '-01',
    dateTo: localToday(),
    type: '',
    accountId: '',
    keyword: '',
  },

  init() {
    this.renderSidebar();
    this.switchNav('records');
  },

  // ============ 侧栏 ============
  renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-name">MiniBook</div>
        <div class="brand-sub">记账 V3</div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-item active" data-nav="records">
          ${Icons.get('list', 16)}
          <span>明细</span>
        </div>
        <div class="nav-item" data-nav="stats">
          ${Icons.get('bar-chart-2', 16)}
          <span>统计</span>
        </div>
        <div class="nav-item" data-nav="categories">
          ${Icons.get('tag', 16)}
          <span>分类管理</span>
        </div>
        <div class="nav-item" data-nav="accounts">
          ${Icons.get('wallet', 16)}
          <span>账户管理</span>
        </div>
        <div class="nav-item" data-nav="data">
          ${Icons.get('database', 16)}
          <span>数据管理</span>
        </div>
      </nav>
    `;
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.switchNav(item.dataset.nav));
    });
  },

  switchNav(nav) {
    this.currentNav = nav;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === nav);
    });
    document.querySelectorAll('.pc-page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`pc-page-${nav}`);
    if (page) page.classList.add('active');

    if (nav === 'records') this.renderRecordsPage();
    else if (nav === 'stats') this.renderStatsPage();
    else if (nav === 'categories') this.renderCategoriesPage();
    else if (nav === 'accounts') this.renderAccountsPage();
    else if (nav === 'data') this.renderDataPage();
  },

  // ============ 看板页 ============
  async renderDashboard() {
    const page = document.getElementById('pc-page-dashboard');
    if (!page) return;

    const yearMonth = localMonth();
    const stats = await getMonthStats(yearMonth);
    const accounts = await getAll('accounts');
    const today = localToday();
    const dayStats = await getDayStats(today);
    const categories = await getAll('categories');

    // 计算上月对比
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevStats = await getMonthStats(localMonth(prevMonth));
    const expenseChange = prevStats.totalExpense > 0 ? ((stats.totalExpense - prevStats.totalExpense) / prevStats.totalExpense * 100).toFixed(1) : '—';

    // 环形图数据
    const catEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const donutSvg = this.renderDonutSVG(catEntries, stats.totalExpense, categories, 100);

    page.innerHTML = `
      <div class="dashboard-cards">
        <div class="dash-card dash-card-expense">
          <div class="dash-card-label">本月支出</div>
          <div class="dash-card-value">¥${stats.totalExpense.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
          <div class="dash-card-sub">较上月 ${expenseChange === '—' ? '—' : (expenseChange >= 0 ? '+' : '') + expenseChange + '%'}</div>
        </div>
        <div class="dash-card dash-card-income">
          <div class="dash-card-label">本月收入</div>
          <div class="dash-card-value">¥${stats.totalIncome.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
        </div>
        <div class="dash-card dash-card-balance">
          <div class="dash-card-label">本月结余</div>
          <div class="dash-card-value">¥${stats.balance.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
        </div>
      </div>

      <div class="dashboard-body">
        <div>
          <div class="section-title">账户余额</div>
          <div class="account-grid">
            ${accounts.map(acc => `
              <div class="account-card">
                <div class="account-card-name">
                  <div class="acc-dot" style="background:${acc.color}"></div>
                  ${acc.name}
                </div>
                <div class="account-card-balance">¥${(acc.balance || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="section-title">本月分类占比</div>
          <div class="donut-section">
            ${donutSvg}
            <div class="donut-legend">
              ${catEntries.map(([catId, amount]) => {
                const cat = categories.find(c => c.id === catId) || { level2: '未知', color: '#95A5A6' };
                const pct = stats.totalExpense > 0 ? (amount / stats.totalExpense * 100).toFixed(1) : 0;
                return `
                  <div class="legend-item">
                    <div class="legend-color" style="background:${cat.color}"></div>
                    <span class="legend-name">${cat.level2}</span>
                    <span class="legend-pct">${pct}%</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-records">
        <div class="section-title">
          <span>今日记录 (${dayStats.records.length}笔)</span>
          <span class="link-btn" id="goto-records">查看全部 →</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th><th>类型</th><th>分类</th><th class="col-amount">金额</th><th>备注</th>
            </tr>
          </thead>
          <tbody>
            ${dayStats.records.slice(0, 10).map(r => {
              const cat = categories.find(c => c.id === r.categoryId) || { level2: '未分类' };
              const typeLabel = r.type === 'expense' ? '支出' : r.type === 'income' ? '收入' : '转账';
              const amountClass = r.type === 'expense' ? 'amount-expense' : r.type === 'income' ? 'amount-income' : 'amount-transfer';
              return `
                <tr>
                  <td class="col-time">${r.time}</td>
                  <td class="col-type"><span class="type-badge type-badge-${r.type}">${typeLabel}</span></td>
                  <td class="col-category">${cat.level2}</td>
                  <td class="col-amount ${amountClass}">${r.type === 'expense' ? '-' : '+'}¥${r.amount.toFixed(2)}</td>
                  <td class="col-note">${r.note || ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    page.querySelector('#goto-records')?.addEventListener('click', () => this.switchNav('records'));
  },

  renderDonutSVG(entries, total, categories, size) {
    if (!entries.length || total === 0) {
      return `<svg class="donut-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 12}" fill="none" stroke="#F0F0F0" stroke-width="12"/>
      </svg>`;
    }
    const cx = size / 2, cy = size / 2, r = size / 2 - 12;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    const arcs = entries.map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId) || { color: '#95A5A6' };
      const pct = amount / total;
      const dashLen = pct * circumference;
      const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${cat.color}" stroke-width="12"
        stroke-dasharray="${dashLen} ${circumference - dashLen}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dashLen;
      return arc;
    });
    return `<svg class="donut-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arcs.join('')}</svg>`;
  },

  // ============ 明细页 ============
  async renderRecordsPage() {
    const page = document.getElementById('pc-page-records');
    if (!page) return;

    const accounts = (await getAll('accounts')).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const categories = await getAll('categories');
    const expenseCats = this.getSortedCats(categories.filter(c => c.type === 'expense'));
    const incomeCats = this.getSortedCats(categories.filter(c => c.type === 'income'));

    // 构建分类选项
    const catOptionsExpense = expenseCats.map(c => `<option value="${c.id}">${c.level1} / ${c.level2}</option>`).join('');
    const catOptionsIncome = incomeCats.map(c => `<option value="${c.id}">${c.level1} / ${c.level2}</option>`).join('');

    page.innerHTML = `
      <!-- 记账表单 -->
      <div class="record-form" id="record-form">
        <div class="form-group">
          <label>类型</label>
          <div class="form-type-toggle" id="form-type-toggle">
            <div class="form-type-btn active-expense" data-type="expense">支出</div>
            <div class="form-type-btn" data-type="income">收入</div>
            <div class="form-type-btn" data-type="transfer">转账</div>
          </div>
        </div>
        <div class="form-group">
          <label>金额</label>
          <input type="number" class="input" id="form-amount" step="0.01" placeholder="0.00" style="width:80px">
        </div>
        <div class="form-group" id="form-cat-group">
          <label>分类</label>
          <select class="input" id="form-category" style="min-width:120px">
            ${catOptionsExpense}
          </select>
        </div>
        <div class="form-group" id="form-account-group">
          <label>账户</label>
          <select class="input" id="form-account">
            ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="form-transfer-group" style="display:none">
          <label>转入账户</label>
          <select class="input" id="form-account-to">
            ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>备注</label>
          <input type="text" class="input" id="form-note" placeholder="可选" style="width:200px">
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" class="input" id="form-date" value="${localToday()}">
        </div>
        <button class="form-submit" id="form-submit">保存</button>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-panel" id="filter-panel">
        <input type="date" class="input" id="filter-from" value="${this.filters.dateFrom}" style="width:110px">
        <span style="color:var(--color-text-muted)">~</span>
        <input type="date" class="input" id="filter-to" value="${this.filters.dateTo}" style="width:110px">
        <div class="filter-tag ${this.filters.type === '' ? 'active' : ''}" data-filter-type="">全部</div>
        <div class="filter-tag ${this.filters.type === 'expense' ? 'active' : ''}" data-filter-type="expense">支出</div>
        <div class="filter-tag ${this.filters.type === 'income' ? 'active' : ''}" data-filter-type="income">收入</div>
        <div class="filter-tag ${this.filters.type === 'transfer' ? 'active' : ''}" data-filter-type="transfer">转账</div>
        <input type="text" class="filter-search" id="filter-keyword" placeholder="搜索备注..." value="${this.filters.keyword}">
        <div class="filter-summary" id="filter-summary"></div>
      </div>

      <!-- 明细表格 -->
      <table class="data-table" id="records-table">
        <thead>
          <tr>
            <th class="col-date">日期</th>
            <th class="col-time">时间</th>
            <th class="col-type">类型</th>
            <th class="col-category">分类</th>
            <th class="col-amount">金额</th>
            <th class="col-account">账户</th>
            <th class="col-account-to">转入账户</th>
            <th class="col-note">备注</th>
            <th class="col-source">来源</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody id="records-tbody"></tbody>
      </table>
    `;

    this.bindFormEvents(page, accounts, categories);
    this.bindFilterEvents(page, accounts);
    await this.refreshTable(categories, accounts);
  },

  bindFormEvents(page, accounts, categories) {
    const typeToggle = page.querySelector('#form-type-toggle');
    const catSelect = page.querySelector('#form-category');
    const accountGroup = page.querySelector('#form-account-group');
    const transferGroup = page.querySelector('#form-transfer-group');

    // 类型切换
    typeToggle.querySelectorAll('.form-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        typeToggle.querySelectorAll('.form-type-btn').forEach(b => b.className = 'form-type-btn');
        btn.classList.add(`active-${btn.dataset.type}`);
        this.formType = btn.dataset.type;

        // 更新分类选项（按 sort 排序）
        const cats = this.getSortedCats(categories.filter(c => c.type === this.formType));
        catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.level1} / ${c.level2}</option>`).join('');

        // 转账显示/隐藏
        if (this.formType === 'transfer') {
          accountGroup.querySelector('label').textContent = '转出账户';
          transferGroup.style.display = '';
          page.querySelector('#form-cat-group').style.display = 'none';
        } else {
          accountGroup.querySelector('label').textContent = '账户';
          transferGroup.style.display = 'none';
          page.querySelector('#form-cat-group').style.display = '';
        }
      });
    });

    // 保存
    const submitBtn = page.querySelector('#form-submit');
    submitBtn.addEventListener('click', () => this.submitForm(page, accounts, categories));

    // Enter 保存
    page.querySelector('#form-note').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitForm(page, accounts, categories);
    });
    page.querySelector('#form-amount').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitForm(page, accounts, categories);
    });
  },

  async submitForm(page, accounts, categories) {
    const amount = page.querySelector('#form-amount').value;
    if (!amount || parseFloat(amount) <= 0) {
      App.showToast('请输入金额');
      return;
    }

    const record = {
      type: this.formType,
      amount: amount,
      date: page.querySelector('#form-date').value,
      time: new Date().toTimeString().slice(0, 5),
      note: page.querySelector('#form-note').value,
      source: 'pc',
    };

    if (this.formType === 'transfer') {
      record.accountFromId = page.querySelector('#form-account').value;
      record.accountToId = page.querySelector('#form-account-to').value;
      record.categoryId = 't-transfer';
    } else {
      record.categoryId = page.querySelector('#form-category').value;
      record.accountId = page.querySelector('#form-account').value;
    }

    await addRecord(record);
    App.showToast('已保存');

    // 清空表单（保留类型和账户）
    page.querySelector('#form-amount').value = '';
    page.querySelector('#form-note').value = '';
    page.querySelector('#form-amount').focus();

    await this.refreshTable(categories, accounts);
  },

  bindFilterEvents(page, accounts) {
    // 日期范围
    page.querySelector('#filter-from').addEventListener('change', (e) => {
      this.filters.dateFrom = e.target.value;
      this.applyFilters(page);
    });
    page.querySelector('#filter-to').addEventListener('change', (e) => {
      this.filters.dateTo = e.target.value;
      this.applyFilters(page);
    });

    // 类型筛选
    page.querySelectorAll('[data-filter-type]').forEach(el => {
      el.addEventListener('click', () => {
        this.filters.type = el.dataset.filterType;
        page.querySelectorAll('[data-filter-type]').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        this.applyFilters(page);
      });
    });

    // 关键词搜索
    let searchTimeout;
    page.querySelector('#filter-keyword').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filters.keyword = e.target.value;
        this.applyFilters(page);
      }, 300);
    });
  },

  async applyFilters(page) {
    const categories = await getAll('categories');
    const accounts = await getAll('accounts');
    await this.refreshTable(categories, accounts);
  },

  async refreshTable(categories, accounts) {
    const filters = {};
    if (this.filters.dateFrom) filters.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) filters.dateTo = this.filters.dateTo;
    if (this.filters.type) filters.type = this.filters.type;
    if (this.filters.accountId) filters.accountId = this.filters.accountId;
    if (this.filters.keyword) filters.keyword = this.filters.keyword;

    const records = await getRecordsByFilter(filters);

    // 更新汇总
    let totalExp = 0, totalInc = 0;
    records.forEach(r => {
      if (r.type === 'expense') totalExp += r.amount;
      else if (r.type === 'income') totalInc += r.amount;
    });
    const summary = document.getElementById('filter-summary');
    if (summary) {
      summary.textContent = `支出 ¥${totalExp.toFixed(0)} · 收入 ¥${totalInc.toFixed(0)} · 共${records.length}条`;
    }

    // 渲染表格
    const tbody = document.getElementById('records-tbody');
    if (!tbody) return;

    tbody.innerHTML = records.map(r => {
      const cat = categories.find(c => c.id === r.categoryId) || { level2: '—' };
      const acc = accounts.find(a => a.id === (r.accountId || r.accountFromId)) || { name: '—' };
      const accTo = r.type === 'transfer' ? (accounts.find(a => a.id === r.accountToId) || { name: '—' }).name : '';
      const typeLabel = r.type === 'expense' ? '支出' : r.type === 'income' ? '收入' : '转账';
      const amountClass = `amount-${r.type}`;
      const prefix = r.type === 'expense' ? '-' : r.type === 'income' ? '+' : '';
      const sourceClass = r.source === 'mobile' ? 'source-mobile' : 'source-pc';
      const sourceLabel = r.source === 'mobile' ? '手机' : 'PC';

      return `
        <tr data-id="${r.id}">
          <td class="col-date">${r.date.slice(5)}</td>
          <td class="col-time">${r.time}</td>
          <td class="col-type"><span class="type-badge type-badge-${r.type}">${typeLabel}</span></td>
          <td class="col-category">${cat.level2}</td>
          <td class="col-amount ${amountClass}">${prefix}¥${r.amount.toFixed(2)}</td>
          <td class="col-account">${acc.name}</td>
          <td class="col-account-to">${accTo}</td>
          <td class="col-note">${r.note || ''}</td>
          <td class="col-source"><span class="${sourceClass}">${sourceLabel}</span></td>
          <td class="col-actions">
            <button class="btn btn-ghost row-edit-btn" data-id="${r.id}" style="padding:2px 6px;font-size:10px">编辑</button>
            <button class="btn btn-ghost row-delete-btn" data-id="${r.id}" style="padding:2px 6px;font-size:10px;color:var(--color-error)">删除</button>
          </td>
        </tr>
      `;
    }).join('');

    // 绑定编辑/删除事件
    tbody.querySelectorAll('.row-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showEditModal(btn.dataset.id, categories, accounts));
    });
    tbody.querySelectorAll('.row-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('确定要删除这条记录吗？')) {
          await deleteRecord(btn.dataset.id);
          App.showToast('已删除');
          await this.refreshTable(categories, accounts);
        }
      });
    });
  },

  // ============ 编辑模态框 ============
  async showEditModal(recordId, categories, accounts, onSaved) {
    const record = await get('records', recordId);
    if (!record) return;

    document.querySelector('.modal-overlay')?.remove();

    const typeCats = this.getSortedCats(categories.filter(c => c.type === record.type));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div style="font-size:15px;font-weight:500;margin-bottom:16px">编辑记录</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:50px;font-size:12px;color:#999">金额</label>
            <input type="number" id="pc-edit-amount" value="${record.amount}" step="0.01"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:50px;font-size:12px;color:#999">分类</label>
            <select id="pc-edit-category" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:12px">
              ${typeCats.map(c => `<option value="${c.id}" ${record.categoryId === c.id ? 'selected' : ''}>${c.level1} / ${c.level2}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:50px;font-size:12px;color:#999">账户</label>
            <select id="pc-edit-account" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:12px">
              ${accounts.map(a => `<option value="${a.id}" ${(record.accountId || record.accountFromId) === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
          </div>
          <div style="display:${record.type === 'transfer' ? 'flex' : 'none'};align-items:center;gap:8px" id="pc-edit-account-to-group">
            <label style="width:50px;font-size:12px;color:#999">转入</label>
            <select id="pc-edit-account-to" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:12px">
              ${accounts.map(a => `<option value="${a.id}" ${record.accountToId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:50px;font-size:12px;color:#999">备注</label>
            <input type="text" id="pc-edit-note" value="${record.note || ''}" placeholder="可选"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:50px;font-size:12px;color:#999">日期</label>
            <input type="date" id="pc-edit-date" value="${record.date}"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
          <button id="pc-edit-cancel" class="btn btn-ghost">取消</button>
          <button id="pc-edit-save" class="btn btn-primary">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#pc-edit-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#pc-edit-save').addEventListener('click', async () => {
      const newAmount = parseFloat(overlay.querySelector('#pc-edit-amount').value);
      if (!newAmount || newAmount <= 0) { App.showToast('请输入金额'); return; }
      const changes = {
        amount: newAmount,
        categoryId: overlay.querySelector('#pc-edit-category').value,
        note: overlay.querySelector('#pc-edit-note').value,
        date: overlay.querySelector('#pc-edit-date').value,
      };
      if (record.type !== 'transfer') {
        changes.accountId = overlay.querySelector('#pc-edit-account').value;
      } else {
        changes.accountFromId = overlay.querySelector('#pc-edit-account').value;
        changes.accountToId = overlay.querySelector('#pc-edit-account-to').value;
      }
      await updateRecord(recordId, changes);
      overlay.remove();
      App.showToast('已更新');
      if (typeof onSaved === 'function') {
        await onSaved();
      } else {
        await this.refreshTable(categories, accounts);
      }
    });
  },

  // ============ 统计页 ============

  /** 根据当前 statsRange 计算 dateFrom / dateTo */
  getStatsDateRange() {
    const now = new Date();
    const today = localToday(now);
    let from, to;
    switch (this.statsRange) {
      case 'month': {
        const ym = localMonth(now);
        from = ym + '-01';
        to = today;
        break;
      }
      case '3month': {
        const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        from = localDateStr(d);
        to = today;
        break;
      }
      case '6month': {
        const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        from = localDateStr(d);
        to = today;
        break;
      }
      case 'year': {
        from = now.getFullYear() + '-01-01';
        to = today;
        break;
      }
      case 'custom': {
        from = this.statsDateFrom || now.getFullYear() + '-01-01';
        to = this.statsDateTo || today;
        break;
      }
      default:
        from = localMonth(now) + '-01';
        to = today;
    }
    return { from, to };
  },

  /** 获取 dateFrom ~ dateTo 覆盖的所有月份 ['2026-01', '2026-02', ...] */
  getMonthsBetween(dateFrom, dateTo) {
    const months = [];
    const [y1, m1] = dateFrom.split('-').map(Number);
    const [y2, m2] = dateTo.split('-').map(Number);
    let y = y1, m = m1;
    while (y < y2 || (y === y2 && m <= m2)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  },

  /** 渲染 SVG 折线图 */
  renderLineChartSVG(monthlyData) {
    if (!monthlyData.length) return '<div class="empty-state">暂无数据</div>';

    const W = 680, H = 300;
    const padL = 60, padR = 20, padT = 30, padB = 50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // 计算数据范围
    let maxVal = 0;
    for (const d of monthlyData) {
      maxVal = Math.max(maxVal, d.expense, d.income, Math.abs(d.balance));
    }
    if (maxVal === 0) maxVal = 100;
    // 上下留 10% 余量
    const ceil = maxVal * 1.1;
    // 结余可能为负
    let minVal = 0;
    for (const d of monthlyData) {
      minVal = Math.min(minVal, d.balance);
    }
    const floor = minVal < 0 ? minVal * 1.1 : 0;
    const range = ceil - floor || 1;

    const xStep = monthlyData.length > 1 ? chartW / (monthlyData.length - 1) : chartW / 2;

    const toX = (i) => padL + (monthlyData.length > 1 ? i * xStep : chartW / 2);
    const toY = (v) => padT + chartH - ((v - floor) / range * chartH);

    // 生成路径
    const makePath = (key) => {
      return monthlyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(' ');
    };

    // Y 轴刻度（5 条线）
    const yTicks = 5;
    let gridLines = '';
    let yLabels = '';
    for (let i = 0; i <= yTicks; i++) {
      const val = floor + (range * i / yTicks);
      const y = toY(val);
      gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#F0F0F0" stroke-width="0.5"/>`;
      const label = Math.abs(val) >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toFixed(0);
      yLabels += `<text x="${padL - 8}" y="${y + 3}" text-anchor="end" fill="#999" font-size="10">${label}</text>`;
    }

    // X 轴标签
    let xLabels = '';
    // 如果月份太多，间隔显示
    const labelEvery = monthlyData.length > 12 ? 3 : monthlyData.length > 6 ? 2 : 1;
    monthlyData.forEach((d, i) => {
      if (i % labelEvery === 0 || i === monthlyData.length - 1) {
        const parts = d.month.split('-');
        const label = parseInt(parts[1]) + '月';
        xLabels += `<text x="${toX(i)}" y="${H - padB + 18}" text-anchor="middle" fill="#999" font-size="10">${parts[0].slice(2)}/${label}</text>`;
      }
    });

    // 数据点 + Tooltip
    const makeDots = (key, color) => {
      return monthlyData.map((d, i) => {
        const x = toX(i), y = toY(d[key]);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}" stroke="#fff" stroke-width="1.5" class="chart-dot">
          <title>${d.month} ${key === 'expense' ? '支出' : key === 'income' ? '收入' : '结余'}: ¥${d[key].toFixed(2)}</title>
        </circle>`;
      }).join('');
    };

    return `
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block">
        <!-- 网格 -->
        ${gridLines}
        ${yLabels}
        ${xLabels}
        <!-- 折线 -->
        <path d="${makePath('expense')}" fill="none" stroke="var(--color-expense)" stroke-width="2" stroke-linejoin="round"/>
        <path d="${makePath('income')}" fill="none" stroke="var(--color-income)" stroke-width="2" stroke-linejoin="round"/>
        <path d="${makePath('balance')}" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round"/>
        <!-- 数据点 -->
        ${makeDots('expense', 'var(--color-expense)')}
        ${makeDots('income', 'var(--color-income)')}
        ${makeDots('balance', 'var(--color-brand)')}
      </svg>
      <div class="chart-legend">
        <span class="chart-legend-item"><span class="chart-legend-line" style="background:var(--color-expense)"></span>支出</span>
        <span class="chart-legend-item"><span class="chart-legend-line" style="background:var(--color-income)"></span>收入</span>
        <span class="chart-legend-item"><span class="chart-legend-line chart-legend-line-dashed" style="background:var(--color-brand)"></span>结余</span>
      </div>
    `;
  },

  async renderStatsPage() {
    const page = document.getElementById('pc-page-stats');
    if (!page) return;

    const categories = await getAll('categories');
    const accounts = await getAll('accounts');
    const { from, to } = this.getStatsDateRange();

    // 获取时间范围内所有记录
    const allRecords = await getRecordsByFilter({ dateFrom: from, dateTo: to });

    // 汇总
    let totalExpense = 0, totalIncome = 0;
    const byCategory = {};
    const accStats = {};
    for (const acc of accounts) {
      accStats[acc.id] = { expense: 0, income: 0, name: acc.name, color: acc.color };
    }

    for (const r of allRecords) {
      if (r.type === 'expense') {
        totalExpense += r.amount;
        if (r.categoryId) byCategory[r.categoryId] = (byCategory[r.categoryId] || 0) + r.amount;
      } else if (r.type === 'income') {
        totalIncome += r.amount;
      }
      const accId = r.accountId || r.accountFromId;
      if (accId && accStats[accId]) {
        if (r.type === 'expense') accStats[accId].expense += r.amount;
        else if (r.type === 'income') accStats[accId].income += r.amount;
      }
    }
    const balance = totalIncome - totalExpense;

    // 月度折线图数据
    const months = this.getMonthsBetween(from, to);
    const monthlyData = months.map(m => ({ month: m, expense: 0, income: 0, balance: 0 }));
    for (const r of allRecords) {
      const ym = r.date.slice(0, 7);
      const md = monthlyData.find(d => d.month === ym);
      if (!md) continue;
      if (r.type === 'expense') md.expense += r.amount;
      else if (r.type === 'income') md.income += r.amount;
    }
    monthlyData.forEach(d => { d.balance = d.income - d.expense; });

    // 折线图
    const lineChartHtml = this.renderLineChartSVG(monthlyData);

    // 分类占比
    const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const donutSvg = this.renderDonutSVG(catEntries.slice(0, 8), totalExpense, categories, 160);

    let detailHtml = '';
    if (this.statsView === 'category') {
      detailHtml = `
        <div class="stats-content">
          <div>
            <div class="section-title">分类占比</div>
            <div class="donut-section">
              ${donutSvg}
              <div class="donut-legend">
                ${catEntries.slice(0, 8).map(([catId, amount]) => {
                  const cat = categories.find(c => c.id === catId) || { level2: '未知', color: '#95A5A6' };
                  const pct = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0;
                  return `
                    <div class="legend-item">
                      <div class="legend-color" style="background:${cat.color}"></div>
                      <span class="legend-name">${cat.level2}</span>
                      <span class="legend-pct">${pct}%</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
          <div>
            <div class="section-title">分类明细</div>
            <table class="stats-detail-table">
              <thead><tr><th>分类</th><th>金额</th><th>占比</th></tr></thead>
              <tbody>
                ${catEntries.map(([catId, amount]) => {
                  const cat = categories.find(c => c.id === catId) || { level2: '未知' };
                  const pct = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0;
                  return `<tr>
                    <td>${cat.level2}</td>
                    <td style="font-family:var(--font-number)">¥${amount.toFixed(2)}</td>
                    <td>${pct}%</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      detailHtml = `
        <div>
          <div class="section-title">各账户收支</div>
          <table class="stats-detail-table">
            <thead><tr><th>账户</th><th>支出</th><th>收入</th><th>净额</th></tr></thead>
            <tbody>
              ${accounts.map(acc => {
                const s = accStats[acc.id];
                const net = s.income - s.expense;
                return `<tr>
                  <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${acc.color};margin-right:6px;vertical-align:middle"></span>${acc.name}</td>
                  <td style="font-family:var(--font-number);color:var(--color-expense)">¥${s.expense.toFixed(2)}</td>
                  <td style="font-family:var(--font-number);color:var(--color-income)">¥${s.income.toFixed(2)}</td>
                  <td style="font-family:var(--font-number);color:${net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">¥${net.toFixed(2)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    page.innerHTML = `
      <div class="stats-header">
        <div class="stats-tabs">
          <div class="stats-tab ${this.statsView === 'category' ? 'active' : ''}" data-view="category">按分类</div>
          <div class="stats-tab ${this.statsView === 'account' ? 'active' : ''}" data-view="account">按账户</div>
        </div>
        <div class="stats-range-bar">
          <div class="stats-range-btn ${this.statsRange === 'month' ? 'active' : ''}" data-range="month">本月</div>
          <div class="stats-range-btn ${this.statsRange === '3month' ? 'active' : ''}" data-range="3month">近3月</div>
          <div class="stats-range-btn ${this.statsRange === '6month' ? 'active' : ''}" data-range="6month">近6月</div>
          <div class="stats-range-btn ${this.statsRange === 'year' ? 'active' : ''}" data-range="year">今年</div>
          <div class="stats-range-btn ${this.statsRange === 'custom' ? 'active' : ''}" data-range="custom">自定义</div>
          ${this.statsRange === 'custom' ? `
            <input type="date" class="input stats-date-input" id="stats-custom-from" value="${this.statsDateFrom || from}">
            <span style="color:var(--color-text-muted)">~</span>
            <input type="date" class="input stats-date-input" id="stats-custom-to" value="${this.statsDateTo || to}">
          ` : ''}
        </div>
      </div>

      <div class="dashboard-cards" style="margin-bottom:var(--space-xl)">
        <div class="dash-card dash-card-expense">
          <div class="dash-card-label">支出</div>
          <div class="dash-card-value">¥${totalExpense.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
        </div>
        <div class="dash-card dash-card-income">
          <div class="dash-card-label">收入</div>
          <div class="dash-card-value">¥${totalIncome.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
        </div>
        <div class="dash-card dash-card-balance">
          <div class="dash-card-label">结余</div>
          <div class="dash-card-value">¥${balance.toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
        </div>
      </div>

      <div class="section-title">月度趋势</div>
      <div class="line-chart-container">
        ${lineChartHtml}
      </div>

      ${detailHtml}
    `;

    // 绑定 Tab 切换
    page.querySelectorAll('.stats-tab').forEach(t => {
      t.addEventListener('click', () => {
        this.statsView = t.dataset.view;
        this.renderStatsPage();
      });
    });

    // 绑定时间范围切换
    page.querySelectorAll('.stats-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.statsRange = btn.dataset.range;
        if (this.statsRange !== 'custom') {
          this.statsDateFrom = '';
          this.statsDateTo = '';
        }
        this.renderStatsPage();
      });
    });

    // 自定义日期输入
    if (this.statsRange === 'custom') {
      page.querySelector('#stats-custom-from')?.addEventListener('change', (e) => {
        this.statsDateFrom = e.target.value;
        this.renderStatsPage();
      });
      page.querySelector('#stats-custom-to')?.addEventListener('change', (e) => {
        this.statsDateTo = e.target.value;
        this.renderStatsPage();
      });
    }
  },

  // ============ 分类管理 ============

  /** 构建排好序的一级分类分组：[{ level1, cats: [...] }, ...] */
  // 返回按 sort 排序的扁平分类列表（先按一级分类组排序，组内按 sort 排序）
  getSortedCats(typeCats) {
    const groups = this.buildSortedTree([...typeCats]);
    const result = [];
    for (const g of groups) {
      for (const c of g.cats) result.push(c);
    }
    return result;
  },

  buildSortedTree(typeCats) {
    // 1. 确保所有分类都有 sort 值
    typeCats.forEach((c, i) => { if (c.sort == null) c.sort = i; });
    // 2. 按 sort 排序所有分类
    typeCats.sort((a, b) => a.sort - b.sort);
    // 3. 按 level1 分组，保持组的出现顺序（由组内最小 sort 决定）
    const groupMap = new Map();
    for (const c of typeCats) {
      if (!groupMap.has(c.level1)) groupMap.set(c.level1, []);
      groupMap.get(c.level1).push(c);
    }
    // 4. 对组按组内最小 sort 排序
    const groups = [];
    for (const [level1, cats] of groupMap) {
      const minSort = Math.min(...cats.map(c => c.sort));
      groups.push({ level1, cats, minSort });
    }
    groups.sort((a, b) => a.minSort - b.minSort);
    return groups;
  },

  async renderCategoriesPage() {
    const page = document.getElementById('pc-page-categories');
    if (!page) return;

    const categories = await getAll('categories');
    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');

    const expenseGroups = this.buildSortedTree(expenseCats);
    const incomeGroups = this.buildSortedTree(incomeCats);

    const renderGroups = (groups, groupType) => groups.map((g, gIdx) => `
      <div class="tree-level1" data-level1="${g.level1}" data-type="${groupType}">
        <div class="tree-level1-header" data-level1="${g.level1}" data-type="${groupType}">
          <span>${g.level1} (${g.cats.length})</span>
          <div class="tree-actions" style="margin-left:auto;display:flex">
            ${gIdx > 0 ? `<button class="btn btn-ghost level1-move-up" data-level1="${g.level1}" data-type="${groupType}" style="padding:2px 6px;font-size:10px" title="上移分组">▲</button>` : ''}
            ${gIdx < groups.length - 1 ? `<button class="btn btn-ghost level1-move-down" data-level1="${g.level1}" data-type="${groupType}" style="padding:2px 6px;font-size:10px" title="下移分组">▼</button>` : ''}
          </div>
        </div>
        ${g.cats.map((c, idx) => `
          <div class="tree-item" data-cat-id="${c.id}" data-level1="${c.level1}" data-type="${groupType}" draggable="true">
            <div class="tree-icon" style="background:${c.color}">
              ${Icons.get(c.icon, 12)}
            </div>
            <span class="tree-name">${c.level2}</span>
            <div class="tree-actions">
              <button class="btn btn-ghost cat-edit-btn" data-id="${c.id}" style="padding:2px 6px;font-size:10px">编辑</button>
              <button class="btn btn-ghost cat-del-btn" data-id="${c.id}" style="padding:2px 6px;font-size:10px;color:var(--color-error)">删</button>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    page.innerHTML = `
      <div class="section-title">
        <span>分类管理</span>
        <button class="btn btn-primary" id="add-cat-btn">+ 添加分类</button>
      </div>
      <div class="category-tree">
        <h3 style="font-size:13px;color:var(--color-expense);margin-bottom:var(--space-md)">支出分类</h3>
        ${renderGroups(expenseGroups, 'expense')}

        <h3 style="font-size:13px;color:var(--color-income);margin:var(--space-xl) 0 var(--space-md)">收入分类</h3>
        ${renderGroups(incomeGroups, 'income')}
      </div>
    `;

    // 添加分类
    page.querySelector('#add-cat-btn').addEventListener('click', () => this.showCategoryEditModal(null));

    // 编辑分类
    page.querySelectorAll('.cat-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showCategoryEditModal(btn.dataset.id);
      });
    });

    // 删除分类
    page.querySelectorAll('.cat-del-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('确定删除此分类？已使用此分类的记录不会被删除。')) {
          await del('categories', btn.dataset.id);
          App.showToast('已删除');
          this.renderCategoriesPage();
        }
      });
    });

    // 拖拽排序（仅三级分类）
    this.bindItemDrag(page);

    // 二级分类上移
    page.querySelectorAll('.level1-move-up').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.moveLevel1Sort(btn.dataset.level1, btn.dataset.type, -1);
      });
    });

    // 二级分类下移
    page.querySelectorAll('.level1-move-down').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.moveLevel1Sort(btn.dataset.level1, btn.dataset.type, 1);
      });
    });
  },

  /** 二级分类拖拽排序 */
  bindItemDrag(page) {
    const items = page.querySelectorAll('.tree-item');
    let dragId = null;

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        // 阻止冒泡，防止触发组级 dragstart
        e.stopPropagation();
        dragId = item.dataset.catId;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragId);
        e.dataTransfer.setData('application/x-cat-item', '1');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        page.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });

      item.addEventListener('dragover', (e) => {
        // 只接受 item 类型的拖拽
        if (!e.dataTransfer.types.includes('application/x-cat-item')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // 先清除所有其他 item 的指示线
        page.querySelectorAll('.tree-item.drag-over-top, .tree-item.drag-over-bottom').forEach(el => {
          if (el !== item) el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        item.classList.remove('drag-over-top', 'drag-over-bottom');
        if (e.clientY < midY) {
          item.classList.add('drag-over-top');
        } else {
          item.classList.add('drag-over-bottom');
        }
      });

      item.addEventListener('dragleave', (e) => {
        // 只在真正离开 item 时清除，进入子元素不清除
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });

      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove('drag-over-top', 'drag-over-bottom');

        const fromId = e.dataTransfer.getData('text/plain');
        const toId = item.dataset.catId;
        if (!fromId || fromId === toId) return;

        // 同 level1 组内才允许
        const fromLevel1 = page.querySelector(`.tree-item[data-cat-id="${fromId}"]`)?.dataset.level1;
        const toLevel1 = item.dataset.level1;
        if (fromLevel1 !== toLevel1) return;

        // 判断插入位置
        const rect = item.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;

        // 从 DB 读取所有分类
        const allCats = await getAll('categories');
        const fromCat = allCats.find(c => c.id === fromId);
        if (!fromCat) return;

        // 构建当前 type 的排序树（保持二级分类组顺序不变）
        const typeCats = allCats.filter(c => c.type === fromCat.type);
        const groups = this.buildSortedTree([...typeCats]);

        // 在目标组内完成三级分类的移动
        const targetGroup = groups.find(g => g.level1 === fromCat.level1);
        if (!targetGroup) return;
        const fromIdx = targetGroup.cats.findIndex(c => c.id === fromId);
        const [moved] = targetGroup.cats.splice(fromIdx, 1);
        let toIdx = targetGroup.cats.findIndex(c => c.id === toId);
        if (!insertBefore) toIdx++;
        targetGroup.cats.splice(toIdx, 0, moved);

        // 对整个 type 全局重编号 sort 值（保持二级分类组顺序）
        let sortVal = 0;
        for (const g of groups) {
          for (const c of g.cats) {
            c.sort = sortVal++;
            await put('categories', c);
          }
        }
        this.renderCategoriesPage();
      });
    });
  },

  /** 二级分类排序：整组上下移动 */
  async moveLevel1Sort(level1Name, type, direction) {
    const allCategories = await getAll('categories');
    const typeCats = allCategories.filter(c => c.type === type);
    typeCats.forEach((c, i) => { if (c.sort == null) c.sort = i; });
    typeCats.sort((a, b) => a.sort - b.sort);

    const groups = this.buildSortedTree([...typeCats]);
    const gIdx = groups.findIndex(g => g.level1 === level1Name);
    const swapIdx = gIdx + direction;
    if (gIdx < 0 || swapIdx < 0 || swapIdx >= groups.length) return;

    const newOrder = [...groups];
    [newOrder[gIdx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[gIdx]];

    let sortVal = 0;
    for (const g of newOrder) {
      for (const c of g.cats) {
        c.sort = sortVal++;
        await put('categories', c);
      }
    }
    this.renderCategoriesPage();
  },

  async showCategoryEditModal(catId) {
    let cat = null;
    if (catId) {
      cat = await get('categories', catId);
      if (!cat) return;
    }

    document.querySelector('.modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div style="font-size:15px;font-weight:500;margin-bottom:16px">${cat ? '编辑分类' : '添加分类'}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">类型</label>
            <select id="cat-edit-type" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:12px" ${cat ? 'disabled' : ''}>
              <option value="expense" ${(!cat || cat.type === 'expense') ? 'selected' : ''}>支出</option>
              <option value="income" ${cat?.type === 'income' ? 'selected' : ''}>收入</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">一级分类</label>
            <input type="text" id="cat-edit-level1" value="${cat ? cat.level1 : ''}" placeholder="如：生活"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">二级分类</label>
            <input type="text" id="cat-edit-level2" value="${cat ? cat.level2 : ''}" placeholder="如：饮食"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">颜色</label>
            <input type="color" id="cat-edit-color" value="${cat ? cat.color : '#1A73E8'}"
              style="width:40px;height:30px;border:none;cursor:pointer">
            <span id="cat-color-hex" style="font-size:11px;color:#999">${cat ? cat.color : '#1A73E8'}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
          <button id="cat-edit-cancel" class="btn btn-ghost">取消</button>
          <button id="cat-edit-save" class="btn btn-primary">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cat-edit-color').addEventListener('input', (e) => {
      overlay.querySelector('#cat-color-hex').textContent = e.target.value;
    });
    overlay.querySelector('#cat-edit-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cat-edit-save').addEventListener('click', async () => {
      const type = overlay.querySelector('#cat-edit-type').value;
      const level1 = overlay.querySelector('#cat-edit-level1').value.trim();
      const level2 = overlay.querySelector('#cat-edit-level2').value.trim();
      const color = overlay.querySelector('#cat-edit-color').value;
      if (!level1 || !level2) { App.showToast('请填写完整'); return; }

      const data = {
        id: cat ? cat.id : `${type.charAt(0)}-${level1}-${level2}-${Date.now().toString(36)}`,
        type,
        level1,
        level2,
        icon: cat ? cat.icon : 'circle-dot',
        color,
        sort: cat ? (cat.sort || 0) : 999,
      };
      await put('categories', data);
      overlay.remove();
      App.showToast(cat ? '已更新' : '已添加');
      this.renderCategoriesPage();
    });
  },

  // ============ 账户管理 ============
  async renderAccountsPage() {
    const page = document.getElementById('pc-page-accounts');
    if (!page) return;

    const accounts = await getAll('accounts');
    // 按 sort 排序
    accounts.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

    // 统计 dashboard
    const totalAssets = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    const accCount = accounts.length;
    const positiveCount = accounts.filter(a => (Number(a.balance) || 0) > 0).length;
    const negativeCount = accounts.filter(a => (Number(a.balance) || 0) < 0).length;
    const fmtAmount = totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    page.innerHTML = `
      <div class="section-title">
        <span>账户管理</span>
        <button class="btn btn-primary" id="add-account-btn">+ 添加账户</button>
      </div>
      <div class="account-dashboard">
        <div class="dash-label">资产</div>
        <div class="dash-value"><span class="dash-currency">¥</span>${fmtAmount}</div>
        <div class="dash-sub">
          <span>共 ${accCount} 个账户</span>
          ${positiveCount ? `<span>正余额 ${positiveCount}</span>` : ''}
          ${negativeCount ? `<span style="color:var(--color-income)">负余额 ${negativeCount}</span>` : ''}
        </div>
      </div>
      <div class="account-list" id="account-sortable-list">
        ${accounts.map(acc => `
          <div class="account-item" draggable="true" data-acc-id="${acc.id}">
            <div class="acc-drag-handle">${Icons.get('grip-vertical', 14)}</div>
            <div class="acc-icon" style="background:${acc.color}">
              ${Icons.get(acc.icon, 18)}
            </div>
            <div class="acc-info">
              <div class="acc-name">${acc.name}</div>
              <div class="acc-balance">余额: ¥${(acc.balance || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2})}</div>
              ${acc.note ? `<div class="acc-note" title="${App.escapeHtml(acc.note)}">${App.escapeHtml(acc.note)}</div>` : ''}
            </div>
            <div class="acc-actions">
              <button class="btn btn-ghost acc-reconcile-btn" data-id="${acc.id}" style="font-size:11px">对账</button>
              <button class="btn btn-ghost acc-edit-btn" data-id="${acc.id}" style="font-size:11px">编辑</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 添加账户
    page.querySelector('#add-account-btn').addEventListener('click', () => this.showAccountEditModal(null));

    // 编辑账户
    page.querySelectorAll('.acc-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showAccountEditModal(btn.dataset.id));
    });

    // 对账
    page.querySelectorAll('.acc-reconcile-btn').forEach(btn => {
      btn.addEventListener('click', () => this.renderAccountReconcile(btn.dataset.id));
    });

    // 绑定拖拽排序
    this.bindAccountDrag(page);
  },

  /** 账户拖拽排序 */
  bindAccountDrag(page) {
    const items = page.querySelectorAll('.account-item[draggable]');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.accId);
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // 清除其他 item 的指示线
        page.querySelectorAll('.account-item.drag-over-top, .account-item.drag-over-bottom').forEach(el => {
          if (el !== item) el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          item.classList.add('drag-over-top');
          item.classList.remove('drag-over-bottom');
        } else {
          item.classList.add('drag-over-bottom');
          item.classList.remove('drag-over-top');
        }
      });
      item.addEventListener('dragleave', (e) => {
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over-top', 'drag-over-bottom');

        const fromId = e.dataTransfer.getData('text/plain');
        const toId = item.dataset.accId;
        if (!fromId || fromId === toId) return;

        // 判断插入位置
        const rect = item.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;

        // 读取所有账户并排序
        const allAccounts = await getAll('accounts');
        allAccounts.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

        // 移除拖拽项
        const fromIdx = allAccounts.findIndex(a => a.id === fromId);
        const [moved] = allAccounts.splice(fromIdx, 1);

        // 找到目标位置并插入
        let toIdx = allAccounts.findIndex(a => a.id === toId);
        if (!insertBefore) toIdx++;
        allAccounts.splice(toIdx, 0, moved);

        // 重编号 sort 值
        for (let i = 0; i < allAccounts.length; i++) {
          allAccounts[i].sort = i;
          await put('accounts', allAccounts[i]);
        }
        this.renderAccountsPage();
      });
    });
  },

  async showAccountEditModal(accId) {
    let acc = null;
    if (accId) {
      acc = await get('accounts', accId);
      if (!acc) return;
    }

    // 兼容旧数据：若账户没有 initialBalance 字段，用"当前余额 − 流水净额"倒推初始余额
    let shownInit = 0;
    if (acc) {
      if (acc.initialBalance != null) {
        shownInit = Number(acc.initialBalance) || 0;
      } else {
        // 倒推：初始余额 = 当前余额 − (流入 − 流出)
        const records = await getAll('records');
        let delta = 0;
        for (const r of records) {
          if (r.type === 'expense' && r.accountId === acc.id) delta -= r.amount;
          else if (r.type === 'income' && r.accountId === acc.id) delta += r.amount;
          else if (r.type === 'transfer') {
            if (r.accountFromId === acc.id) delta -= r.amount;
            if (r.accountToId === acc.id) delta += r.amount;
          }
        }
        shownInit = Math.round(((Number(acc.balance) || 0) - delta) * 100) / 100;
      }
    }

    document.querySelector('.modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px">
        <div style="font-size:15px;font-weight:500;margin-bottom:16px">${acc ? '编辑账户' : '添加账户'}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">名称</label>
            <input type="text" id="acc-edit-name" value="${App.escapeHtml(acc ? acc.name : '')}" placeholder="如：招商银行"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">初始余额</label>
            <input type="number" id="acc-edit-balance" value="${shownInit}" step="0.01"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
          </div>
          <div style="display:flex;align-items:flex-start;gap:8px">
            <label style="width:60px;font-size:12px;color:#999;padding-top:7px">备注</label>
            <textarea id="acc-edit-note" placeholder="如：招行储蓄卡尾号 1234"
              style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;min-height:56px;resize:vertical;font-family:inherit">${App.escapeHtml(acc && acc.note ? acc.note : '')}</textarea>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:60px;font-size:12px;color:#999">颜色</label>
            <input type="color" id="acc-edit-color" value="${acc ? acc.color : '#1A73E8'}"
              style="width:40px;height:30px;border:none;cursor:pointer">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
          ${acc ? '<button id="acc-edit-delete" class="btn btn-danger" style="margin-right:auto">删除</button>' : ''}
          <button id="acc-edit-cancel" class="btn btn-ghost">取消</button>
          <button id="acc-edit-save" class="btn btn-primary">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#acc-edit-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#acc-edit-save').addEventListener('click', async () => {
      const name = overlay.querySelector('#acc-edit-name').value.trim();
      if (!name) { App.showToast('请输入名称'); return; }
      const initialBalance = parseFloat(overlay.querySelector('#acc-edit-balance').value) || 0;
      const note = overlay.querySelector('#acc-edit-note').value.trim();
      const color = overlay.querySelector('#acc-edit-color').value;

      const data = {
        id: acc ? acc.id : 'acc-' + Date.now().toString(36),
        name,
        initialBalance,
        // balance 仅作缓存（由 recalculateAllBalances 统一回填），这里给一个近似值避免刷新前空档
        // 旧账户 acc.initialBalance 可能为空，用 shownInit（已通过倒推得到）作为旧初始余额
        balance: acc
          ? (Number(acc.balance) || 0) + (initialBalance - shownInit)
          : initialBalance,
        note,
        color,
        icon: acc ? acc.icon : 'credit-card',
        sort: acc ? (acc.sort || 0) : 999,
      };

      await put('accounts', data);
      // 初始余额变更会影响当前余额，统一重算保证数据权威
      await recalculateAllBalances();
      overlay.remove();
      App.showToast(acc ? '已更新' : '已添加');
      this.renderAccountsPage();
    });

    if (acc) {
      overlay.querySelector('#acc-edit-delete').addEventListener('click', async () => {
        if (confirm('确定删除此账户？已关联的记录不会被删除。')) {
          await del('accounts', acc.id);
          overlay.remove();
          App.showToast('已删除');
          this.renderAccountsPage();
        }
      });
    }
  },

  // ============ 账户对账 ============
  /**
   * 账户对账页（替换账户管理页内容）
   * 数据模型说明：
   *   - acc.balance 为联动维护的「当前余额」
   *   - dateFrom 期初余额 = 当前余额 − (dateFrom 及之后所有流水净额)
   *   - 区间内按日正推：期初 + 当日净额 = 当日期末
   */
  async renderAccountReconcile(accId) {
    const page = document.getElementById('pc-page-accounts');
    if (!page) return;

    const acc = await get('accounts', accId);
    if (!acc) { App.showToast('账户不存在'); return; }

    // 默认日期：近 1 个月
    const today = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const toStr = localDateStr(today);
    const fromStr = localDateStr(from);

    // 状态保存在外层闭包
    let state = { dateFrom: fromStr, dateTo: toStr, expandedDate: null };

    const render = async () => {
      const allRecords = await getAll('records');
      const categories = await getAll('categories');
      const allAccounts = await getAll('accounts');

      // 与本账户相关的所有流水
      const relatedAll = allRecords.filter(r =>
        r.accountId === accId || r.accountFromId === accId || r.accountToId === accId
      );

      // 计算当前期间每条流水对账户的净影响(delta)
      const computeDelta = (r) => {
        if (r.type === 'expense' && r.accountId === accId) return -r.amount;
        if (r.type === 'income' && r.accountId === accId) return r.amount;
        if (r.type === 'transfer') {
          if (r.accountFromId === accId) return -r.amount;
          if (r.accountToId === accId) return r.amount;
        }
        return 0;
      };

      // dateFrom 及之后的所有流水（用来倒推期初）
      const afterFrom = relatedAll.filter(r => r.date >= state.dateFrom);
      const netAfterFrom = afterFrom.reduce((s, r) => s + computeDelta(r), 0);
      const openingBalance = (acc.balance || 0) - netAfterFrom;

      // 区间内的流水
      const inRange = relatedAll
        .filter(r => r.date >= state.dateFrom && r.date <= state.dateTo)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt - b.createdAt));

      // 按日期聚合
      const byDate = {};
      for (const r of inRange) {
        if (!byDate[r.date]) byDate[r.date] = { date: r.date, inflow: 0, outflow: 0, items: [] };
        const d = computeDelta(r);
        if (d > 0) byDate[r.date].inflow += d;
        else if (d < 0) byDate[r.date].outflow += -d;
        byDate[r.date].items.push(r);
      }

      const days = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));

      // 正推每日期末余额：按时间升序累加，再映射回展示
      const daysAsc = [...days].sort((a, b) => a.date.localeCompare(b.date));
      let running = openingBalance;
      const balanceByDate = {};
      for (const d of daysAsc) {
        running += d.inflow - d.outflow;
        balanceByDate[d.date] = running;
      }

      // 区间汇总
      const totalInflow = days.reduce((s, d) => s + d.inflow, 0);
      const totalOutflow = days.reduce((s, d) => s + d.outflow, 0);
      const endingBalance = openingBalance + totalInflow - totalOutflow;

      const fmt = (v) => (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const accMap = Object.fromEntries(allAccounts.map(a => [a.id, a]));
      const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

      page.innerHTML = `
        <div class="reconcile-header">
          <button class="btn btn-ghost" id="reconcile-back">← 返回账户管理</button>
          <div class="reconcile-title">
            <div class="reconcile-acc-icon" style="background:${acc.color}">${Icons.get(acc.icon, 16)}</div>
            <span>${acc.name}</span>
            <span class="reconcile-subtitle">对账</span>
          </div>
        </div>

        <div class="reconcile-toolbar">
          <div class="reconcile-dates">
            <label>从</label>
            <input type="date" id="reconcile-from" value="${state.dateFrom}">
            <label>至</label>
            <input type="date" id="reconcile-to" value="${state.dateTo}">
            <button class="btn btn-ghost" data-preset="1m">近1月</button>
            <button class="btn btn-ghost" data-preset="3m">近3月</button>
            <button class="btn btn-ghost" data-preset="6m">近6月</button>
            <button class="btn btn-ghost" data-preset="1y">近1年</button>
            <button class="btn btn-ghost" data-preset="ytd">今年</button>
          </div>
        </div>

        <div class="reconcile-summary">
          <div class="rec-sum-card">
            <div class="rec-sum-label">期初余额</div>
            <div class="rec-sum-value">¥${fmt(openingBalance)}</div>
            <div class="rec-sum-sub">${state.dateFrom} 00:00</div>
          </div>
          <div class="rec-sum-card">
            <div class="rec-sum-label">区间流入</div>
            <div class="rec-sum-value rec-inflow">+¥${fmt(totalInflow)}</div>
            <div class="rec-sum-sub">共 ${days.reduce((s, d) => s + d.items.filter(r => computeDelta(r) > 0).length, 0)} 笔</div>
          </div>
          <div class="rec-sum-card">
            <div class="rec-sum-label">区间流出</div>
            <div class="rec-sum-value rec-outflow">−¥${fmt(totalOutflow)}</div>
            <div class="rec-sum-sub">共 ${days.reduce((s, d) => s + d.items.filter(r => computeDelta(r) < 0).length, 0)} 笔</div>
          </div>
          <div class="rec-sum-card">
            <div class="rec-sum-label">期末余额</div>
            <div class="rec-sum-value">¥${fmt(endingBalance)}</div>
            <div class="rec-sum-sub">${state.dateTo} 23:59</div>
          </div>
          <div class="rec-sum-card rec-sum-card-current">
            <div class="rec-sum-label">账户当前余额</div>
            <div class="rec-sum-value">¥${fmt(acc.balance || 0)}</div>
            <div class="rec-sum-sub">${Math.abs((acc.balance || 0) - endingBalance) < 0.005 ? '与期末一致 ✓' : '与期末存在差异'}</div>
          </div>
        </div>

        <div class="reconcile-table-wrap">
          <table class="reconcile-table">
            <thead>
              <tr>
                <th style="width:32px"></th>
                <th style="width:120px">日期</th>
                <th style="width:60px">笔数</th>
                <th style="width:140px" class="rec-th-right">流入</th>
                <th style="width:140px" class="rec-th-right">流出</th>
                <th style="width:140px" class="rec-th-right">当日净额</th>
                <th style="width:160px" class="rec-th-right">当日期末余额</th>
              </tr>
            </thead>
            <tbody>
              ${days.length === 0 ? `
                <tr><td colspan="7" class="rec-empty">所选区间内无流水</td></tr>
              ` : days.map(d => {
                const net = d.inflow - d.outflow;
                const expanded = state.expandedDate === d.date;
                return `
                  <tr class="rec-day-row ${expanded ? 'expanded' : ''}" data-date="${d.date}">
                    <td class="rec-toggle">${expanded ? '▾' : '▸'}</td>
                    <td>${d.date} <span class="rec-weekday">${this.weekdayOf(d.date)}</span></td>
                    <td>${d.items.length}</td>
                    <td class="rec-td-right rec-inflow">${d.inflow > 0 ? '+¥' + fmt(d.inflow) : '—'}</td>
                    <td class="rec-td-right rec-outflow">${d.outflow > 0 ? '−¥' + fmt(d.outflow) : '—'}</td>
                    <td class="rec-td-right ${net >= 0 ? 'rec-inflow' : 'rec-outflow'}">${net >= 0 ? '+' : '−'}¥${fmt(Math.abs(net))}</td>
                    <td class="rec-td-right rec-balance">¥${fmt(balanceByDate[d.date])}</td>
                  </tr>
                  ${expanded ? `
                    <tr class="rec-detail-row">
                      <td colspan="7">
                        <table class="rec-detail-table">
                          <thead>
                            <tr>
                              <th style="width:70px">类型</th>
                              <th style="width:180px">分类</th>
                              <th style="width:140px" class="rec-th-right">金额</th>
                              <th style="width:140px">对方账户</th>
                              <th>备注</th>
                              <th style="width:64px" class="rec-th-right">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${d.items.map(r => {
                              const delta = computeDelta(r);
                              const cat = catMap[r.categoryId] || {};
                              const catLabel = r.type === 'transfer' ? '转账' : `${cat.level1 || ''} / ${cat.level2 || '未分类'}`;
                              let counterpart = '—';
                              if (r.type === 'transfer') {
                                if (r.accountFromId === accId) counterpart = '→ ' + (accMap[r.accountToId]?.name || '—');
                                else counterpart = '← ' + (accMap[r.accountFromId]?.name || '—');
                              }
                              const typeLabel = r.type === 'expense' ? '支出' : r.type === 'income' ? '收入' : '转账';
                              const typeCls = r.type === 'expense' ? 'rec-type-expense' : r.type === 'income' ? 'rec-type-income' : 'rec-type-transfer';
                              return `
                                <tr data-record-id="${r.id}">
                                  <td><span class="rec-type-tag ${typeCls}">${typeLabel}</span></td>
                                  <td>${catLabel}</td>
                                  <td class="rec-td-right ${delta >= 0 ? 'rec-inflow' : 'rec-outflow'}">${delta >= 0 ? '+' : '−'}¥${fmt(Math.abs(delta))}</td>
                                  <td>${counterpart}</td>
                                  <td class="rec-note">${(r.note || '').replace(/</g, '&lt;') || '—'}</td>
                                  <td class="rec-td-right">
                                    <button class="btn btn-ghost rec-edit-record" data-id="${r.id}" style="font-size:11px">编辑</button>
                                  </td>
                                </tr>
                              `;
                            }).join('')}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ` : ''}
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // 返回
      page.querySelector('#reconcile-back').addEventListener('click', () => this.renderAccountsPage());

      // 日期修改
      const onDateChange = () => {
        const f = page.querySelector('#reconcile-from').value;
        const t = page.querySelector('#reconcile-to').value;
        if (!f || !t) return;
        if (f > t) { App.showToast('起始日期不能晚于结束日期'); return; }
        state.dateFrom = f;
        state.dateTo = t;
        state.expandedDate = null;
        render();
      };
      page.querySelector('#reconcile-from').addEventListener('change', onDateChange);
      page.querySelector('#reconcile-to').addEventListener('change', onDateChange);

      // 快捷预设
      page.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.preset;
          const end = new Date();
          const start = new Date();
          if (p === '1m') start.setMonth(start.getMonth() - 1);
          else if (p === '3m') start.setMonth(start.getMonth() - 3);
          else if (p === '6m') start.setMonth(start.getMonth() - 6);
          else if (p === '1y') start.setFullYear(start.getFullYear() - 1);
          else if (p === 'ytd') { start.setMonth(0); start.setDate(1); }
          state.dateFrom = localDateStr(start);
          state.dateTo = localDateStr(end);
          state.expandedDate = null;
          render();
        });
      });

      // 日期行展开/折叠
      page.querySelectorAll('.rec-day-row').forEach(row => {
        row.addEventListener('click', (e) => {
          // 点到内部链接/按钮不响应
          if (e.target.closest('button') || e.target.closest('a')) return;
          const d = row.dataset.date;
          state.expandedDate = (state.expandedDate === d) ? null : d;
          render();
        });
      });

      // 编辑记录
      page.querySelectorAll('.rec-edit-record').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const rid = btn.dataset.id;
          const cats = await getAll('categories');
          const accs = await getAll('accounts');
          this.showEditModal(rid, cats, accs, async () => {
            // 重新读取账户（余额可能变动）
            const fresh = await get('accounts', accId);
            if (fresh) { acc.balance = fresh.balance; acc.name = fresh.name; acc.icon = fresh.icon; acc.color = fresh.color; }
            render();
          });
        });
      });
    };

    render();
  },

  /** 返回某日期字符串的星期简称 */
  weekdayOf(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    } catch (e) { return ''; }
  },

  // ============ 数据管理 ============
  renderDataPage() {
    const page = document.getElementById('pc-page-data');
    if (!page) return;

    page.innerHTML = `
      <div class="data-management">
        <div class="data-section">
          <div class="data-section-title">导出</div>
          <div class="data-actions">
            <div class="data-action-btn" id="export-backup">
              ${Icons.get('database', 18)}
              <div>
                <div class="action-label">全局备份</div>
                <div class="action-desc">导出完整数据库快照（记录+分类+账户+设置），用于 PC 端数据迁移/恢复</div>
              </div>
            </div>
            <div class="data-action-btn" id="export-data">
              ${Icons.get('download', 18)}
              <div>
                <div class="action-label">导出记录</div>
                <div class="action-desc">按时间范围导出记录，支持 JSON 与 CSV</div>
              </div>
            </div>
            <div class="data-action-btn" id="export-categories">
              ${Icons.get('layers', 18)}
              <div>
                <div class="action-label">导出分类配置</div>
                <div class="action-desc">导出收支分类的内容与顺序（JSON）</div>
              </div>
            </div>
            <div class="data-action-btn" id="export-accounts">
              ${Icons.get('wallet', 18)}
              <div>
                <div class="action-label">导出账户配置</div>
                <div class="action-desc">导出账户的内容、顺序与初始金额（JSON）</div>
              </div>
            </div>
          </div>
        </div>

        <div class="data-section">
          <div class="data-section-title">导入</div>
          <div class="data-actions">
            <div class="data-action-btn" id="import-backup" style="border:0.5px solid var(--color-warning, #e6a23c)">
              ${Icons.get('database', 18)}
              <div>
                <div class="action-label">全局导入（覆盖恢复）</div>
                <div class="action-desc">使用全局备份 JSON 完全覆盖当前数据库（记录+分类+账户+设置）</div>
              </div>
            </div>
            <div class="data-action-btn" id="import-data">
              ${Icons.get('upload', 18)}
              <div>
                <div class="action-label">导入记录</div>
                <div class="action-desc">自动识别 JSON / CSV 格式，在现有记录上追加（Insert）</div>
              </div>
            </div>
            <div class="data-action-btn" id="sync-mobile">
              ${Icons.get('smartphone', 18)}
              <div>
                <div class="action-label">同步手机端数据</div>
                <div class="action-desc">JSON 文件，规则引擎预填充账户/分类，人工确认后合并</div>
              </div>
            </div>
            <div class="data-action-btn" id="import-categories">
              ${Icons.get('layers', 18)}
              <div>
                <div class="action-label">导入分类配置</div>
                <div class="action-desc">支持"替换"或"合并"模式</div>
              </div>
            </div>
            <div class="data-action-btn" id="import-accounts">
              ${Icons.get('wallet', 18)}
              <div>
                <div class="action-label">导入账户配置</div>
                <div class="action-desc">支持"替换"或"合并"模式，可选是否导入初始金额</div>
              </div>
            </div>
          </div>
        </div>

        <div class="data-section">
          <div class="data-section-title">危险操作</div>
          <div class="data-actions">
            <div class="data-action-btn" id="clear-data" style="border:0.5px solid var(--color-error)">
              ${Icons.get('trash-2', 18)}
              <div>
                <div class="action-label" style="color:var(--color-error)">清除所有数据</div>
                <div class="action-desc">此操作不可恢复，建议先导出备份</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    page.querySelector('#export-backup').addEventListener('click', () => this.doGlobalBackup());
    page.querySelector('#export-data').addEventListener('click', () => this.openExportDialog());
    page.querySelector('#export-categories').addEventListener('click', () => this.doExportCategories());
    page.querySelector('#export-accounts').addEventListener('click', () => this.doExportAccounts());
    page.querySelector('#import-backup').addEventListener('click', () => this.openGlobalImportDialog());
    page.querySelector('#import-data').addEventListener('click', () => this.openImportDialog());
    page.querySelector('#sync-mobile').addEventListener('click', () => this.openMobileSyncDialog());
    page.querySelector('#import-categories').addEventListener('click', () => this.openImportCategoriesDialog());
    page.querySelector('#import-accounts').addEventListener('click', () => this.openImportAccountsDialog());

    page.querySelector('#clear-data').addEventListener('click', async () => {
      if (confirm('确定要清除所有数据吗？建议先导出备份。')) {
        if (confirm('再次确认：这将删除所有记录、分类和账户设置！')) {
          await clearStore('records');
          await clearStore('categories');
          await clearStore('accounts');
          await clearStore('settings');
          await initDB();
          App.showToast('数据已清除，默认分类和账户已重建');
          this.switchNav('records');
        }
      }
    });
  },

  // ---- 全局备份：导出完整数据库 JSON ----
  async doGlobalBackup() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minibook_backup_${localToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('全局备份已导出');
  },

  // ---- 导出分类配置 ----
  async doExportCategories() {
    const data = await exportCategoriesConfig();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minibook_categories_${localToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast(`已导出 ${data.categories.length} 个分类`);
  },

  // ---- 导出账户配置 ----
  async doExportAccounts() {
    const data = await exportAccountsConfig();
    // 导出时保留 initialBalance（初始金额是账户的人工设定，需要随配置走）
    // 但 balance（运行时余额）由 records 自动计算，导出时剥离避免误导
    const payload = {
      ...data,
      accounts: data.accounts.map(({ balance, ...rest }) => ({
        ...rest,
        initialBalance: Number(rest.initialBalance) || 0,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minibook_accounts_${localToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast(`已导出 ${data.accounts.length} 个账户`);
  },

  // ---- 导入分类配置 ----
  openImportCategoriesDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const categories = Array.isArray(data) ? data : (data.categories || []);
        if (!categories.length) { App.showToast('文件中没有分类数据'); return; }
        this._showImportConfigModal({
          title: '导入分类配置',
          count: categories.length,
          unitName: '个分类',
          tip: '"替换"将清空现有分类并使用导入数据；"合并"按 id 覆盖同名分类，保留其他已有分类。',
          onConfirm: async (mode) => {
            try {
              const result = await importCategoriesConfig(categories, { mode });
              const msg = mode === 'replace'
                ? `替换完成：共写入 ${result.added} 个分类`
                : `合并完成：更新 ${result.updated}，新增 ${result.added}，保留 ${result.kept}`;
              App.showToast(msg);
              this.renderDataPage();
            } catch (err) {
              App.showToast('导入失败: ' + err.message);
            }
          },
        });
      } catch (err) {
        App.showToast('读取失败: ' + err.message);
      }
    };
    input.click();
  },

  // ---- 导入账户配置 ----
  openImportAccountsDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const accounts = Array.isArray(data) ? data : (data.accounts || []);
        if (!accounts.length) { App.showToast('文件中没有账户数据'); return; }
        const hasInitial = accounts.some(a => a.initialBalance != null);
        this._showImportAccountsModal({
          count: accounts.length,
          hasInitial,
          onConfirm: async (mode, importInitialBalance) => {
            try {
              const result = await importAccountsConfig(accounts, {
                mode,
                keepBalance: true,
                importInitialBalance,
              });
              await recalculateAllBalances();
              const initTip = importInitialBalance ? '（含初始金额）' : '';
              const msg = mode === 'replace'
                ? `替换完成${initTip}：共写入 ${result.added} 个账户`
                : `合并完成${initTip}：更新 ${result.updated}，新增 ${result.added}，保留 ${result.kept}`;
              App.showToast(msg);
              this.renderDataPage();
            } catch (err) {
              App.showToast('导入失败: ' + err.message);
            }
          },
        });
      } catch (err) {
        App.showToast('读取失败: ' + err.message);
      }
    };
    input.click();
  },

  // ---- 通用：配置导入模式选择模态 ----
  _showImportConfigModal({ title, count, unitName, tip, onConfirm }) {
    document.querySelector('.modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div style="font-size:15px;font-weight:500;margin-bottom:12px">${title}</div>
        <div style="font-size:13px;color:#666;margin-bottom:14px">检测到 ${count} ${unitName}，请选择导入方式：</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #ddd;border-radius:6px;cursor:pointer">
            <input type="radio" name="imp-mode" value="replace" checked style="margin-top:2px">
            <div>
              <div style="font-size:13px;font-weight:500">替换（Replace）</div>
              <div style="font-size:12px;color:#999;margin-top:2px">清空现有数据后整体写入（推荐）</div>
            </div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #ddd;border-radius:6px;cursor:pointer">
            <input type="radio" name="imp-mode" value="merge" style="margin-top:2px">
            <div>
              <div style="font-size:13px;font-weight:500">合并（Merge）</div>
              <div style="font-size:12px;color:#999;margin-top:2px">按 id 覆盖同项，保留其他已有数据</div>
            </div>
          </label>
        </div>
        <div style="font-size:12px;color:#999;margin-top:12px;line-height:1.6">${tip}</div>
        <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
          <button id="imp-cancel" class="btn btn-ghost">取消</button>
          <button id="imp-confirm" class="btn btn-primary">确定导入</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#imp-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#imp-confirm').addEventListener('click', async () => {
      const mode = overlay.querySelector('input[name="imp-mode"]:checked').value;
      overlay.remove();
      await onConfirm(mode);
    });
  },

  // ---- 账户配置导入：自定义模态（含 是否导入初始金额 选项）----
  _showImportAccountsModal({ count, hasInitial, onConfirm }) {
    document.querySelector('.modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    const initialOptionDisabled = hasInitial ? '' : 'disabled';
    const initialOptionTip = hasInitial
      ? '勾选后，文件中的初始金额会覆盖现有账户的初始金额，并自动重算余额'
      : '文件不包含 initialBalance 字段，此选项不可用';
    overlay.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div style="font-size:15px;font-weight:500;margin-bottom:12px">导入账户配置</div>
        <div style="font-size:13px;color:#666;margin-bottom:14px">检测到 ${count} 个账户，请选择导入方式：</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #ddd;border-radius:6px;cursor:pointer">
            <input type="radio" name="imp-mode" value="replace" checked style="margin-top:2px">
            <div>
              <div style="font-size:13px;font-weight:500">替换（Replace）</div>
              <div style="font-size:12px;color:#999;margin-top:2px">清空现有账户后整体写入（推荐）</div>
            </div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #ddd;border-radius:6px;cursor:pointer">
            <input type="radio" name="imp-mode" value="merge" style="margin-top:2px">
            <div>
              <div style="font-size:13px;font-weight:500">合并（Merge）</div>
              <div style="font-size:12px;color:#999;margin-top:2px">按 id 覆盖同项，保留其他已有账户</div>
            </div>
          </label>
        </div>
        <div style="margin-top:14px;padding:10px;border:1px solid #eee;border-radius:6px;background:#fafafa">
          <label style="display:flex;align-items:flex-start;gap:8px;cursor:${hasInitial ? 'pointer' : 'not-allowed'}">
            <input type="checkbox" id="imp-init" style="margin-top:2px" ${initialOptionDisabled}>
            <div>
              <div style="font-size:13px;font-weight:500;color:${hasInitial ? '#333' : '#999'}">导入初始金额（initialBalance）</div>
              <div style="font-size:12px;color:#999;margin-top:2px">${initialOptionTip}</div>
            </div>
          </label>
        </div>
        <div style="font-size:12px;color:#999;margin-top:12px;line-height:1.6">运行时余额（balance）始终基于现有 records 自动重算，不受文件影响。</div>
        <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
          <button id="imp-cancel" class="btn btn-ghost">取消</button>
          <button id="imp-confirm" class="btn btn-primary">确定导入</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#imp-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#imp-confirm').addEventListener('click', async () => {
      const mode = overlay.querySelector('input[name="imp-mode"]:checked').value;
      const importInitialBalance = overlay.querySelector('#imp-init').checked;
      overlay.remove();
      await onConfirm(mode, importInitialBalance);
    });
  },

  // ---- 全局导入：用备份 JSON 覆盖整个数据库 ----
  openGlobalImportDialog() {
    document.querySelector('.modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div style="font-size:15px;font-weight:500;margin-bottom:12px;color:var(--color-error)">⚠ 全局导入（覆盖恢复）</div>
        <div style="font-size:13px;color:#444;line-height:1.7;margin-bottom:14px">
          此操作会<b>清空当前所有数据</b>（记录、分类、账户、设置），并用备份文件中的内容完全替换。<br>
          <span style="color:#c0392b">操作不可撤销！</span>强烈建议先做一次全局备份。
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="gimp-backup-first" class="btn btn-ghost" style="justify-content:flex-start;text-align:left">
            ① 先做一次全局备份（推荐）
          </button>
          <label style="display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #ddd;border-radius:6px">
            <input type="checkbox" id="gimp-ack" style="margin-top:2px">
            <div style="font-size:13px;color:#333">我已知晓此操作会覆盖全部现有数据，并已做好备份</div>
          </label>
          <button id="gimp-pick" class="btn btn-primary" disabled>② 选择备份文件并导入</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
          <button id="gimp-cancel" class="btn btn-ghost">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#gimp-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#gimp-backup-first').addEventListener('click', async () => {
      await this.doGlobalBackup();
    });

    const ack = overlay.querySelector('#gimp-ack');
    const pickBtn = overlay.querySelector('#gimp-pick');
    ack.addEventListener('change', () => { pickBtn.disabled = !ack.checked; });

    pickBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data || (!Array.isArray(data.records) && !Array.isArray(data.accounts) && !Array.isArray(data.categories))) {
            App.showToast('文件不是有效的全局备份');
            return;
          }
          const summary = `将导入：\n  记录 ${(data.records || []).length} 条\n  分类 ${(data.categories || []).length} 个\n  账户 ${(data.accounts || []).length} 个\n  设置 ${(data.settings || []).length} 项\n\n确认覆盖现有数据？此操作不可撤销！`;
          if (!confirm(summary)) return;

          const result = await importAllData(data);
          overlay.remove();
          App.showToast(`全局导入完成：记录 ${result.records}、分类 ${result.categories}、账户 ${result.accounts}`);
          this.switchNav('records');
        } catch (err) {
          App.showToast('导入失败: ' + err.message);
        }
      };
      input.click();
    });
  },

  // ---- 导出：选择时间范围和格式 ----
  openExportDialog() {
    document.querySelector('.modal-overlay')?.remove();
    const today = localToday();
    const firstDay = today.slice(0, 7) + '-01';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div style="font-size:15px;font-weight:500;margin-bottom:16px">导出记录</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:70px;font-size:12px;color:#999">时间范围</label>
            <select id="exp-range" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
              <option value="month">本月</option>
              <option value="year">本年</option>
              <option value="all" selected>全部</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div id="exp-custom-group" style="display:none;flex-direction:column;gap:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <label style="width:70px;font-size:12px;color:#999">起始日期</label>
              <input type="date" id="exp-from" value="${firstDay}" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <label style="width:70px;font-size:12px;color:#999">结束日期</label>
              <input type="date" id="exp-to" value="${today}" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="width:70px;font-size:12px;color:#999">导出格式</label>
            <select id="exp-format" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px">
              <option value="csv">CSV（可用 Excel 打开）</option>
              <option value="json">JSON（含字段 id/关联信息）</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
          <button id="exp-cancel" class="btn btn-ghost">取消</button>
          <button id="exp-confirm" class="btn btn-primary">导出</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#exp-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#exp-range').addEventListener('change', (e) => {
      const g = overlay.querySelector('#exp-custom-group');
      g.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });

    overlay.querySelector('#exp-confirm').addEventListener('click', async () => {
      const range = overlay.querySelector('#exp-range').value;
      const format = overlay.querySelector('#exp-format').value;
      let from = null, to = null;
      const now = new Date();
      if (range === 'month') {
        from = localMonth(now) + '-01';
        to = today;
      } else if (range === 'year') {
        from = now.getFullYear() + '-01-01';
        to = today;
      } else if (range === 'custom') {
        from = overlay.querySelector('#exp-from').value;
        to = overlay.querySelector('#exp-to').value;
        if (!from || !to) { App.showToast('请选择日期范围'); return; }
      }

      const allRecords = await getAll('records');
      const categories = await getAll('categories');
      const accounts = await getAll('accounts');
      const filtered = allRecords.filter(r => {
        if (!from) return true;
        return r.date >= from && r.date <= to;
      });

      overlay.remove();
      if (filtered.length === 0) { App.showToast('所选范围内没有记录'); return; }

      if (format === 'json') {
        const payload = { records: filtered, exportedAt: new Date().toISOString(), version: 'v3', range: { from, to } };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minibook_records_${localToday()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const header = '日期,时间,类型,分类,金额,账户,转入账户,备注,来源\n';
        const rows = filtered.map(r => {
          const cat = categories.find(c => c.id === r.categoryId) || { level2: '' };
          const acc = accounts.find(a => a.id === (r.accountId || r.accountFromId)) || { name: '' };
          const accTo = r.type === 'transfer' ? (accounts.find(a => a.id === r.accountToId) || { name: '' }).name : '';
          const type = r.type === 'expense' ? '支出' : r.type === 'income' ? '收入' : '转账';
          return `${r.date},${r.time},${type},${cat.level2},${r.amount},${acc.name},"${accTo}","${r.note || ''}",${r.source || ''}`;
        });
        const csv = header + rows.join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minibook_records_${localToday()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      App.showToast(`已导出 ${filtered.length} 条记录`);
    });
  },

  // ---- 导入：自动识别 JSON / CSV，insert 模式 ----
  openImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const isJson = file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[');

        let records;
        if (isJson) {
          const data = JSON.parse(text);
          records = Array.isArray(data) ? data : (data.records || []);
        } else {
          const categories = await getAll('categories');
          const accounts = await getAll('accounts');
          records = parseCsvToRecords(text, categories, accounts);
        }

        if (!records.length) { App.showToast('文件中没有可导入的记录'); return; }

        if (!confirm(`检测到 ${records.length} 条记录，将以追加模式（Insert）导入，不会覆盖现有数据。是否继续？`)) return;

        const result = await importData({ records }, { mode: 'insert', recalcBalance: true });
        App.showToast(`导入完成：新增 ${result.added} 条`);
        // 回到明细页刷新
        this.switchNav('records');
      } catch (err) {
        App.showToast('导入失败: ' + err.message);
      }
    };
    input.click();
  },

  // ---- 同步手机端数据：Manual Resolution Merge ----
  openMobileSyncDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const mobileRecords = Array.isArray(data) ? data : (data.records || [data]);
        const prepared = await prepareMobileImport(mobileRecords);
        if (!prepared.pending.length) { App.showToast('手机端数据为空'); return; }
        this.openMobileConfirmPage(prepared.pending);
      } catch (err) {
        App.showToast('读取失败: ' + err.message);
      }
    };
    input.click();
  },

  // ---- 人工确认页（全屏模态） ----
  async openMobileConfirmPage(pending) {
    const categories = await getAll('categories');
    const accounts = (await getAll('accounts')).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

    document.querySelector('.modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:1000px;width:92vw;max-height:86vh;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-size:15px;font-weight:500">同步手机端数据 · 人工确认</div>
          <div style="font-size:12px;color:#999">共 ${pending.length} 条，请核对账户与分类，保存后合并到数据库</div>
        </div>
        <div style="flex:1;overflow:auto;border:1px solid #eee;border-radius:4px">
          <table class="data-table" style="width:100%;font-size:12px">
            <thead>
              <tr>
                <th style="width:90px">日期</th>
                <th style="width:50px">类型</th>
                <th style="width:80px">金额</th>
                <th style="width:90px">原分类</th>
                <th style="width:180px">分类</th>
                <th style="width:120px">账户</th>
                <th>备注</th>
                <th style="width:60px">置信</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody id="sync-tbody">
              ${pending.map((p, idx) => this.renderSyncRow(p, idx, categories, accounts)).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:space-between;align-items:center">
          <div style="font-size:12px;color:#999">
            <span id="sync-summary"></span>
          </div>
          <div style="display:flex;gap:8px">
            <button id="sync-cancel" class="btn btn-ghost">取消</button>
            <button id="sync-commit" class="btn btn-primary">确认合并</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const updateSummary = () => {
      const rows = overlay.querySelectorAll('#sync-tbody tr[data-idx]');
      let ok = 0, skip = 0;
      rows.forEach(tr => {
        if (tr.dataset.skip === '1') skip++;
        else {
          const cat = tr.querySelector('.sync-cat').value;
          const acc = tr.querySelector('.sync-acc').value;
          if (cat && acc) ok++;
        }
      });
      const need = pending.length - skip - ok;
      overlay.querySelector('#sync-summary').textContent = `可合并 ${ok} 条，待补齐 ${need} 条，跳过 ${skip} 条`;
    };

    // 行内交互
    overlay.querySelectorAll('#sync-tbody tr[data-idx]').forEach(tr => {
      tr.querySelector('.sync-skip').addEventListener('click', () => {
        tr.dataset.skip = tr.dataset.skip === '1' ? '0' : '1';
        tr.style.opacity = tr.dataset.skip === '1' ? '0.4' : '1';
        tr.style.textDecoration = tr.dataset.skip === '1' ? 'line-through' : 'none';
        updateSummary();
      });
      tr.querySelector('.sync-cat').addEventListener('change', updateSummary);
      tr.querySelector('.sync-acc').addEventListener('change', updateSummary);
    });
    updateSummary();

    overlay.querySelector('#sync-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#sync-commit').addEventListener('click', async () => {
      const rows = overlay.querySelectorAll('#sync-tbody tr[data-idx]');
      const confirmed = [];
      const missing = [];
      rows.forEach(tr => {
        if (tr.dataset.skip === '1') return;
        const idx = parseInt(tr.dataset.idx);
        const p = pending[idx];
        const catId = tr.querySelector('.sync-cat').value;
        const accId = tr.querySelector('.sync-acc').value;
        if (!catId || !accId) { missing.push(idx); return; }
        confirmed.push({ ...p, categoryId: catId, accountId: accId });
      });

      if (missing.length) {
        if (!confirm(`还有 ${missing.length} 条记录的分类或账户未填，是否跳过它们继续合并 ${confirmed.length} 条？`)) return;
      }
      if (!confirmed.length) { App.showToast('没有可合并的记录'); return; }

      const result = await commitMobileRecords(confirmed);
      overlay.remove();
      App.showToast(`已合并 ${result.added} 条手机端记录`);
      this.switchNav('records');
    });
  },

  renderSyncRow(p, idx, categories, accounts) {
    const typeCn = p.type === 'expense' ? '支出' : p.type === 'income' ? '收入' : '转账';
    const typeCats = this.getSortedCats(categories.filter(c => c.type === p.type));
    const confColor = p.confidence === 'high' ? '#27AE60' : p.confidence === 'medium' ? '#F5A623' : '#E74C3C';
    const confText = p.confidence === 'high' ? '高' : p.confidence === 'medium' ? '中' : '低';
    return `
      <tr data-idx="${idx}" data-skip="0">
        <td>${p.date}</td>
        <td>${typeCn}</td>
        <td style="color:${p.type === 'expense' ? 'var(--color-error)' : 'var(--color-success)'}">¥${p.amount.toFixed(2)}</td>
        <td style="color:#999">${p.rawCategory || '-'}</td>
        <td>
          <select class="sync-cat" style="width:100%;padding:3px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px">
            <option value="">-- 选择分类 --</option>
            ${typeCats.map(c => `<option value="${c.id}" ${p.categoryId === c.id ? 'selected' : ''}>${c.level1}/${c.level2}</option>`).join('')}
          </select>
        </td>
        <td>
          <select class="sync-acc" style="width:100%;padding:3px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px">
            <option value="">-- 选择账户 --</option>
            ${accounts.map(a => `<option value="${a.id}" ${p.accountId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
          </select>
        </td>
        <td>${p.note || ''}</td>
        <td><span style="color:${confColor};font-weight:500">${confText}</span></td>
        <td><button class="sync-skip btn btn-ghost" style="padding:2px 8px;font-size:11px">跳过</button></td>
      </tr>
    `;
  },
};
