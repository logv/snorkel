import setuptools

from setuptools import setup

from setuptools.command.build_py import build_py
from setuptools.command.develop import develop
from setuptools.command.install import install
from subprocess import check_call

import os
import shutil

# this builds and installs sybil into the package
class BuildSybilCommand(build_py):
    def run(self):
        gopath = "build/go"
        os.environ["GOPATH"] = os.path.abspath("build/go")
        check_call("/usr/bin/go get -ldflags='-s -w' github.com/logv/sybil", shell=True)

        try:
            os.makedirs("src/backend/bin/")
        except:
            pass
        shutil.copy("build/go/bin/sybil", "src/backend/bin/")

        build_py.run(self)

# TODO: fix permissions for msybil.py and msybil_ingest.py
# from https://stackoverflow.com/questions/20288711/post-install-script-with-python-setuptools
class PostInstallCommand(install):
    """Post-installation for installation mode."""
    def run(self):
        install.run(self)
        for fn in self.get_outputs():
            if fn.find("msybil"):
                # copied from distutils source - make the binaries executable
                mode = ((os.stat(fn).st_mode) | 0o555) & 0o7777
                os.chmod(fn, mode)



try:
    # python2
    execfile('src/version.py')
except NameError as e:
    # python3
    eval('exec(open("./src/version.py").read())')

setup(
    name='snorkel-lite',
    version=__version__,
    author='okay',
    author_email='okayzed+slite@gmail.com',
    include_package_data=True,
    cmdclass={
        'build_py': BuildSybilCommand,
        'install' : PostInstallCommand
    },
    packages=[
        'snorkel',
        'snorkel.backend',
        'snorkel.config',
        'snorkel.views',
        'snorkel.components',
        'snorkel.plugins',
        'snorkel.plugins.snorkel_basic_views',
        'snorkel.plugins.snorkel_advanced_views' ],
    package_dir= { "snorkel" : "src" },
    entry_points = {
        'flask.commands': [
            'add_user=snorkel.cli:add_user',
            'add_superuser=snorkel.cli:add_superuser',
            'get_auth_token=snorkel.cli:get_user_token',
        ],
        'console_scripts': [
            'snorkel.msybil=snorkel.backend.msybil:main',
            'snorkel.msybil_ingest=snorkel.backend.msybil_ingest:main'
        ],

    },

    # url = 'https://github.com/logv/slite',
    # license='MIT',
    description='a data exploration UI',
    long_description=open('README.md').read(),
    install_requires=[ w.strip() for w in open('requirements.txt').readlines()]
    )

