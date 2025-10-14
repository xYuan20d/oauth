class AvatarUploader {
    constructor() {
        this.modal = document.getElementById('avatar-modal');
        this.cropper = null;
        this.currentFile = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 上传按钮点击事件
        const uploadBtn = document.getElementById('avatar-upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('avatar-file-input').click();
            });
        }

        // 文件选择事件
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // 移除头像按钮
        const removeBtn = document.getElementById('remove-avatar-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeAvatar();
            });
        }

        // 模态框关闭按钮
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // 模态框外部点击关闭
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // 裁剪确认按钮
        const confirmBtn = document.getElementById('confirm-crop-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmCrop();
            });
        }

        // 取消按钮
        const cancelBtn = document.getElementById('cancel-crop-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this.showAlert('请选择图片文件', 'error');
            return;
        }

        // 验证文件大小（4MB）
        if (file.size > 4 * 1024 * 1024) {
            this.showAlert('图片大小不能超过4MB', 'error');
            return;
        }

        this.currentFile = file;
        this.showCropModal(file);
    }

    showCropModal(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const image = document.getElementById('crop-image');
            image.src = e.target.result;

            this.modal.classList.add('active');

            // 初始化Cropper
            setTimeout(() => {
                this.initCropper(image);
            }, 100);
        };

        reader.readAsDataURL(file);
    }

    initCropper(image) {
        if (this.cropper) {
            this.cropper.destroy();
        }

        this.cropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 0.8,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            background: false, // 禁用默认背景
            modal: true, // 启用模态模式
            dragMode: 'move', // 默认拖动模式为移动
            cropBoxData: {
                width: 200,
                height: 200
            }
        });
    }

    confirmCrop() {
        if (!this.cropper) return;

        this.showLoading(true);

        // 获取裁剪后的canvas
        const canvas = this.cropper.getCroppedCanvas({
            width: 200,
            height: 200,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        // 转换为base64
        const base64Data = canvas.toDataURL('image/jpeg', 0.8);

        // 上传到服务器
        this.uploadAvatar(base64Data);
    }

    async uploadAvatar(avatarData) {
        try {
            const response = await fetch('/api/upload_avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    avatar: avatarData
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('头像更新成功', 'success');
                this.updateAvatarPreview(avatarData);
                this.triggerAvatarUpdate(avatarData); // 触发侧边栏更新
                this.closeModal();
            } else {
                this.showAlert(result.error || '上传失败', 'error');
            }
        } catch (error) {
            this.showAlert('网络错误，请重试', 'error');
            console.error('Upload error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async removeAvatar() {
        if (!confirm('确定要移除头像吗？')) {
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/remove_avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('头像已移除', 'success');
                this.updateAvatarPreview(null);
                this.triggerAvatarRemove(); // 触发侧边栏更新
            } else {
                this.showAlert(result.error || '移除失败', 'error');
            }
        } catch (error) {
            this.showAlert('网络错误，请重试', 'error');
            console.error('Remove error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    updateAvatarPreview(avatarData) {
        const preview = document.getElementById('avatar-preview');
        const defaultAvatar = document.getElementById('default-avatar');
        const removeBtn = document.getElementById('remove-avatar-btn');

        if (avatarData) {
            preview.innerHTML = `<img src="${avatarData}" alt="用户头像">`;
            removeBtn.disabled = false;
        } else {
            preview.innerHTML = '<div class="default-avatar"><i class="fas fa-user"></i></div>';
            removeBtn.disabled = true;
        }
    }

    closeModal() {
        this.modal.classList.remove('active');
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // 清空文件输入
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    showLoading(show) {
        const loading = document.getElementById('avatar-loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    showAlert(message, type) {
        // 使用settings.js中的alert函数或创建新的
        const alertDiv = document.getElementById('profile-alert');
        if (alertDiv) {
            alertDiv.innerHTML = `
                <div class="alert alert-${type}">
                    <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                    ${message}
                </div>
            `;

            setTimeout(() => {
                alertDiv.innerHTML = '';
            }, 5000);
        }
    }

    // 新增：触发头像更新事件
    triggerAvatarUpdate(avatarUrl) {
        const event = new CustomEvent('avatarUpdated', {
            detail: { avatarUrl: avatarUrl }
        });
        document.dispatchEvent(event);
    }

    // 新增：触发头像移除事件
    triggerAvatarRemove() {
        const event = new CustomEvent('avatarRemoved');
        document.dispatchEvent(event);
    }
}

// 初始化头像上传器
document.addEventListener('DOMContentLoaded', function() {
    new AvatarUploader();
});