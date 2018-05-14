.PHONY:  all clean image run-image

all:
	cd snorkel && npm install && cd ..

clean:
	cd snorkel && rm -rf node_modules && cd ..

image:
	docker build -t snorkel .

run-image:
	docker run --rm -p 3000:3000 -p 59036:59036/udp -ti snorkel
