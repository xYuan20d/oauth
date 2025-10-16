// Settings Management

document.addEventListener('DOMContentLoaded', function() {
    initSettings();
});

function initSettings() {
    // Initialize password strength indicator
    initPasswordStrength();

    // Initialize form submissions
    initFormSubmissions();

    // Initialize security settings
    initSecuritySettings();

    // Initialize danger zone
    initDangerZone();

    // Initialize email change functionality
    initEmailChange();
}

// Password strength indicator
function initPasswordStrength() {
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const strengthBar = document.getElementById('password-strength');
    const matchHint = document.getElementById('password-match-hint');

    if (newPasswordInput && confirmPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            updatePasswordStrength(password, strengthBar);
            checkPasswordMatch(newPasswordInput.value, confirmPasswordInput.value, matchHint);
        });

        confirmPasswordInput.addEventListener('input', function() {
            checkPasswordMatch(newPasswordInput.value, this.value, matchHint);
        });
    }
}

function updatePasswordStrength(password, strengthBar) {
    if (!strengthBar) return;

    if (password.length === 0) {
        strengthBar.className = 'password-strength';
        strengthBar.style.width = '0%';
        return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength < 2) {
        strengthBar.className = 'password-strength password-weak';
    } else if (strength < 4) {
        strengthBar.className = 'password-strength password-medium';
    } else {
        strengthBar.className = 'password-strength password-strong';
    }
}

function checkPasswordMatch(password, confirmPassword, hintElement) {
    if (!hintElement) return;

    if (confirmPassword.length === 0) {
        hintElement.textContent = '';
        return;
    }

    if (password === confirmPassword) {
        hintElement.textContent = '密码匹配';
        hintElement.style.color = '#34a853';
    } else {
        hintElement.textContent = '密码不匹配';
        hintElement.style.color = '#ea4335';
    }
}

// Email change functionality
function initEmailChange() {
    const emailForm = document.getElementById('email-form');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');

    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', function() {
            sendEmailVerificationCode();
        });
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', function() {
            verifyEmailCode();
        });
    }

    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // 表单提交由按钮处理
        });
    }
}

async function sendEmailVerificationCode() {
    const currentPassword = document.getElementById('email-current-password').value;
    const newEmail = document.getElementById('new-email').value.trim();
    const alertElement = document.getElementById('email-alert');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verificationSection = document.getElementById('verification-section');

    // 验证必填字段
    if (!currentPassword || !newEmail) {
        showAlert(alertElement, '请填写当前密码和新邮箱地址', 'error');
        return;
    }

    // 验证邮箱格式
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(newEmail)) {
        showAlert(alertElement, '邮箱格式不正确', 'error');
        return;
    }

    try {
        // 禁用发送按钮，显示加载状态
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';

        const response = await fetch('/api/change_email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_email: newEmail
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert(alertElement, result.message, 'success');
            // 显示验证码输入区域
            if (verificationSection) {
                verificationSection.style.display = 'block';
            }
            // 启动倒计时
            startVerificationCountdown();
        } else {
            showAlert(alertElement, result.error || '发送验证码失败', 'error');
        }
    } catch (error) {
        console.error('发送验证码失败:', error);
        showAlert(alertElement, '网络错误，请重试', 'error');
    } finally {
        // 恢复发送按钮
        sendCodeBtn.disabled = false;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送验证码';
    }
}

async function verifyEmailCode() {
    const currentPassword = document.getElementById('email-current-password').value;
    const newEmail = document.getElementById('new-email').value.trim();
    const verificationCode = document.getElementById('verification-code').value.trim();
    const alertElement = document.getElementById('email-alert');
    const verifyCodeBtn = document.getElementById('verify-code-btn');

    if (!verificationCode) {
        showAlert(alertElement, '请输入验证码', 'error');
        return;
    }

    try {
        // 禁用验证按钮，显示加载状态
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 验证中...';

        const response = await fetch('/api/change_email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_email: newEmail,
                verification_code: verificationCode
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert(alertElement, result.message, 'success');
            // 更新页面显示的邮箱
            const emailDisplay = document.getElementById('email');
            if (emailDisplay && result.new_email) {
                emailDisplay.value = result.new_email;
            }
            // 重置表单
            document.getElementById('email-form').reset();
            document.getElementById('verification-section').style.display = 'none';
            // 清除倒计时
            clearVerificationCountdown();
        } else {
            showAlert(alertElement, result.error || '验证失败', 'error');
        }
    } catch (error) {
        console.error('验证失败:', error);
        showAlert(alertElement, '网络错误，请重试', 'error');
    } finally {
        // 恢复验证按钮
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.innerHTML = '<i class="fas fa-check"></i> 验证并修改';
    }
}

