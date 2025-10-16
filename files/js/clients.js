// Clients management functionality

let currentEditingClientId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize client management functionality
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

                    // 截断过长的值显示
                    let displayValue = valueDisplay;
                    if (displayValue && displayValue.length > 100) {
                        displayValue = displayValue.substring(0, 100) + '...';
                    }

                    html += `
                        <tr>
                            <td><strong>${item.key}</strong></td>
                            <td>
                                <div title="${valueDisplay}">
                                    <pre style="margin:0;max-width:200px;overflow:auto;background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;cursor:help;">${displayValue}</pre>
                                </div>
                            </td>
                            <td>${item.type}</td>
                            <td>${new Date(item.updated_at).toLocaleString()}</td>
                            <td>
                                <button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;"
                                        onclick="deleteDataItem('${clientId}', '${item.key}')">
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
    confirmAction('确定要清除该应用的所有用户数据吗？此操作不可撤销，所有用户存储的数据都将被删除！', () => {
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
    });
}


function deleteDataItem(clientId, key) {
    // 对键进行编码，防止特殊字符问题
    const encodedKey = encodeURIComponent(key);

    confirmAction(`确定要删除键 "${key}" 的数据吗？此操作不可撤销！`, () => {
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
    });
}

function confirmAction(message, callback) {
    // 创建自定义确认对话框
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
            width: 90%;
            color: black;
            text-align: center;
        ">
            <h3 style="color: #e74c3c; margin-bottom: 15px;">
                <i class="fas fa-exclamation-triangle"></i> 确认操作
            </h3>
            <p style="margin-bottom: 25px; line-height: 1.5;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirmCancel" style="
                    padding: 10px 20px;
                    background: #95a5a6;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">取消</button>
                <button id="confirmOk" style="
                    padding: 10px 20px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">确认删除</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 绑定事件
    document.getElementById('confirmCancel').onclick = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('confirmOk').onclick = () => {
        document.body.removeChild(modal);
        callback();
    };

    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}
