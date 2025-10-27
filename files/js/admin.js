// 全局变量
let currentEditingConfig = null;
let configCategories = [];
let configData = [];
let configCategoryState = {};
let currentModalCallbacks = {
    onClose: null,
    onSubmit: null
};

// 标签页切换
document.querySelectorAll('.admin-nav a').forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();

        // 更新激活的导航项
        document.querySelectorAll('.admin-nav a').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 显示对应的内容
        const tabId = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');

        // 加载对应标签页的数据
        loadTabData(tabId);
    });
});

// 加载标签页数据
function loadTabData(tabId) {
    switch(tabId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'clients':
            loadClientsData();
            break;
        case 'authorizations':
            loadAuthorizationsData();
            break;
        case 'configs':
            loadConfigsData();
            break;
    }
}

// 加载仪表板数据
function loadDashboardData() {
    // 加载统计数据
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-users').textContent = data.total_users || 0;
            document.getElementById('total-apps').textContent = data.total_apps || 0;
            document.getElementById('total-auths').textContent = data.total_authorizations || 0;
            document.getElementById('monthly-auths').textContent = data.monthly_authorizations || 0;
        });

    // 加载最近用户
    fetch('/api/admin/recent_users?limit=5')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#recent-users tbody');
            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.created_at).toLocaleString()}</td>
                    <td>${user.email_verified ? '<span class="status-badge status-active">已验证</span>' : '<span class="status-badge status-expired">未验证</span>'}</td>
                </tr>
            `).join('');
        });

    // 加载最近应用
    fetch('/api/admin/recent_clients?limit=5')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#recent-clients tbody');
            tbody.innerHTML = data.clients.map(client => `
                <tr>
                    <td>${client.client_id}</td>
                    <td>${client.client_name}</td>
                    <td>${client.creator_username}</td>
                    <td>${new Date(client.created_at).toLocaleString()}</td>
                    <td>${client.redirect_uris_count}个URI</td>
                </tr>
            `).join('');
        });
}

// 加载用户数据
function loadUsersData(page = 1) {
    fetch(`/api/admin/users?page=${page}&limit=10`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#users-table tbody');
            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.created_at).toLocaleString()}</td>
                    <td>${user.email_verified ? '<span class="status-badge status-active">已验证</span>' : '<span class="status-badge status-expired">未验证</span>'}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteUser(${user.id})" ${user.username === '{{ ADMIN_USERNAME }}' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </td>
                </tr>
            `).join('');

            // 更新分页
            updatePagination('users-pagination', page, data.total_pages, loadUsersData);
        });
}

// 加载应用数据
function loadClientsData(page = 1) {
    fetch(`/api/admin/clients?page=${page}&limit=10`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#clients-table tbody');
            tbody.innerHTML = data.clients.map(client => `
                <tr>
                    <td>${client.client_id}</td>
                    <td>${client.client_name}</td>
                    <td>${client.creator_username}</td>
                    <td>${new Date(client.created_at).toLocaleString()}</td>
                    <td>${client.auth_count}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteClient('${client.client_id}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </td>
                </tr>
            `).join('');

            // 更新分页
            updatePagination('clients-pagination', page, data.total_pages, loadClientsData);
        });
}

// 加载授权数据（带加载状态）
function loadAuthorizationsData(page = 1) {
    console.log(`加载授权数据，页码: ${page}`);

    const tbody = document.querySelector('#auths-table tbody');
    const pagination = document.getElementById('auths-pagination');

    // 显示加载状态
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">加载中...</td></tr>';
    }
    if (pagination) {
        pagination.classList.add('loading');
    }

    fetch(`/api/admin/authorizations?page=${page}&limit=10`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('授权数据响应:', data);

            // 移除加载状态
            if (pagination) {
                pagination.classList.remove('loading');
            }

            if (!tbody) {
                console.error('未找到授权表格tbody元素');
                return;
            }

            if (!data.authorizations || data.authorizations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">暂无授权记录</td></tr>';
                if (pagination) {
                    pagination.innerHTML = '';
                }
                return;
            }

            tbody.innerHTML = data.authorizations.map(auth => `
                <tr>
                    <td title="${auth.code}">${auth.code ? auth.code.substring(0, 20) + '...' : '无'}</td>
                    <td>${auth.user_username || '未知用户'}</td>
                    <td>${auth.client_name || '未知应用'}</td>
                    <td>${auth.created_at ? new Date(auth.created_at).toLocaleString() : '未知'}</td>
                    <td>${auth.expires_at ? new Date(auth.expires_at).toLocaleString() : '未知'}</td>
                    <td>
                        <span class="status-badge ${auth.status === '有效' ? 'status-active' : auth.status === '已使用' ? 'status-used' : 'status-expired'}">
                            ${auth.status}
                        </span>
                    </td>
                </tr>
            `).join('');

            // 更新分页控件
            updateAuthsPagination(page, data.total_pages, data.has_prev, data.has_next);
        })
        .catch(error => {
            console.error('加载授权数据失败:', error);
            // 移除加载状态
            if (pagination) {
                pagination.classList.remove('loading');
            }
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">加载失败: ' + error.message + '</td></tr>';
            }
        });
}

