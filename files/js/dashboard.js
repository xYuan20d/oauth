// Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard 初始化...');
    loadDashboardStats();
    loadRecentActivities();
    startAutoRefresh();
});

// Load dashboard statistics
async function loadDashboardStats() {
    const statIds = [
        'my-apps-count',
        'authorized-users-count',
        'active-sessions-count',
        'total-authorizations-count',
        'monthly-authorizations-count',
        'weekly-active-count'
    ];

    const endpoints = [
        '/api/stats/my_apps',
        '/api/stats/authorized_users',
        '/api/stats/active_sessions',
        '/api/stats/total_authorizations',
        '/api/stats/monthly_authorizations',
        '/api/stats/weekly_active'
    ];

    try {
        const promises = endpoints.map(endpoint =>
            fetch(endpoint).then(response => response.ok ? response.json() : {count: 0})
        );

        const results = await Promise.all(promises);

        results.forEach((data, index) => {
            const element = document.getElementById(statIds[index]);
            if (element) {
                // Add counting animation
                animateCount(element, data.count || 0);
            }
        });

        updateLastUpdateTime();
    } catch (error) {
        console.error('加载统计数据失败:', error);
        statIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
    }
}

// Animate number counting
function animateCount(element, target) {
    const duration = 1000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Load recent activities
async function loadRecentActivities() {
    const activitiesContainer = document.getElementById('recent-activities');

    try {
        const response = await fetch('/api/recent_activities');

        if (response.ok) {
            const activities = await response.json();
            displayActivities(activities);
        } else {
            throw new Error('获取活动记录失败');
        }
    } catch (error) {
        console.error('加载活动记录失败:', error);
        activitiesContainer.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">无法加载活动记录</div>
                    <div class="activity-time">请稍后重试</div>
                </div>
            </div>
        `;
    }
}

// Display activities
function displayActivities(activities) {
    const container = document.getElementById('recent-activities');

    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">暂无活动记录</div>
                    <div class="activity-time">开始使用功能后将会显示在这里</div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${formatActivityTime(activity.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

// Get icon for activity type
function getActivityIcon(type) {
    const icons = {
        'app_created': 'plus-circle',
        'app_updated': 'edit',
        'app_deleted': 'trash-alt',
        'authorization_granted': 'shield-check',
        'authorization_revoked': 'shield-times',
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'data_stored': 'save',
        'data_cleared': 'broom'
    };
    return icons[type] || 'info-circle';
}

// Format activity time
function formatActivityTime(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return activityTime.toLocaleDateString('zh-CN');
}

// Update last update time
function updateLastUpdateTime() {
    const element = document.getElementById('last-update-time');
    if (element) {
        element.textContent = '刚刚';
    }
}

// Refresh dashboard
function refreshDashboard() {
    const refreshBtn = document.querySelector('.btn-refresh');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;
    }

    loadDashboardStats();
    loadRecentActivities();

    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新';
            refreshBtn.disabled = false;
        }
        showToast('仪表板已刷新', 'success');
    }, 1000);
}

// Auto refresh every 5 minutes
function startAutoRefresh() {
    setInterval(() => {
        loadDashboardStats();
    }, 300000); // 5 minutes
}

// Store sample data
function storeSampleData() {
    fetch('/store-sample-data', {method: 'POST'})
        .then(response => response.json())
        .then(data => {
            showToast('示例数据存储成功!', 'success');
            // Refresh activities
            loadRecentActivities();
        })
        .catch(error => {
            showToast('操作失败: ' + error, 'error');
        });
}

// Clear data
function clearData() {
    confirmAction('确定要清除所有数据吗？此操作不可撤销。', () => {
        fetch('/clear-data', {method: 'POST'})
            .then(response => response.json())
            .then(data => {
                showToast('所有数据已清除!', 'success');
                // Refresh activities and stats
                loadRecentActivities();
                loadDashboardStats();
            })
            .catch(error => {
                showToast('操作失败: ' + error, 'error');
            });
    });
}

// Add CSS for animations
if (!document.querySelector('#dashboard-animations')) {
    const style = document.createElement('style');
    style.id = 'dashboard-animations';
    style.textContent = `
        .btn-refresh:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .stat-card:hover .stat-icon {
            animation: pulse 0.5s ease;
        }
    `;
    document.head.appendChild(style);
}