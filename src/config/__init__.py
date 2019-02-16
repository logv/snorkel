from __future__ import print_function
# LOAD CONFIGS
import os

CFG_DIR = "config/"

from .default import *

if "ENV" in os.environ:
    print(" * Loading settings from", os.environ["ENV"])
    with open(os.path.join(CFG_DIR, os.environ["ENV"])) as f:
        exec(f.read())