// 加载配置数据
function loadConfigsData() {
    const contentDiv = document.getElementById('configs-content');
    contentDiv.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin"></i><p>加载配置中...</p></div>';

    fetch('/api/admin/configs')
        .then(response => {
            if (!response.ok) {
                throw new Error('获取配置失败');
            }
            return response.json();
        })
        .then(data => {
            configData = data.configs || []; // 保存配置数据
            configCategories = data.categories || [];
            renderConfigs(configData);
        })
        .catch(error => {
            contentDiv.innerHTML = `<div class="text-center p-3"><i class="fas fa-exclamation-triangle"></i><p>加载失败: ${error.message}</p></div>`;
        });
}

// 渲染配置
function renderConfigs(configs) {
    const contentDiv = document.getElementById('configs-content');

    if (!configs || configs.length === 0) {
        contentDiv.innerHTML = '<div class="text-center p-3"><i class="fas fa-cogs"></i><p>暂无配置项</p></div>';
        return;
    }

    // 按分类分组
    const configsByCategory = {};
    configs.forEach(config => {
        if (!configsByCategory[config.category]) {
            configsByCategory[config.category] = [];
        }
        configsByCategory[config.category].push(config);
    });

    let html = '';

    // 遍历所有分类
    Object.keys(configsByCategory).sort().forEach(category => {
        // 初始化分类状态（默认展开）
        if (configCategoryState[category] === undefined) {
            configCategoryState[category] = true;
        }

        const isExpanded = configCategoryState[category];
        const iconClass = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
        const displayStyle = isExpanded ? 'block' : 'none';

        html += `<div class="config-category">`;
        // 添加 data-category 属性以便更容易选择
        html += `<div class="config-category-header" data-category="${category}" onclick="toggleConfigCategory('${category}')">`;
        html += `<i class="fas ${iconClass} category-chevron"></i>`;
        html += `<h4><i class="fas fa-folder"></i> ${category}</h4>`;
        html += `<span class="config-count">${configsByCategory[category].length} 个配置项</span>`;
        html += `</div>`;

        html += `<div class="config-category-items" id="category-${category}" style="display: ${displayStyle};">`;

        // 该分类下的所有配置项
        configsByCategory[category].forEach(config => {
            html += renderConfigCard(config);
        });

        html += `</div></div>`;
    });

    contentDiv.innerHTML = html;
}

// 渲染单个配置卡片
function renderConfigCard(config) {
    let valueDisplay = '';
    let inputType = 'text';

    // 根据类型渲染不同的显示和输入控件
    switch(config.value_type) {
        case 'boolean':
            valueDisplay = config.value ?
                '<span style="color: #28a745;">✓ 是</span>' :
                '<span style="color: #dc3545;">✗ 否</span>';
            inputType = 'boolean';
            break;
        case 'number':
            valueDisplay = config.value;
            inputType = 'number';
            break;
        case 'json':
            valueDisplay = `<pre class="config-json">${JSON.stringify(config.value, null, 2)}</pre>`;
            inputType = 'json';
            break;
        default: // string, text
            valueDisplay = config.value;
            inputType = config.value && config.value.length > 100 ? 'textarea' : 'text';
    }

    return `
        <div class="card">
            <div class="config-header">
                <div>
                    <div class="config-key">${config.key}</div>
                    <div class="config-description">${config.description || '无描述'}</div>
                </div>
                <div>
                    <span class="config-type">${config.value_type}</span>
                    ${config.is_public ?
                        '<span class="config-public">公开</span>' :
                        '<span class="config-private">私有</span>'
                    }
                </div>
            </div>

            <div class="config-value">
                <strong>当前值:</strong>
                <div>${valueDisplay}</div>
            </div>

            <div class="config-actions">
                <button class="btn btn-edit" onclick="openEditConfigModal('${config.key}')">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn btn-danger" onclick="deleteConfig('${config.key}')">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        </div>
    `;
}

