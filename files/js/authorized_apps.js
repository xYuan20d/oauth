// Authorized Apps Management

let currentModal = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('授权管理页面初始化...');
    loadAuthorizedApps();
});

// Load authorized apps
async function loadAuthorizedApps() {
    try {
        console.log('开始加载授权应用...');

        const response = await fetch('/api/authorized_apps');
        console.log('响应状态:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('授权应用数据:', data);

            displayApps(data.authorized_apps);
            updateStats(data.authorized_apps);
        } else {
            throw new Error('获取授权应用失败: ' + response.status);
        }
    } catch (error) {
        console.error('加载授权应用失败:', error);
        showError('加载授权应用失败，请刷新页面重试');
    }
}

// Display apps in the grid
function displayApps(apps) {
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const appsGrid = document.getElementById('apps-grid');

    loadingState.style.display = 'none';

    if (!apps || apps.length === 0) {
        emptyState.style.display = 'block';
        appsGrid.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    appsGrid.style.display = 'grid';
    appsGrid.innerHTML = '';

    apps.forEach((app, index) => {
        const appCard = createAppCard(app, index);
        appsGrid.appendChild(appCard);
    });

    // Add animation effects
    animateCards();
}

// Create app card HTML
function createAppCard(app, index) {
    const card = document.createElement('div');
    card.className = `app-card ${app.is_active ? 'active' : 'inactive'}`;
    card.style.animationDelay = `${index * 100}ms`;

    const appIcon = app.client_name ? app.client_name[0].toUpperCase() : 'A';
    const authDate = app.authorized_at ? new Date(app.authorized_at).toLocaleDateString('zh-CN') : '未知';

    card.innerHTML = `
        <div class="app-header">
            <div class="d-flex align-center">
                <div class="app-icon">${appIcon}</div>
                <div class="app-info">
                    <div class="app-name">${app.client_name || '未知应用'}</div>
                    <div class="app-client-id">${app.client_id}</div>
                </div>
            </div>
            <span class="app-status ${app.is_active ? 'status-active' : 'status-inactive'}">
                ${app.is_active ? '活跃' : '已过期'}
            </span>
        </div>

        <div class="app-details">
            <div class="detail-item">
                <span class="detail-label">授权时间:</span>
                <span class="detail-value">${authDate}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">权限范围:</span>
                <span class="detail-value">${app.scope || '基础权限'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">客户端ID:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 0.8rem;">${app.client_id}</span>
            </div>
        </div>

        <div class="action-buttons">
            <button class="btn btn-secondary btn-small" onclick="viewAppDetails('${app.client_id}')">
                <i class="fas fa-info-circle"></i> 详情
            </button>
            <button class="btn btn-info btn-small" onclick="manageAppData('${app.client_id}', '${app.client_name || '该应用'}')">
                <i class="fas fa-database"></i> 查看数据
            </button>
            <button class="btn btn-danger btn-small" onclick="revokeAuthorization('${app.client_id}', '${app.client_name || '该应用'}')">
                <i class="fas fa-trash-alt"></i> 取消授权
            </button>
        </div>
    `;

    return card;
}

// Update statistics
function updateStats(apps) {
    const totalApps = apps.length;
    const activeApps = apps.filter(app => app.is_active).length;

    document.getElementById('total-apps-count').textContent = totalApps;
    document.getElementById('active-apps-count').textContent = activeApps;
}

// View app details
function viewAppDetails(clientId) {
    showToast(`查看应用 ${clientId} 的详细信息\n\n此功能正在开发中...`, 'info');
}

// Revoke authorization
async function revokeAuthorization(clientId, appName) {
    confirmAction(`确定要取消对 "${appName}" 的授权吗？\n\n这将撤销该应用的所有访问权限，您可能需要重新登录。`, async () => {
        try {
            const response = await fetch(`/api/authorized_apps/${clientId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                showToast(result.message, 'success');
                // Reload apps list
                loadAuthorizedApps();
            } else {
                throw new Error('取消授权失败');
            }
        } catch (error) {
            console.error('取消授权失败:', error);
            showToast('取消授权失败，请重试', 'error');
        }
    });
}

// Manage app data
async function manageAppData(clientId, appName) {
    try {
        const response = await fetch(`/api/authorized_apps/${clientId}/details`);

        if (response.ok) {
            const data = await response.json();
            showDataManagementModal(clientId, appName, data);
        } else {
            throw new Error('获取应用数据失败');
        }
    } catch (error) {
        console.error('获取应用数据失败:', error);
        showToast('获取应用数据失败', 'error');
    }
}

// Show data management modal
function showDataManagementModal(clientId, appName, data) {
    const modal = document.getElementById('data-management-modal');
    const modalBody = document.getElementById('modal-body');

    const storedDataCount = data.stored_data ? data.stored_data.count : 0;

    modalBody.innerHTML = `
        <div class="data-info-section">
            <h4><i class="fas fa-info-circle"></i> 数据说明</h4>
            <p style="margin: 0; font-size: 0.9rem; color: #666;">
                此数据为应用全局数据，所有用户共享。为了保护其他用户的权益，您只能查看数据信息，无法修改或删除。
            </p>
        </div>

        <div style="margin-bottom: 20px;">
            <h3><i class="fas fa-info-circle"></i> 应用信息</h3>
            <p><strong>客户端ID:</strong> <code style="background: #f5f5f5; padding: 2px 5px; border-radius: 3px;">${clientId}</code></p>
            <p><strong>存储的数据项:</strong> ${storedDataCount} 个</p>
            <p><strong>当前状态:</strong> ${data.current_authorization && data.current_authorization.has_active_token ? '<span style="color: #34a853;">已授权</span>' : '<span style="color: #ea4335;">未授权</span>'}</p>
        </div>

        ${storedDataCount > 0 ? `
        <div style="margin-bottom: 20px;">
            <h3><i class="fas fa-table"></i> 存储的数据结构</h3>
            <div class="data-structure">
                ${data.stored_data.items.map(item => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <span class="data-item-key">${item.key}</span>
                            <span class="data-item-type">类型: ${item.type}</span>
                        </div>
                        <div class="data-item-meta">
                            最后更新: ${new Date(item.updated_at).toLocaleString('zh-CN')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
            <i class="fas fa-database" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
            <p style="margin: 0;">该应用尚未存储任何全局数据</p>
        </div>
        `}

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        </div>
    `;

    modal.style.display = 'block';
    currentModal = modal;
}

// Close modal
function closeModal() {
    if (currentModal) {
        currentModal.style.display = 'none';
        currentModal = null;
    }
}

// Animate cards on load
function animateCards() {
    const cards = document.querySelectorAll('.app-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('data-management-modal');
    if (event.target === modal) {
        closeModal();
    }
}