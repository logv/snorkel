from setuptools import setup

from setuptools.command.develop import develop
from setuptools.command.install import install
from subprocess import check_call


# from https://stackoverflow.com/questions/20288711/post-install-script-with-python-setuptools
class PostDevelopCommand(develop):
    """Post-installation for development mode."""
    def run(self):
        # PUT YOUR POST-INSTALL SCRIPT HERE or CALL A FUNCTION
        check_call("/usr/bin/go install github.com/logv/sybil", shell=True)
        develop.run(self)

class PostInstallCommand(install):
    """Post-installation for installation mode."""
    def run(self):
        # PUT YOUR POST-INSTALL SCRIPT HERE or CALL A FUNCTION
        check_call("/usr/bin/go install github.com/logv/sybil", shell=True)
        install.run(self)


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
        'develop': PostDevelopCommand,
        'install': PostInstallCommand,
    },
    packages=[
        'snorkel',
        'snorkel.backend',
        'snorkel.views',
        'snorkel.components',
        'snorkel.plugins.snorkel_basic_views',
        'snorkel.plugins.snorkel_advanced_views' ],
    package_dir= { "snorkel" : "src" },
    # url = 'https://github.com/logv/slite',
    # license='MIT',
    description='a data exploration UI',
    long_description=open('README.md').read(),
    install_requires=[ w.strip() for w in open('requirements.txt').readlines()]
    )

