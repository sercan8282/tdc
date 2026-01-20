#!/bin/bash

################################################################################
# Setup Systemd Service for TurkDostClan
# Run this script once to install and enable the Gunicorn service
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE_NAME="turkdostclan"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_DIR="/var/www/turkdostclan"

echo -e "${YELLOW}Setting up systemd service for TurkDostClan...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo ./setup_service.sh)${NC}"
    exit 1
fi

# Check if service file exists in repo
if [ ! -f "${APP_DIR}/turkdostclan.service" ]; then
    echo -e "${RED}Service file not found: ${APP_DIR}/turkdostclan.service${NC}"
    exit 1
fi

# Stop existing Gunicorn processes
echo -e "${YELLOW}Stopping any existing Gunicorn processes...${NC}"
pkill -f gunicorn || true

# Copy service file
echo -e "${YELLOW}Installing service file...${NC}"
cp "${APP_DIR}/turkdostclan.service" "$SERVICE_FILE"

# Reload systemd daemon
echo -e "${YELLOW}Reloading systemd daemon...${NC}"
systemctl daemon-reload

# Enable service (start on boot)
echo -e "${YELLOW}Enabling service to start on boot...${NC}"
systemctl enable "$SERVICE_NAME"

# Start service
echo -e "${YELLOW}Starting service...${NC}"
systemctl start "$SERVICE_NAME"

# Check status
sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✓ Service is running!${NC}"
    systemctl status "$SERVICE_NAME" --no-pager
else
    echo -e "${RED}✗ Service failed to start. Check logs:${NC}"
    journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Systemd service setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "The service will now:"
echo -e "  • Start automatically on server reboot"
echo -e "  • Restart automatically if it crashes"
echo -e "  • Be managed via systemctl commands"
echo ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}sudo systemctl status ${SERVICE_NAME}${NC}  - Check status"
echo -e "  ${YELLOW}sudo systemctl restart ${SERVICE_NAME}${NC} - Restart service"
echo -e "  ${YELLOW}sudo systemctl stop ${SERVICE_NAME}${NC}    - Stop service"
echo -e "  ${YELLOW}sudo journalctl -u ${SERVICE_NAME} -f${NC}  - View live logs"
