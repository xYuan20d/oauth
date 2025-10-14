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

                    html += `
                        <tr>
                            <td><strong>${item.key}</strong></td>
                            <td><pre style="margin:0;max-width:300px;overflow:auto;background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;">${valueDisplay}</pre></td>
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
    confirmAction('确定要清除该应用的所有用户数据吗？此操作不可撤销！', () => {
        fetch(`/api/client_data/${clientId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('清除数据失败');
            }
            return response.json();
        })
        .then(data => {
            showToast(data.message || '数据清除成功', 'success');
            loadClientData(clientId);
        })
        .catch(error => {
            showToast(`清除失败: ${error.message}`, 'error');
        });
    });
}

function deleteDataItem(clientId, key) {
    confirmAction(`确定要删除键 "${key}" 的数据吗？`, () => {
        fetch(`/api/client_data/${clientId}?key=${encodeURIComponent(key)}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除数据失败');
            }
            return response.json();
        })
        .then(data => {
            showToast(data.message || '数据删除成功', 'success');
            loadClientData(clientId);
        })
        .catch(error => {
            showToast(`删除失败: ${error.message}`, 'error');
        });
    });
}