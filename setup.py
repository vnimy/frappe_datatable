from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in frappe_datatable/__init__.py
from frappe_datatable import __version__ as version

setup(
	name="frappe_datatable",
	version=version,
	description="Datatable扩展",
	author="杨嘉祥",
	author_email="vnimy@live.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
