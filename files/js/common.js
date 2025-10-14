// Common utility functions

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    function isMobile() {
        return window.innerWidth < 768;
    }

    function initMenu() {
        if (isMobile()) {
            mobileMenuBtn.style.display = 'block';
            sidebar.classList.add('mobile-hidden');
            overlay.style.display = 'none';
        } else {
            mobileMenuBtn.style.display = 'none';
            sidebar.classList.remove('mobile-hidden');
            overlay.style.display = 'none';
        }
    }

    function toggleMenu() {
        if (sidebar.classList.contains('mobile-hidden')) {
            sidebar.classList.remove('mobile-hidden');
            overlay.style.display = 'block';
        } else {
            sidebar.classList.add('mobile-hidden');
            overlay.style.display = 'none';
        }
    }

    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        window.addEventListener('resize', initMenu);
        initMenu();
    }
});

// Copy to clipboard function
function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('已复制到剪贴板', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(52, 168, 83, 0.9)' :
                      type === 'error' ? 'rgba(234, 67, 53, 0.9)' : 'rgba(66, 133, 244, 0.9)'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' :
                          type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Confirm dialog
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Toggle panel visibility
function togglePanel(panelId, iconId) {
    const panel = document.getElementById(panelId);
    const icon = document.getElementById(iconId);

    if (panel.classList.contains('expanded')) {
        panel.classList.remove('expanded');
        icon.className = 'fas fa-chevron-down';
    } else {
        panel.classList.add('expanded');
        icon.className = 'fas fa-chevron-up';
    }
}

// Add CSS animations if not already present
if (!document.querySelector('style[data-common-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-common-animations', 'true');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        .panel-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .panel-content.expanded {
            max-height: 600px;
        }
    `;
    document.head.appendChild(style);
}