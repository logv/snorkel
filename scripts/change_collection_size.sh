DATABASE="snorkel"
PREFIX="datasets/"

EXPECTED_ARGS=2


if [ $# -ne $EXPECTED_ARGS ]; then
  echo "Usage: ./$0 'dataset/subset' <size_in_bytes>"
  exit
fi

COLLECTION=$1
SIZE_IN_MB=$2
SIZE_IN_BYTES=$((${SIZE_IN_MB} * 1024 * 1024))
DB_NAME="${PREFIX}${COLLECTION}"

echo "Enlargening ${COLLECTION} to size ${SIZE_IN_MB}MB";
mongo << EOM

  show dbs;
  use ${DATABASE};
  db['$DB_NAME'].stats();
  print("Converting ${DB_NAME}");
  db.runCommand({convertToCapped: "${DB_NAME}", size: ${SIZE_IN_BYTES}, max: ${SIZE_IN_BYTES}});
  print("Finished converting DB");
  db['$DB_NAME'].stats();

EOM
