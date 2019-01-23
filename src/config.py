# LOAD CONFIGS
import os

CFG_DIR = os.path.join(os.path.dirname(__file__), '..', 'config')

with open(os.path.join(CFG_DIR, "default.py")) as f:
    exec(f.read())
    

if "ENV" in os.environ:
    print " * Loading settings from", os.environ["ENV"]
    with open(os.path.join(CFG_DIR, os.environ["ENV"])) as f:
        exec(f.read())
