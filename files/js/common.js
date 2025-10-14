// Common utility functions - 修复移动端菜单
// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化移动端菜单...');
    initMobileMenu();
    initMenuEventListeners();

    // 页面加载时确保菜单状态正确
    resetMenuStateOnPageLoad();
});

// 页面加载时重置菜单状态
function resetMenuStateOnPageLoad() {
    console.log('重置菜单状态...');

    // 在页面加载时强制关闭移动端菜单
    if (isMobile()) {
        closeMobileMenu();
    } else {
        // 桌面端确保菜单可见
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');

        if (sidebar) {
            sidebar.classList.remove('mobile-hidden', 'mobile-visible');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
        if (mobileMenuBtn) {
            mobileMenuBtn.style.display = 'none';
            mobileMenuBtn.classList.remove('active');
            updateMenuButtonIcon(false);
        }

        // 确保body滚动正常
        document.body.style.overflow = '';
    }
}

// 初始化移动端菜单
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    // 确保元素存在
    if (!mobileMenuBtn || !sidebar || !overlay) {
        console.warn('移动端菜单元素未找到');
        return;
    }

    // 设置初始状态 - 移动端默认关闭，桌面端默认显示
    if (isMobile()) {
        closeMobileMenu(); // 移动端默认关闭
    } else {
        // 桌面端确保菜单可见
        sidebar.classList.remove('mobile-hidden', 'mobile-visible');
        overlay.classList.remove('active');
        mobileMenuBtn.style.display = 'none';
    }

    console.log('移动端菜单初始化完成 - 当前设备:', isMobile() ? '移动端' : '桌面端');
}

// 初始化菜单事件监听器
function initMenuEventListeners() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (!mobileMenuBtn || !sidebar || !overlay) return;

    // 菜单按钮点击事件
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMobileMenu();
    });

    // 遮罩点击事件
    overlay.addEventListener('click', function() {
        closeMobileMenu();
    });

    // 侧边栏链接点击事件 - 修复：添加更可靠的事件处理
    const navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(link => {
        // 移除旧的事件监听器（如果存在）
        link.removeEventListener('click', handleNavLinkClick);
        // 添加新的事件监听器
        link.addEventListener('click', handleNavLinkClick);
    });

    // 窗口大小改变时重新初始化
    window.addEventListener('resize', function() {
        handleWindowResize();
    });

    // ESC键关闭菜单
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });

    // 页面可见性变化时重置菜单状态（处理浏览器前进/后退）
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            resetMenuStateOnPageLoad();
        }
    });

    // 页面加载完成后再检查一次
    window.addEventListener('load', function() {
        setTimeout(resetMenuStateOnPageLoad, 100);
    });
}

// 处理导航链接点击
function handleNavLinkClick(e) {
    console.log('导航链接被点击', this.href);

    if (isMobile()) {
        console.log('移动端：点击链接后关闭菜单');
        // 在移动端，点击链接后立即关闭菜单
        closeMobileMenu();

        // 如果是内部链接，让浏览器正常处理导航
        // 如果是外部链接或特殊链接，不需要额外处理
        return true; // 允许默认行为
    }
    // 桌面端不需要特殊处理
}

// 切换移动端菜单
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (!sidebar || !overlay || !mobileMenuBtn) return;

    const isCurrentlyOpen = sidebar.classList.contains('mobile-visible');

    if (isCurrentlyOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// 打开移动端菜单
function openMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (!sidebar || !overlay || !mobileMenuBtn) return;

    console.log('打开移动端菜单');

    // 显示菜单和遮罩
    sidebar.classList.remove('mobile-hidden');
    sidebar.classList.add('mobile-visible');
    overlay.classList.add('active');
    mobileMenuBtn.classList.add('active');

    // 防止背景滚动
    document.body.style.overflow = 'hidden';

    // 更新按钮图标
    updateMenuButtonIcon(true);
}

// 关闭移动端菜单
function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (!sidebar || !overlay || !mobileMenuBtn) return;

    console.log('关闭移动端菜单');

    // 隐藏菜单和遮罩
    sidebar.classList.remove('mobile-visible');
    sidebar.classList.add('mobile-hidden');
    overlay.classList.remove('active');
    mobileMenuBtn.classList.remove('active');

    // 恢复背景滚动
    document.body.style.overflow = '';

    // 更新按钮图标
    updateMenuButtonIcon(false);
}

