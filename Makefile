default: tags cscope

run:
				python -m src.web

dev:
				TURBO_PUDGY=1 python -m src.web
setup: install-deps setup-db
setup-db:
				RESET=1 python src/models.py

install-deps:
				pip install -r requirements.txt

tags:
				ctags-exuberant -R src/

cscope:
				pycscope -R -S src/

.PHONY: tags clean build cscope run dev
