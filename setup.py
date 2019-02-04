from setuptools import setup

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
    entry_points= {
        'console_scripts' : [
            'snorkel.msybil = snorkel.backend.msybil:main'
        ]
    },
    install_requires=[ w.strip() for w in open('requirements.txt').readlines()]
    )

