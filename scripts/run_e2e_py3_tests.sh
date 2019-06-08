cd e2e
echo "PWD IS" ${PWD}
docker-compose -f docker-compose-py3.yaml up --exit-code-from cypress
exit $?
