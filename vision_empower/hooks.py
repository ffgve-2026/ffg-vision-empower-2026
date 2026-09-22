app_name = "vision_empower"
app_title = "Vision Empower"
app_publisher = "Vision Empower"
app_description = "Vision Empower application"
app_email = "prabakaran.promothkumar@tsgforce.com"
app_license = "mit"

# Send non-GET requests for this app's endpoints as native `application/json`
# bodies instead of form-encoded, per-key JSON-stringified values.
use_json_request_body = True

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "vision_empower",
# 		"logo": "/assets/vision_empower/logo.png",
# 		"title": "Vision Empower",
# 		"route": "/vision_empower",
# 		"has_permission": "vision_empower.api.permission.has_app_permission",
# 	}
# ]

# Companion apps that extend a host app (instead of taking their own apps-screen icon) can pin
# their workspaces into the host app's workspace dock (rail) with this hook. Declaring it keeps
# the app off the apps screen, so it takes precedence over any add_to_apps_screen above. Who can
# see a pinned workspace is controlled by that workspace's own Roles table.
# add_to_workspace_dock = [
# 	{
# 		"app": "erpnext",
# 		"workspace": "My Workspace",
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/vision_empower/css/vision_empower.css"
# app_include_js = "/assets/vision_empower/js/vision_empower.js"

# include js, css files in header of web template
# web_include_css = "/assets/vision_empower/css/vision_empower.css"
# web_include_js = "/assets/vision_empower/js/vision_empower.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "vision_empower/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "vision_empower/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Setup Wizard
# ------------

# open a fresh site's setup in this app's own UI instead of the desk wizard.
# must be a non-desk route (not under /desk or /app); to customize setup within
# desk, use setup_wizard_stages / setup_wizard_complete instead.
# setup_wizard_url = "/vision_empower/setup"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "vision_empower.utils.jinja_methods",
# 	"filters": "vision_empower.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "vision_empower.install.before_install"
# after_install = "vision_empower.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "vision_empower.uninstall.before_uninstall"
# after_uninstall = "vision_empower.uninstall.after_uninstall"

# Disable / Enable
# ----------------
# Called when this app is logically disabled or re-enabled on a site,
# without uninstalling it. Use this to hide/restore fields this app adds
# to other apps' doctypes.

# before_disable = "vision_empower.uninstall.before_disable"
# after_disable = "vision_empower.uninstall.after_disable"
# before_enable = "vision_empower.install.before_enable"
# after_enable = "vision_empower.install.after_enable"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "vision_empower.utils.before_app_install"
# after_app_install = "vision_empower.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "vision_empower.utils.before_app_uninstall"
# after_app_uninstall = "vision_empower.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "vision_empower.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "vision_empower.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"vision_empower.tasks.all"
# 	],
# 	"daily": [
# 		"vision_empower.tasks.daily"
# 	],
# 	"hourly": [
# 		"vision_empower.tasks.hourly"
# 	],
# 	"weekly": [
# 		"vision_empower.tasks.weekly"
# 	],
# 	"monthly": [
# 		"vision_empower.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "vision_empower.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "vision_empower.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "vision_empower.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "vision_empower.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["vision_empower.utils.before_request"]
# after_request = ["vision_empower.utils.after_request"]

# Job Events
# ----------
# before_job = ["vision_empower.utils.before_job"]
# after_job = ["vision_empower.utils.after_job"]

# after_file_upload = ["vision_empower.utils.after_file_upload"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"vision_empower.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
export_python_type_annotations = True

# Require all whitelisted methods to have type annotations
require_type_annotated_api_methods = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Fixtures
# --------
# Roles are the source of truth for Vision Empower's RBAC and are installed
# on every bench via `bench migrate`. See vision_empower/fixtures/role.json.

fixtures = [
	{
		"doctype": "Role",
		"filters": [
			[
				"name",
				"in",
				[
					"Vision Empower Field User",
					"Vision Empower Senior Manager",
					"Vision Empower Admin",
					"Vision Empower Finance",
					"Vision Empower User",
				],
			]
		],
	}
]

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

