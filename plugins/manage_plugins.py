import os

from flask import Flask
from os import path

PLUGIN_INTRODUCTION = "对插件添加管理功能"
PLUGIN_NAME = "Plugins Manager"

class Plugin:
    def __init__(self, main_globals: dict):
        self.g = main_globals
        self.app: Flask = self.g["app"]

        self.plugin_manager = self.g["plugin_manager"]
        self.plugin_dir = self.g["PLUGINS_DIR"]

        self.admin_required = self.g["admin_required"]
        self.is_admin = self.g["is_admin"]

        self.files_path = \
            path.join(path.dirname(__file__), "all_plugin_files", path.splitext(path.basename(__file__))[0])


class AdminUI(Plugin):
    def __init__(self, main_globals: dict):
        super().__init__(main_globals)

    @staticmethod
    def ui_navbar():
        return {
            "插件管理": {
                "icon": "fas fa-puzzle-piece",
                "data_tab": "plugins"
            }
        }

    def ui_tab_html(self):
        is_w = os.access(path.dirname(__file__), os.W_OK)
        javascript = """
        function uploadFile(file_path) {
            var fileInput = document.getElementById('file-upload');
            var file = fileInput.files[0];  // 获取上传的文件
        
            if (file) {
                var formData = new FormData();
                formData.append('file', file);
        
                fetch('/uploadFile?path=' + encodeURIComponent(file_path), {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    alert('文件上传成功');
                })
                .catch(error => {
                    console.error('上传失败:', error);
                });
            }
        }
        function execPythonCode(code) {
            fetch('/run_python_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'  // 设置 Content-Type 为 application/json
                },
                body: JSON.stringify({ code: code })  // 请求体内容是 JSON 格式
            })
            .then(response => response.text())  // 假设响应是文本格式
            .catch(error => console.error('Error:', error));
        }
        """
        plugin_html = ""
        for plugin_introduction, plugin_name, plugin_file_name in \
                zip(self.plugin_manager.call_plugin_method("PLUGIN_INTRODUCTION"),
                    self.plugin_manager.call_plugin_method("PLUGIN_NAME"),
                    self.plugin_manager.call_plugin_method("__file__")):
            module_name = path.splitext(path.basename(plugin_file_name))[0]
            plugin_html += f"""
            <div class="card">
                <h3>{plugin_name}</h3>
                <p>{plugin_introduction}</p>
                
                <div style="height: 20px"></div>
                <b><p>模块名: {module_name}</p></b>
                <div style="height: 30px"></div>
                <button class="add-config-btn" style="background: red;" onclick="execPythonCode('config_manager.update(\\'not_load_plugins\\', value=config_manager.get(\\'not_load_plugins\\') + \\';{module_name};\\'); plugin_manager.reload_plugins()'); alert('已停止加载; 您可能需要重部署; 您可以调整not_load_plugins配置还原')">
                    停止加载
                </button>
            </div>
            """
        plugins_html = f"""
        <h3><i class="fas fa-puzzle-piece"></i> 网站插件管理</h3>
        <p>如果您想要禁用插件, 请调整<code>not_load_plugins</code>配置</p>
        {"<b><p style=\"color: red;\">对于vercel(只读)，请手动在存储库下的插件目录下添加插件脚本</p></b>" if not is_w else ""}
        <div style="height: 20px"></div>
        <button class="add-config-btn" onclick="document.getElementById('file-upload').click();" {"" if is_w else "disabled"}>
            <i class="fas fa-plus"></i> 添加插件
        </button>
        <input type="file" id="file-upload" style="display:none;" onchange="uploadFile('{path.dirname(__file__)}')">
        <div style="height: 10px;"></div>
        {plugin_html}
        <script>
        {javascript}
        </script>
        """
        return {
            "plugins": plugins_html
        }
