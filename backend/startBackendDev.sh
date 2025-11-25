python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install numpy torch librosa soundfile scipy numba

npm install 
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
echo fs.inotify.max_user_instances=1024 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

nodemon server.js
