# TDC Installation & Update Scripts

## 📦 Installation Script

Het `install.sh` script installeert de volledige TDC applicatie op een Linux server.

### Vereisten

- Ubuntu/Debian Linux server
- Root toegang (sudo)
- Git, Python 3, Node.js, nginx geïnstalleerd

### Gebruik

```bash
sudo bash install.sh
```

### Wat doet het script?

1. **Checks prerequisites** - Controleert of alle vereiste software is geïnstalleerd
2. **Vraagt configuratie** - Interactief:
   - Applicatie naam (map naam onder /var/www/)
   - Git repository URL (standaard: https://github.com/sercan8282/tdc)
   - Domein naam (bijv. example.com)
   - Database naam
   - Service account gebruikersnaam en wachtwoord
   - SSL certificaat (via Certbot)?
   
3. **Maakt service account aan** - Dedicated user voor de applicatie
4. **Cloned repository** - Naar /var/www/[app-naam]
5. **Setup backend**:
   - Python virtual environment
   - Installeert dependencies
   - Maakt .env bestand aan met secret keys
   - Voert database migraties uit
   - Maakt superuser aan (admin@[domein], wachtwoord: ChangeMe123!@#)
   - Verzamelt static files
   
6. **Setup frontend**:
   - Installeert Node.js dependencies
   - Maakt productie .env aan
   - Build frontend
   
7. **Configureert nginx**:
   - Maakt site configuratie aan
   - Test configuratie
   - Reload nginx
   
8. **SSL certificaat** (optioneel):
   - Haalt Let's Encrypt certificaat op via Certbot
   - Configureert auto-renewal (dagelijks om 3 uur 's nachts)

9. **Firewall (UFW)**:
   - Installeert UFW indien niet aanwezig
   - Blokkeert alle inkomende verbindingen (standaard)
   - Staat SSH (22), HTTP (80), HTTPS (443) toe
   - Rate limiting op SSH tegen brute force attacks

10. **Scheduled tasks (cron jobs)**:
    - Message cleanup (elk uur) - verwijdert gelezen berichten na 24 uur
    - SSL certificate renewal (dagelijks)
   
11. **Systemd service**:
    - Maakt service file aan
    - Installeert gunicorn
    - Start applicatie als service
   
12. **Zet permissies**:
    - Ownership naar service account
    - Correcte directory/file permissions
    - Beveiligt .env bestand

### Eerste Login

Na installatie:
- URL: https://[jouw-domein]
- Email: admin@[jouw-domein]
- Wachtwoord: ChangeMe123!@#
- **⚠️ WIJZIG WACHTWOORD ONMIDDELLIJK!**

---

## 🔄 Update Script

Het `update.sh` script update de applicatie autonoom naar de laatste versie.

### Gebruik

```bash
# Als service user
bash /var/www/[app-naam]/update.sh

# Of als root (vraagt om service user wachtwoord)
sudo bash /var/www/[app-naam]/update.sh
```

### Wat doet het script?

1. **User check** - Als root draait, switch naar service user
2. **Laadt environment** - Leest .env variabelen
3. **Git status check**:
   - Controleert voor uncommitted changes (stashed automatisch)
   - Fetcht latest changes
   - Checkt of updates beschikbaar zijn
   
4. **Stopt service** - Graceful shutdown
5. **Pullt changes** - Van origin/[branch]
6. **Update backend**:
   - Upgrade pip
   - Update Python dependencies
   - **Voert migraties uit (ZONDER data te verwijderen)**
   - Verzamelt static files
   
7. **Update frontend**:
   - Herinstalleer dependencies (als package.json changed)
   - Rebuild productie versie
   
8. **Cleanup**:
   - Python cache
   - Oude logs (>30 dagen)
   
9. **Start service** - Start applicatie opnieuw
10. **Health check** - Controleert of applicatie draait
11. **Rapport** - Toont update samenvatting

### Features

- ✅ **Autonoom** - Geen handmatige interventie nodig
- ✅ **Veilig** - Data wordt NOOIT verwijderd
- ✅ **Service account** - Draait onder dedicated user
- ✅ **Auto-stash** - Lokale wijzigingen worden automatisch gestashed
- ✅ **Health check** - Verifieert dat update gelukt is
- ✅ **Interactief** - Mooie icons en status updates

---

## 🔐 Service Account

Beide scripts gebruiken een dedicated service account voor beveiliging:

- **Installatie**: Vraagt om service account naam en wachtwoord
- **Rechten**: Alleen toegang tot applicatie directory
- **Update**: Als root uitgevoerd, vraagt om service user wachtwoord

### Sudoers Configuratie (aanbevolen)

Om het update script zonder wachtwoord te kunnen draaien:

```bash
# Voeg toe aan /etc/sudoers.d/tdc
[service-user] ALL=(ALL) NOPASSWD: /bin/systemctl start [app-name].service
[service-user] ALL=(ALL) NOPASSWD: /bin/systemctl stop [app-name].service
[service-user] ALL=(ALL) NOPASSWD: /bin/systemctl restart [app-name].service
[service-user] ALL=(ALL) NOPASSWD: /bin/systemctl status [app-name].service
[service-user] ALL=(ALL) NOPASSWD: /bin/systemctl is-active [app-name].service
```

---

## 📋 Handige Commando's

### Service Management
```bash
# Status
sudo systemctl status [app-name].service

# Start
sudo systemctl start [app-name].service

# Stop
sudo systemctl stop [app-name].service

# Restart
sudo systemctl restart [app-name].service

# Logs (real-time)
journalctl -u [app-name].service -f
```

### Manual Updates
```bash
# Als service user
cd /var/www/[app-name]
source venv/bin/activate
git pull
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

# Rebuild frontend
cd frontend
npm install
npm run build

# Restart
sudo systemctl restart [app-name].service
```

---

## 🛡️ Beveiliging

- ✅ Dedicated service account met minimale rechten
- ✅ .env bestand met 600 permissions
- ✅ Secret keys automatisch gegenereerd
- ✅ SSL certificaat via Let's Encrypt
- ✅ Auto-renewal van certificaten
- ✅ Nginx reverse proxy
- ✅ Gunicorn WSGI server

---

## 📁 Bestandsstructuur na Installatie

```
/var/www/[app-name]/
├── venv/                    # Python virtual environment
├── .env                     # Environment variabelen (600 permissions)
├── .git/                    # Git repository
├── manage.py
├── db.sqlite3              # Database
├── requirements.txt
├── install.sh              # Installatie script
├── update.sh               # Update script
├── staticfiles/            # Collected static files
├── media/                  # Uploaded media files
├── frontend/
│   ├── dist/              # Production build
│   ├── node_modules/
│   └── ...
├── core/
├── users/
├── api/
├── forum/
└── warzone_loadout/
```

---

## 🆘 Troubleshooting

### Service start niet
```bash
# Check logs
journalctl -u [app-name].service -n 50

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check permissions
ls -la /var/www/[app-name]
```

### Database errors na update
```bash
# Voer migraties opnieuw uit
cd /var/www/[app-name]
source venv/bin/activate
python manage.py migrate
deactivate
sudo systemctl restart [app-name].service
```

### Frontend wijzigingen niet zichtbaar
```bash
# Rebuild frontend
cd /var/www/[app-name]/frontend
npm run build
sudo systemctl restart [app-name].service

# Clear browser cache
# Hard refresh: Ctrl+Shift+R
```

### SSL certificaat problemen
```bash
# Hernieuw certificaat handmatig
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 📞 Support

Voor problemen of vragen, check:
- Application logs: `journalctl -u [app-name].service -f`
- Nginx logs: `/var/log/nginx/error.log`
- System logs: `journalctl -xe`
