FAIL=0
bash scripts/run_controller_tests.sh || FAIL=1
bash scripts/run_component_tests.sh || FAIL=1
bash scripts/run_unit_tests.sh || FAIL=1
bash scripts/run_client_tests.sh || FAIL=1
exit $FAIL
