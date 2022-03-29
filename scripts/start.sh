if [[ $UID != 0 ]]; then
    echo "Tipi must be started as root"
    echo "Please re-run this script as"
    echo "  sudo ./scripts/start"
    exit 1
fi