let countdownInterval = null;

function startVerificationCountdown() {
    const sendCodeBtn = document.getElementById('send-code-btn');
    const countdownDisplay = document.getElementById('countdown-display');
    let timeLeft = 60;

    // 禁用发送按钮
    sendCodeBtn.disabled = true;

    if (countdownDisplay) {
        countdownDisplay.style.display = 'block';
    }

    countdownInterval = setInterval(() => {
        if (countdownDisplay) {
            countdownDisplay.textContent = `${timeLeft}秒后可重新发送`;
        }

        if (timeLeft <= 0) {
            clearVerificationCountdown();
        }
        timeLeft--;
    }, 1000);
}

function clearVerificationCountdown() {
    const sendCodeBtn = document.getElementById('send-code-btn');
    const countdownDisplay = document.getElementById('countdown-display');

    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    if (sendCodeBtn) {
        sendCodeBtn.disabled = false;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 重新发送验证码';
    }

    if (countdownDisplay) {
        countdownDisplay.style.display = 'none';
    }
}

// Form submissions
function initFormSubmissions() {
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfileSettings(this);
        });
    }

    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword(this);
        });
    }
}

// Save profile settings
async function saveProfileSettings(form) {
    const formData = new FormData(form);
    const alertElement = document.getElementById('profile-alert');

    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        showAlert(alertElement, '个人信息已成功更新！', 'success');
    } catch (error) {
        console.error('保存个人信息失败:', error);
        showAlert(alertElement, '保存失败，请重试', 'error');
    }
}

// Change password
async function changePassword(form) {
    const formData = new FormData(form);
    const alertElement = document.getElementById('password-alert');

    const currentPassword = formData.get('current_password');
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');

    // 前端验证
    if (newPassword !== confirmPassword) {
        showAlert(alertElement, '新密码与确认密码不匹配！', 'error');
        return;
    }

    if (newPassword.length < 8) {
        showAlert(alertElement, '密码长度至少8位！', 'error');
        return;
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
        showAlert(alertElement, '密码必须包含字母和数字！', 'error');
        return;
    }

    try {
        // 调用后端API修改密码
        const response = await fetch('/api/change_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert(alertElement, '密码已成功修改！', 'success');
            form.reset();
            document.getElementById('password-strength').className = 'password-strength';
            document.getElementById('password-strength').style.width = '0%';
            document.getElementById('password-match-hint').textContent = '';
        } else {
            showAlert(alertElement, result.error || '修改失败，请重试', 'error');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        showAlert(alertElement, '网络错误，请重试', 'error');
    }
}

// Security settings
function initSecuritySettings() {
    const saveSecurityBtn = document.getElementById('save-security-btn');
    if (saveSecurityBtn) {
        saveSecurityBtn.addEventListener('click', function() {
            saveSecuritySettings();
        });
    }
}

async function saveSecuritySettings() {
    const twoFactorEnabled = document.getElementById('two-factor').checked;
    const sessionTimeout = document.getElementById('session-timeout').value;

    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        showToast('安全设置已保存！', 'success');
    } catch (error) {
        console.error('保存安全设置失败:', error);
        showToast('保存失败，请重试', 'error');
    }
}

// Danger zone
function initDangerZone() {
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            deleteAccount();
        });
    }
}

function deleteAccount() {
    confirmAction('您确定要永久删除您的账户吗？此操作不可撤销，所有数据将永久丢失！', () => {
        confirmAction('再次确认：您真的要删除账户吗？此操作无法恢复！', () => {
            // This should call the actual delete account API
            showToast('账户删除功能需要后端支持，此操作已取消。', 'warning');
        });
    });
}

// Utility functions
function showAlert(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Show toast notification (using common.js function)
// function showToast(message, type) is already available from common.js

// Confirm action (using common.js function)
// function confirmAction(message, callback) is already available from common.js