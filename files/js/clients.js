// Clients management functionality with enhanced UI components

let currentEditingClientId = null;

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
        font-family: inherit;
    `;

    toast.innerHTML = `
        <i class="${icons[type] || icons.info}" style="font-size: 1.2em;"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);

    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    });
}

// Enhanced confirm dialog
function confirmAction(message, confirmCallback, cancelCallback = null, options = {}) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    const {
        confirmText = '确认',
        cancelText = '取消',
        danger = false,
        title = '确认操作'
    } = options;

    modal.innerHTML = `
        <div style="
            background: rgba(45, 45, 45, 0.95);
            padding: 30px;
            border-radius: 15px;
            max-width: 450px;
            width: 90%;
            color: white;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease;
        ">
            <div style="font-size: 3rem; margin-bottom: 15px; color: ${danger ? '#e74c3c' : '#4285f4'};">
                <i class="fas ${danger ? 'fa-exclamation-triangle' : 'fa-question-circle'}"></i>
            </div>
            <h3 style="margin-bottom: 10px; color: ${danger ? '#e74c3c' : 'white'};">
                ${title}
            </h3>
            <p style="margin-bottom: 25px; line-height: 1.5; color: rgba(255, 255, 255, 0.8);">
                ${message}
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="confirmCancel" style="
                    padding: 12px 25px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    min-width: 100px;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                   onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    ${cancelText}
                </button>
                <button id="confirmOk" style="
                    padding: 12px 25px;
                    background: ${danger ? '#e74c3c' : '#4285f4'};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    min-width: 100px;
                " onmouseover="this.style.background='${danger ? '#c0392b' : '#3367d6'}'"
                   onmouseout="this.style.background='${danger ? '#e74c3c' : '#4285f4'}'">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Bind events
    const cancelBtn = document.getElementById('confirmCancel');
    const okBtn = document.getElementById('confirmOk');

    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            }
        }, 300);
    };

    cancelBtn.onclick = () => {
        closeModal();
        if (cancelCallback) cancelCallback();
    };

    okBtn.onclick = () => {
        closeModal();
        confirmCallback();
    };

    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
            if (cancelCallback) cancelCallback();
        }
    });
}

// Initialize client management
document.addEventListener('DOMContentLoaded', function() {
    initClientManagement();
});

function initClientManagement() {
    // Modal functionality
    const modal = document.getElementById('editModal');
    if (modal) {
        window.onclick = function(event) {
            if (event.target === modal) {
                closeEditModal();
            }
        }
    }
}

// Public Data Access Functions
function togglePublicData(clientId) {
    const isEnabled = document.getElementById(`public-data-toggle-${clientId}`).checked;

    fetch(`/api/client/${clientId}/toggle_public_data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            // If public data is enabled but no token, show token generation option
            if (data.public_data_enabled) {
                const tokenSection = document.getElementById(`token-section-${clientId}`);
                tokenSection.classList.add('active');
            }
        } else {
            showToast(data.error, 'error');
            // Revert switch state
            document.getElementById(`public-data-toggle-${clientId}`).checked = !isEnabled;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('操作失败，请重试', 'error');
        document.getElementById(`public-data-toggle-${clientId}`).checked = !isEnabled;
    });
}

function generateNewToken(clientId) {
    confirmAction(
        '确定要生成新的数据访问令牌吗？旧的令牌将立即失效！',
        () => {
            fetch(`/api/client/${clientId}/generate_data_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    // Update token display
                    const tokenValueElement = document.getElementById(`token-value-${clientId}`);
                    if (tokenValueElement) {
                        tokenValueElement.textContent = data.data_access_token;
                    } else {
                        // Reload page to show new token
                        location.reload();
                    }
                } else {
                    showToast(data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('生成令牌失败，请重试', 'error');
            });
        },
        null,
        {
            title: '生成新令牌',
            confirmText: '生成',
            danger: false
        }
    );
}

function revokeToken(clientId) {
    confirmAction(
        '确定要撤销数据访问令牌吗？使用此令牌的应用将无法再访问数据！',
        () => {
            fetch(`/api/client/${clientId}/revoke_data_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    // Reload page
                    location.reload();
                } else {
                    showToast(data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('撤销令牌失败，请重试', 'error');
            });
        },
        null,
        {
            title: '撤销令牌',
            confirmText: '撤销',
            danger: true
        }
    );
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败', 'error');
    });
}