// 打开编辑配置模态框
function openEditConfigModal(configKey) {
    // 从保存的配置数据中查找完整的配置对象
    const targetConfig = configData.find(config => config.key === configKey);

    if (!targetConfig) {
        alert('未找到配置信息');
        return;
    }

    currentEditingConfig = targetConfig;

    // 填充表单
    document.getElementById('edit-config-key').value = targetConfig.key;
    document.getElementById('edit-config-description').value = targetConfig.description || '';
    document.getElementById('edit-config-category').value = targetConfig.category;
    document.getElementById('edit-config-is-public').checked = targetConfig.is_public;

    // 动态渲染值输入控件
    const valueContainer = document.getElementById('edit-value-container');
    const valueHint = document.getElementById('edit-value-hint');

    let inputHtml = '';
    let hintText = '';

    // 使用配置的原始值类型
    const valueType = targetConfig.value_type;
    const rawValue = targetConfig.raw_value; // 后端返回的原始字符串值
    const parsedValue = targetConfig.value;   // 后端解析后的值

    switch(valueType) {
        case 'boolean':
            // 使用解析后的布尔值
            const boolValue = parsedValue === true || parsedValue === 'true';
            inputHtml = `
                <label>
                    <input type="checkbox" id="edit-config-value" class="config-checkbox" ${boolValue ? 'checked' : ''}>
                    启用
                </label>
            `;
            hintText = '布尔值配置，选中表示true，未选中表示false';
            break;
        case 'number':
            inputHtml = `<input type="number" id="edit-config-value" class="form-input" value="${parsedValue}" step="any">`;
            hintText = '数值配置，请输入数字';
            break;
        case 'json':
            inputHtml = `<textarea id="edit-config-value" class="form-textarea config-json">${JSON.stringify(parsedValue, null, 2)}</textarea>`;
            hintText = 'JSON配置，请输入有效的JSON格式';
            break;
        default:
            if (rawValue && rawValue.length > 100) {
                inputHtml = `<textarea id="edit-config-value" class="form-textarea">${rawValue}</textarea>`;
                hintText = '长文本配置';
            } else {
                inputHtml = `<input type="text" id="edit-config-value" class="form-input" value="${rawValue}">`;
                hintText = '文本配置';
            }
    }

    valueContainer.innerHTML = inputHtml;
    valueHint.textContent = hintText;

    document.getElementById('editConfigModal').style.display = 'block';
}

// 关闭编辑配置模态框
function closeEditConfigModal() {
    document.getElementById('editConfigModal').style.display = 'none';
    currentEditingConfig = null;
}

// 打开添加配置模态框
function openAddConfigModal() {
    document.getElementById('addConfigModal').style.display = 'block';
}

// 关闭添加配置模态框
function closeAddConfigModal() {
    document.getElementById('addConfigModal').style.display = 'none';
    document.getElementById('addConfigForm').reset();
}

