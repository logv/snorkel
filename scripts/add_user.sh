EXPECTED_ARGS=1

if [ $# -ne $EXPECTED_ARGS ]; then
  echo "Usage: ./$0 <user>"
  exit
fi

# WE NEED THE HTPASSWD COMMAND
htpasswd -s -c config/users.htpasswd $1