// Panel toggle
function togglePanel(panelId, iconId) {
    const panel = document.getElementById(panelId);
    const icon = document.getElementById(iconId);

    if (panel.classList.contains('expanded')) {
        panel.classList.remove('expanded');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    } else {
        panel.classList.add('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    }
}

// Modal functions
function openEditModal(clientId, clientName, redirectUris) {
    currentEditingClientId = clientId;

    document.getElementById('client_name').value = clientName;

    try {
        let redirectUrisArray = JSON.parse(redirectUris);
        document.getElementById('redirect_uris').value = redirectUrisArray.join("\n");
    } catch (e) {
        document.getElementById('redirect_uris').value = redirectUris;
    }

    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingClientId = null;
}

// Form submission for editing clients
if (document.getElementById('editClientForm')) {
    document.getElementById('editClientForm').addEventListener('submit', function(e) {
        e.preventDefault();

        if (!currentEditingClientId) {
            showToast('错误：未选择应用', 'error');
            return;
        }

        const formData = new FormData(this);

        fetch(`/oauth/clients/${currentEditingClientId}/edit`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                showToast('应用信息更新成功', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast('修改失败，请重试', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('修改失败，请重试', 'error');
        });
    });
}

// Client data management
function loadClientData(clientId) {
    const contentDiv = document.getElementById(`data-content-${clientId}`);
    contentDiv.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin"></i><p>加载中...</p></div>';

    fetch(`/api/client_data/${clientId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据失败');
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                contentDiv.innerHTML = '<div class="text-center p-3"><i class="fas fa-database"></i><p>该应用暂无用户存储数据</p></div>';
            } else {
                let html = '<table class="data-table">';
                html += '<tr><th>键名</th><th>值</th><th>类型</th><th>更新时间</th><th>操作</th></tr>';

                data.forEach(item => {
                    let valueDisplay = item.value;
                    if (typeof item.value === 'object') {
                        valueDisplay = JSON.stringify(item.value, null, 2);
                    }

                    // Truncate long values for display
                    let displayValue = valueDisplay;
                    if (displayValue && displayValue.length > 100) {
                        displayValue = displayValue.substring(0, 100) + '...';
                    }

                    html += `
                        <tr>
                            <td><strong>${escapeHtml(item.key)}</strong></td>
                            <td>
                                <div title="${escapeHtml(valueDisplay)}">
                                    <pre style="margin:0;max-width:200px;overflow:auto;background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;cursor:help;">${escapeHtml(displayValue)}</pre>
                                </div>
                            </td>
                            <td>${escapeHtml(item.type)}</td>
                            <td>${new Date(item.updated_at).toLocaleString()}</td>
                            <td>
                                <button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;"
                                        onclick="deleteDataItem('${clientId}', '${escapeHtml(item.key)}')">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += '</table>';
                contentDiv.innerHTML = html;
            }
        })
        .catch(error => {
            contentDiv.innerHTML = `<div class="text-center p-3"><i class="fas fa-exclamation-triangle"></i><p>加载失败: ${error.message}</p></div>`;
        });
}

function clearClientData(clientId) {
    confirmAction(
        '确定要清除该应用的所有用户数据吗？此操作不可撤销，所有用户存储的数据都将被删除！',
        () => {
            fetch(`/api/client_data/${clientId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || '清除数据失败') });
                }
                return response.json();
            })
            .then(data => {
                showToast(data.message || '数据清除成功', 'success');
                loadClientData(clientId);
            })
            .catch(error => {
                console.error('清除数据失败:', error);
                showToast(`清除失败: ${error.message}`, 'error');
            });
        },
        null,
        {
            title: '清除所有数据',
            confirmText: '清除',
            danger: true
        }
    );
}

function deleteDataItem(clientId, key) {
    // Encode key to prevent special character issues
    const encodedKey = encodeURIComponent(key);

    confirmAction(
        `确定要删除键 "${key}" 的数据吗？此操作不可撤销！`,
        () => {
            fetch(`/api/client_data/${clientId}/item?key=${encodedKey}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || '删除数据失败') });
                }
                return response.json();
            })
            .then(data => {
                showToast(data.message || '数据删除成功', 'success');
                loadClientData(clientId);
            })
            .catch(error => {
                console.error('删除数据项失败:', error);
                showToast(`删除失败: ${error.message}`, 'error');
            });
        },
        null,
        {
            title: '删除数据项',
            confirmText: '删除',
            danger: true
        }
    );
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Enhanced form confirmation for delete buttons
document.addEventListener('DOMContentLoaded', function() {
    // Enhance all delete forms with custom confirmation
    const deleteForms = document.querySelectorAll('form[action*="delete_oauth_client"]');
    deleteForms.forEach(form => {
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.onclick = function(e) {
                e.preventDefault();
                confirmAction(
                    '确定要删除这个应用吗？此操作不可撤销，所有相关数据都将被删除！',
                    () => {
                        form.submit();
                    },
                    null,
                    {
                        title: '删除应用',
                        confirmText: '删除',
                        danger: true
                    }
                );
                return false;
            };
        }
    });
});