// 删除配置
function deleteConfig(key) {
    if (confirm(`确定要删除配置 "${key}" 吗？此操作不可撤销！`)) {
        fetch(`/api/admin/configs/${key}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除配置失败');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('配置删除成功');
                loadConfigsData();
            } else {
                alert('删除失败: ' + data.error);
            }
        })
        .catch(error => {
            alert('删除失败: ' + error.message);
        });
    }
}

// 更新分页控件
function updatePagination(containerId, currentPage, totalPages, loadFunction) {
    // 如果是授权管理的分页，使用专用函数
    if (containerId === 'auths-pagination') {
        return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';

    if (currentPage > 1) {
        html += `<a href="#" onclick="${loadFunction.name}(${currentPage - 1}); return false;">上一页</a>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<a href="#" class="active">${i}</a>`;
        } else {
            html += `<a href="#" onclick="${loadFunction.name}(${i}); return false;">${i}</a>`;
        }
    }

    if (currentPage < totalPages) {
        html += `<a href="#" onclick="${loadFunction.name}(${currentPage + 1}); return false;">下一页</a>`;
    }

    container.innerHTML = html;
}

function updateAuthsPagination(currentPage, totalPages, hasPrev, hasNext) {
    const container = document.getElementById('auths-pagination');
    if (!container) {
        console.error('未找到授权分页容器');
        return;
    }

    let html = '';

    // 上一页按钮
    if (hasPrev) {
        html += `<a href="#" onclick="loadAuthorizationsData(${currentPage - 1}); return false;">上一页</a>`;
    } else {
        html += `<a href="#" style="color: #ccc; cursor: not-allowed;">上一页</a>`;
    }

    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<a href="#" class="active">${i}</a>`;
        } else {
            html += `<a href="#" onclick="loadAuthorizationsData(${i}); return false;">${i}</a>`;
        }
    }

    // 下一页按钮
    if (hasNext) {
        html += `<a href="#" onclick="loadAuthorizationsData(${currentPage + 1}); return false;">下一页</a>`;
    } else {
        html += `<a href="#" style="color: #ccc; cursor: not-allowed;">下一页</a>`;
    }

    // 添加页面信息
    html += `<span style="margin-left: 15px; color: #666;">第 ${currentPage} 页，共 ${totalPages} 页</span>`;

    container.innerHTML = html;
}

// 搜索用户
function searchUsers() {
    const query = document.getElementById('user-search').value;
    if (query) {
        fetch(`/api/admin/users?search=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                const tbody = document.querySelector('#users-table tbody');
                tbody.innerHTML = data.users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${new Date(user.created_at).toLocaleString()}</td>
                        <td>${user.email_verified ? '<span class="status-badge status-active">已验证</span>' : '<span class="status-badge status-expired">未验证</span>'}</td>
                        <td>
                            <button class="btn btn-danger" onclick="deleteUser(${user.id})" ${user.username === '{{ ADMIN_USERNAME }}' ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i> 删除
                            </button>
                        </td>
                    </tr>
                `).join('');
                document.getElementById('users-pagination').innerHTML = '';
            });
    } else {
        loadUsersData();
    }
}

// 删除用户
function deleteUser(userId) {
    if (confirm('确定要删除这个用户吗？此操作不可逆！')) {
        fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('用户删除成功');
                    loadUsersData();
                } else {
                    alert('删除失败: ' + data.error);
                }
            });
    }
}

// 删除应用
function deleteClient(clientId) {
    if (confirm('确定要删除这个应用吗？所有相关授权和数据都将被删除！')) {
        fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('应用删除成功');
                    loadClientsData();
                } else {
                    alert('删除失败: ' + data.error);
                }
            });
    }
}

