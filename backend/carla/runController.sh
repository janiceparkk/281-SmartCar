# might want to use this as the carla_bridge.py is in this folder
# might want to do pip install carla-0.9.15-cp37-cp37m-manylinux_2_27_x86_64.whl first if not done already
source carla_venv_37/bin/activate

pip install -r requirements.txt

python3 carla_bridge.py