// Form validation utilities

function showError(message) {
    const errorElement = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    if (errorElement && errorText) {
        errorText.textContent = message;
        errorElement.classList.add('show');
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        showToast(message, 'error');
    }
}

function hideError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

function validateClientForm() {
    const clientName = document.getElementById('client_name').value.trim();
    const redirectUris = document.getElementById('redirect_uris').value.trim();

    if (!clientName) {
        showError('请输入应用名称');
        document.getElementById('client_name').focus();
        return false;
    }

    if (clientName.length < 2) {
        showError('应用名称至少需要2个字符');
        document.getElementById('client_name').focus();
        return false;
    }

    if (!redirectUris) {
        showError('请输入至少一个回调URL');
        document.getElementById('redirect_uris').focus();
        return false;
    }

    const uris = redirectUris.split('\n')
        .map(uri => uri.trim())
        .filter(uri => uri.length > 0);

    if (uris.length === 0) {
        showError('请输入至少一个有效的回调URL');
        document.getElementById('redirect_uris').focus();
        return false;
    }

    for (let uri of uris) {
        if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
            showError(`回调URL "${uri}" 格式不正确，必须以 http:// 或 https:// 开头`);
            document.getElementById('redirect_uris').focus();
            return false;
        }

        try {
            new URL(uri);
        } catch (err) {
            showError(`回调URL "${uri}" 格式不正确，请检查URL格式`);
            document.getElementById('redirect_uris').focus();
            return false;
        }
    }

    return true;
}

// Auto-resize textareas
function initAutoResizeTextareas() {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Initial resize
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    });
}

// Initialize form validation
document.addEventListener('DOMContentLoaded', function() {
    initAutoResizeTextareas();

    // Add input listeners to hide errors
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', hideError);
    });
});