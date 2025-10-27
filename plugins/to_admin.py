from os import path
from flask import Flask, url_for

PLUGIN_INTRODUCTION = "Main Dashboard Admin Button"
PLUGIN_NAME = "对主面板添加了前往admin按钮(仅admin账户可见)"


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

class SideBar(Plugin):
    def __init__(self, main_globals: dict):
        super().__init__(main_globals)

    def ui_button(self):
        buttons = {}
        if self.is_admin():
            buttons["前往管理员后台"] = {
                "url": url_for("admin_dashboard"),
                "icon": "fas fa-user-shield"
            }

        return buttons