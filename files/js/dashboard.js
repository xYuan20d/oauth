// Dashboard specific functionality

document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard stats
    loadDashboardStats();

    // Add animations to cards
    animateCards();
});

async function loadDashboardStats() {
    const statIds = [
        'my-apps-count',
        'authorized-users-count',
        'active-sessions-count',
        'total-authorizations-count',
        'monthly-authorizations-count'
    ];

    const endpoints = [
        '/api/stats/my_apps',
        '/api/stats/authorized_users',
        '/api/stats/active_sessions',
        '/api/stats/total_authorizations',
        '/api/stats/monthly_authorizations'
    ];

    try {
        for (let i = 0; i < endpoints.length; i++) {
            const response = await fetch(endpoints[i]);
            if (response.ok) {
                const data = await response.json();
                const element = document.getElementById(statIds[i]);
                if (element) {
                    element.textContent = data.count;
                }
            } else {
                const element = document.getElementById(statIds[i]);
                if (element) {
                    element.textContent = '错误';
                }
            }
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
        statIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '错误';
        });
    }
}

function animateCards() {
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Dashboard specific actions
function storeSampleData() {
    fetch('/store-sample-data', {method: 'POST'})
        .then(response => response.json())
        .then(data => {
            showToast('示例数据存储成功!', 'success');
            setTimeout(() => location.reload(), 1500);
        })
        .catch(error => {
            showToast('操作失败: ' + error, 'error');
        });
}

function clearData() {
    confirmAction('确定要清除所有数据吗？此操作不可撤销。', () => {
        fetch('/clear-data', {method: 'POST'})
            .then(response => response.json())
            .then(data => {
                showToast('所有数据已清除!', 'success');
                setTimeout(() => location.reload(), 1500);
            })
            .catch(error => {
                showToast('操作失败: ' + error, 'error');
            });
    });
}