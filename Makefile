.PHONY:  all clean image run-image run-image-tour

all:
	cd snorkel && npm install && cd ..

clean:
	cd snorkel && rm -rf node_modules && cd ..

image:
	docker build -t snorkel .

run-image:
	docker run \
		--rm \
		-e DATA_DIR=/var/data_dir \
		-v $(shell pwd)/data_dir:/var/data_dir \
		-p 3000:3000 \
		-p 59036:59036/udp \
		-ti \
		snorkel

run-image-tour:
	docker run \
		--rm \
		-e SHOW_TOUR=true \
		-e UPLOAD_CSV=true \
		-e DATA_DIR=/var/data_dir \
		-v $(shell pwd)/data_dir:/var/data_dir \
		-p 3000:3000 \
		-p 59036:59036/udp \
		-ti \
		snorkel
