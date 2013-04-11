.PHONY:  all clean

all:
	cd snorkel && npm install && cd ..

clean:
	cd snorkel && rm -rf node_modules && cd ..
