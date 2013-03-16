DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NUM_WORKERS=100

START=0
END=$NUM_WORKERS

echo "" > output
for (( c=$START; c<=$END; c++ )); do
  echo "Starting worker $c"
  node ${DIR}/generate_data.js 2>&1 >> output &
done

