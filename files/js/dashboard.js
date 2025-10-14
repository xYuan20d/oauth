// Dashboard functionality with JavaScript animations

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboardAnimations();
    loadDashboardStats();
    loadRecentActivities();
    startAutoRefresh();
});

// Initialize dashboard animations
function initializeDashboardAnimations() {
    // 设置所有动画元素的初始状态
    const animatedElements = [
        { selector: '.page-header', delay: 100 },
        { selector: '.stats-row', delay: 200 },
        { selector: '.stat-card:nth-child(1)', delay: 300 },
        { selector: '.stat-card:nth-child(2)', delay: 400 },
        { selector: '.stat-card:nth-child(3)', delay: 500 },
        { selector: '.stat-card:nth-child(4)', delay: 600 },
        { selector: '.quick-actions-card', delay: 400 },
        { selector: '.quick-action:nth-child(1)', delay: 500 },
        { selector: '.quick-action:nth-child(2)', delay: 600 },
        { selector: '.quick-action:nth-child(3)', delay: 700 },
        { selector: '.quick-action:nth-child(4)', delay: 800 },
        { selector: '.quick-action:nth-child(5)', delay: 900 },
        { selector: '.quick-action:nth-child(6)', delay: 1000 },
        { selector: '.feature-card:nth-child(1)', delay: 300 },
        { selector: '.feature-card:nth-child(2)', delay: 400 },
        { selector: '.feature-card:nth-child(3)', delay: 500 },
        { selector: '.feature-card:nth-child(4)', delay: 600 },
        { selector: '.feature-card:nth-child(5)', delay: 700 },
        { selector: '.feature-card:nth-child(6)', delay: 800 },
        { selector: '.dashboard-card:not(.quick-actions-card):not(.feature-card)', delay: 500 },
        { selector: '.activity-item', delay: 600 },
        { selector: '.system-status-bar', delay: 700 }
    ];

    // 设置初始状态
    animatedElements.forEach(item => {
        const elements = document.querySelectorAll(item.selector);
        elements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        });
    });

    // 依次执行动画
    animatedElements.forEach(item => {
        setTimeout(() => {
            const elements = document.querySelectorAll(item.selector);
            elements.forEach(element => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';

                // 动画完成后清除内联样式，让CSS接管
                setTimeout(() => {
                    element.style.transition = '';
                    element.style.transform = '';
                    element.style.opacity = '';
                }, 600);
            });
        }, item.delay);
    });

    // 为功能卡片添加特殊的缩放动画
    setTimeout(() => {
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';

                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';

                    // 动画完成后清除内联样式
                    setTimeout(() => {
                        card.style.transition = '';
                        card.style.transform = '';
                        card.style.opacity = '';
                    }, 500);
                }, 50);
            }, index * 100);
        });
    }, 800);
}

// 原有的其他函数保持不变
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
                // 添加数字计数动画
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

    // 为新增的活动项添加动画
    const newActivityItems = container.querySelectorAll('.activity-item');
    newActivityItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';

            setTimeout(() => {
                item.style.transition = '';
                item.style.transform = '';
                item.style.opacity = '';
            }, 500);
        }, index * 100);
    });
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

    // 添加刷新动画
    const dashboardContent = document.querySelector('.dashboard-main-content');
    if (dashboardContent) {
        dashboardContent.style.transition = 'opacity 0.3s ease';
        dashboardContent.style.opacity = '0.7';
    }

    loadDashboardStats();
    loadRecentActivities();

    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新';
            refreshBtn.disabled = false;
        }
        if (dashboardContent) {
            dashboardContent.style.opacity = '1';
            setTimeout(() => {
                dashboardContent.style.transition = '';
            }, 300);
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

// 添加工具函数
function showToast(message, type) {
    // 简单的toast实现
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#34a853' : '#ea4335'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}