// 编辑配置表单提交
document.getElementById('editConfigForm').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!currentEditingConfig) return;

    const formData = new FormData(this);
    const key = formData.get('key');
    const description = formData.get('description');
    const category = formData.get('category');
    const is_public = formData.get('is_public') === 'on';

    // 获取值（根据原始类型处理）
    let value;
    const valueElement = document.getElementById('edit-config-value');
    const originalType = currentEditingConfig.value_type;

    switch(originalType) {
        case 'boolean':
            value = valueElement.checked;
            break;
        case 'number':
            value = parseFloat(valueElement.value);
            if (isNaN(value)) {
                alert('请输入有效的数字');
                return;
            }
            break;
        case 'json':
            try {
                value = JSON.parse(valueElement.value);
            } catch (e) {
                alert('JSON格式无效，请检查输入');
                return;
            }
            break;
        default:
            value = valueElement.value;
    }

    // 发送更新请求，包含类型信息
    fetch(`/api/admin/configs/${key}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            value: value,
            value_type: originalType, // 确保传递类型信息
            description: description,
            category: category,
            is_public: is_public
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('更新配置失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('配置更新成功，您可能需要在服务器上重新部署该网站');
            closeEditConfigModal();
            loadConfigsData();
        } else {
            alert('更新失败: ' + data.error);
        }
    })
    .catch(error => {
        alert('更新失败: ' + error.message);
    });
});

// 添加配置表单提交
document.getElementById('addConfigForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const key = formData.get('key');
    const value = formData.get('value');
    const description = formData.get('description');
    const category = formData.get('category');
    const is_public = formData.get('is_public') === 'on';

    // 发送创建请求
    fetch('/api/admin/configs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            key: key,
            value: value,
            description: description,
            category: category,
            is_public: is_public
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || '创建配置失败') });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('配置创建成功');
            closeAddConfigModal();
            loadConfigsData();
        } else {
            alert('创建失败: ' + data.error);
        }
    })
    .catch(error => {
        alert('创建失败: ' + error.message);
    });
});

// 模态框点击外部关闭
window.onclick = function(event) {
    const editModal = document.getElementById('editConfigModal');
    const addModal = document.getElementById('addConfigModal');

    if (event.target === editModal) {
        closeEditConfigModal();
    }
    if (event.target === addModal) {
        closeAddConfigModal();
    }
}

// 页面加载时初始化仪表板
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
});

// 打开空模态框
function openEmptyModal(options = {}) {
    const {
        title = '模态框',
        content = '',
        footer = '',
        size = 'medium', // small, medium, large, xlarge, fullscreen
        onClose = null,
        onSubmit = null
    } = options;

    // 设置标题
    document.getElementById('emptyModalTitle').textContent = title;

    // 设置内容
    document.getElementById('emptyModalBody').innerHTML = content;

    // 设置底部按钮
    document.getElementById('emptyModalFooter').innerHTML = footer;

    // 设置尺寸
    const modalContent = document.querySelector('#emptyModal .modal-content');
    modalContent.className = 'modal-content';
    if (size) {
        modalContent.classList.add(size);
    }

    // 保存回调函数
    currentModalCallbacks = { onClose, onSubmit };

    // 显示模态框
    document.getElementById('emptyModal').style.display = 'block';
}

// 关闭空模态框
function closeEmptyModal() {
    document.getElementById('emptyModal').style.display = 'none';

    // 执行关闭回调
    if (currentModalCallbacks.onClose) {
        currentModalCallbacks.onClose();
    }

    // 重置回调
    currentModalCallbacks = { onClose: null, onSubmit: null };
}

// 提交空模态框
function submitEmptyModal() {
    if (currentModalCallbacks.onSubmit) {
        currentModalCallbacks.onSubmit();
    }
}

// 创建确认对话框
function showConfirmModal(options = {}) {
    const {
        title = '确认操作',
        message = '您确定要执行此操作吗？',
        confirmText = '确定',
        cancelText = '取消',
        onConfirm = null,
        onCancel = null,
        type = 'warning' // warning, danger, info, success
    } = options;

    const iconMap = {
        warning: 'fa-exclamation-triangle',
        danger: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        success: 'fa-check-circle'
    };

    const colorMap = {
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--primary)',
        success: 'var(--success)'
    };

    const content = `
        <div style="display: flex; align-items: flex-start; gap: 15px; padding: 10px 0;">
            <i class="fas ${iconMap[type]}" style="font-size: 2rem; color: ${colorMap[type]}; margin-top: 5px;"></i>
            <div style="flex: 1;">
                <p style="margin: 0; font-size: 1rem; line-height: 1.5;">${message}</p>
            </div>
        </div>
    `;

    const footer = `
        <button type="button" class="btn btn-secondary" onclick="closeEmptyModal()">${cancelText}</button>
        <button type="button" class="btn ${type === 'danger' ? 'btn-danger' : type === 'success' ? 'btn-primary' : 'btn-warning'}"
                onclick="handleConfirmAction()">${confirmText}</button>
    `;

    openEmptyModal({
        title,
        content,
        footer,
        size: 'small',
        onClose: onCancel,
        onSubmit: onConfirm
    });

    // 处理确认操作
    window.handleConfirmAction = function() {
        if (onConfirm) {
            onConfirm();
        }
        closeEmptyModal();
    };
}

// 创建加载中模态框
function showLoadingModal(message = '加载中...') {
    const content = `
        <div style="text-align: center; padding: 40px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
            <p style="margin: 0; font-size: 1.1rem; color: var(--gray);">${message}</p>
        </div>
    `;

    openEmptyModal({
        title: '请稍候',
        content,
        footer: '',
        size: 'small'
    });
}

// 创建表单模态框
function showFormModal(options = {}) {
    const {
        title = '表单',
        formId = 'dynamicForm',
        fields = [],
        submitText = '提交',
        cancelText = '取消',
        onSubmit = null,
        onCancel = null
    } = options;

    let formHTML = '';
    fields.forEach(field => {
        const { type, name, label, value = '', placeholder = '', required = false, options = [] } = field;

        let fieldHTML = '';
        switch (type) {
            case 'textarea':
                fieldHTML = `
                    <textarea name="${name}" class="form-textarea" placeholder="${placeholder}" ${required ? 'required' : ''}>${value}</textarea>
                `;
                break;
            case 'select':
                fieldHTML = `
                    <select name="${name}" class="form-select" ${required ? 'required' : ''}>
                        ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                    </select>
                `;
                break;
            case 'checkbox':
                fieldHTML = `
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" name="${name}" class="config-checkbox" ${value ? 'checked' : ''}>
                        ${label}
                    </label>
                `;
                break;
            default:
                fieldHTML = `
                    <input type="${type}" name="${name}" class="form-input" value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''}>
                `;
        }

        if (type !== 'checkbox') {
            formHTML += `
                <div class="form-group">
                    <label class="form-label">${label}</label>
                    ${fieldHTML}
                </div>
            `;
        } else {
            formHTML += `
                <div class="form-group">
                    ${fieldHTML}
                </div>
            `;
        }
    });

    const content = `
        <form id="${formId}">
            ${formHTML}
        </form>
    `;

    const footer = `
        <button type="button" class="btn btn-secondary" onclick="closeEmptyModal()">${cancelText}</button>
        <button type="submit" form="${formId}" class="btn btn-primary">${submitText}</button>
    `;

    openEmptyModal({
        title,
        content,
        footer,
        size: 'medium',
        onClose: onCancel,
        onSubmit: () => {
            const form = document.getElementById(formId);
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            // 处理复选框
            fields.forEach(field => {
                if (field.type === 'checkbox') {
                    const checkbox = form.querySelector(`[name="${field.name}"]`);
                    data[field.name] = checkbox.checked;
                }
            });

            if (onSubmit) {
                onSubmit(data);
            }
        }
    });

    // 添加表单提交事件
    const form = document.getElementById(formId);
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitEmptyModal();
        });
    }
}

function toggleConfigCategory(category) {
    const itemsContainer = document.getElementById(`category-${category}`);
    const header = document.querySelector(`.config-category-header[data-category="${category}"]`);

    if (!header || !itemsContainer) return;

    const chevron = header.querySelector('.category-chevron');

    if (configCategoryState[category]) {
        // 当前是展开状态，要折叠
        itemsContainer.style.display = 'none';
        chevron.className = 'fas fa-chevron-right category-chevron';
        configCategoryState[category] = false;
    } else {
        // 当前是折叠状态，要展开
        itemsContainer.style.display = 'block';
        chevron.className = 'fas fa-chevron-down category-chevron';
        configCategoryState[category] = true;
    }
}

// 折叠/展开所有分类
function toggleAllConfigCategories(expand) {
    Object.keys(configCategoryState).forEach(category => {
        configCategoryState[category] = expand;
        const itemsContainer = document.getElementById(`category-${category}`);
        const header = document.querySelector(`.config-category-header[data-category="${category}"]`);

        if (header && itemsContainer) {
            const chevron = header.querySelector('.category-chevron');
            itemsContainer.style.display = expand ? 'block' : 'none';
            chevron.className = `fas fa-chevron-${expand ? 'down' : 'right'} category-chevron`;
        }
    });
}

// 更新模态框点击外部关闭功能
window.onclick = function(event) {
    const modals = ['editConfigModal', 'addConfigModal', 'emptyModal'];

    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'emptyModal') {
                closeEmptyModal();
            } else if (modalId === 'editConfigModal') {
                closeEditConfigModal();
            } else if (modalId === 'addConfigModal') {
                closeAddConfigModal();
            }
        }
    });
}

// ESC键关闭所有模态框
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeEmptyModal();
        closeEditConfigModal();
        closeAddConfigModal();
    }
});