// 更新菜单按钮图标
function updateMenuButtonIcon(isOpen) {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (!mobileMenuBtn) return;

    const icon = mobileMenuBtn.querySelector('i');
    if (icon) {
        if (isOpen) {
            icon.className = 'fas fa-times';
            mobileMenuBtn.style.background = 'rgba(66, 133, 244, 0.9)'; // 打开时蓝色背景
            mobileMenuBtn.style.color = 'white';
        } else {
            icon.className = 'fas fa-bars';
            mobileMenuBtn.style.background = 'rgba(255, 255, 255, 0.9)'; // 关闭时白色背景
            mobileMenuBtn.style.color = '#333';
        }
    }
}

// 处理窗口大小变化
function handleWindowResize() {
    console.log('窗口大小改变，当前设备:', isMobile() ? '移动端' : '桌面端');

    // 延迟处理，避免频繁触发
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(function() {
        resetMenuStateOnPageLoad();
    }, 250);
}

// 更新菜单状态
function updateMenuState(isMobileView) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (!sidebar || !overlay || !mobileMenuBtn) return;

    if (isMobileView) {
        // 移动端：隐藏侧边栏，显示菜单按钮
        sidebar.classList.add('mobile-hidden');
        sidebar.classList.remove('mobile-visible');
        overlay.classList.remove('active');
        mobileMenuBtn.style.display = 'flex';
        mobileMenuBtn.classList.remove('active');
        updateMenuButtonIcon(false);
    } else {
        // 桌面端：显示侧边栏，隐藏菜单按钮
        sidebar.classList.remove('mobile-hidden', 'mobile-visible');
        overlay.classList.remove('active');
        mobileMenuBtn.style.display = 'none';
        mobileMenuBtn.classList.remove('active');
        document.body.style.overflow = ''; // 确保恢复滚动
    }
}

// 检测是否为移动设备
function isMobile() {
    return window.innerWidth < 768;
}

// 复制到剪贴板功能
function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('已复制到剪贴板', 'success');
}

// 显示 toast 通知
function showToast(message, type = 'info') {
    // 移除现有的 toast
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(52, 168, 83, 0.95)' :
                      type === 'error' ? 'rgba(234, 67, 53, 0.95)' :
                      'rgba(66, 133, 244, 0.95)'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: toastSlideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 300px;
        word-wrap: break-word;
    `;

    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-circle' : 'info-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 确认对话框
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// 切换面板可见性
function togglePanel(panelId, iconId) {
    const panel = document.getElementById(panelId);
    const icon = document.getElementById(iconId);

    if (!panel || !icon) return;

    if (panel.classList.contains('expanded')) {
        panel.classList.remove('expanded');
        icon.className = 'fas fa-chevron-down';
    } else {
        panel.classList.add('expanded');
        icon.className = 'fas fa-chevron-up';
    }
}

// 添加 CSS 动画（如果尚未添加）
if (!document.querySelector('style[data-common-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-common-animations', 'true');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes toastSlideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes toastSlideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }

        .panel-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .panel-content.expanded {
            max-height: 600px;
        }

        /* 自定义 toast 样式 */
        .custom-toast {
            font-family: 'Arial', sans-serif;
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
}

// 页面加载完成后的通用初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，执行通用初始化');

    // 初始化工具提示（如果有的话）
    initTooltips();

    // 初始化表单验证（如果有的话）
    initFormValidation();
});

// 初始化工具提示
function initTooltips() {
    const elementsWithTooltip = document.querySelectorAll('[data-tooltip]');
    elementsWithTooltip.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

// 显示工具提示
function showTooltip(e) {
    const tooltipText = this.getAttribute('data-tooltip');
    if (!tooltipText) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.8rem;
        z-index: 10000;
        white-space: nowrap;
        pointer-events: none;
    `;

    document.body.appendChild(tooltip);

    const rect = this.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';

    this._currentTooltip = tooltip;
}

// 隐藏工具提示
function hideTooltip() {
    if (this._currentTooltip) {
        this._currentTooltip.remove();
        this._currentTooltip = null;
    }
}

// 初始化表单验证
function initFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

// 表单验证
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            markFieldInvalid(field);
            isValid = false;
        } else {
            markFieldValid(field);
        }
    });

    return isValid;
}

// 标记字段为无效
function markFieldInvalid(field) {
    field.style.borderColor = '#ea4335';
    field.style.boxShadow = '0 0 5px rgba(234, 67, 53, 0.5)';
}

// 标记字段为有效
function markFieldValid(field) {
    field.style.borderColor = '#34a853';
    field.style.boxShadow = '0 0 5px rgba(52, 168, 83, 0.5)';
}


