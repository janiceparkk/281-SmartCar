# 1. Install Python 3.7 and its virtual environment package
sudo apt update
sudo apt install python3.7 python3.7-venv

# 2. Navigate to the CARLA Python client directory
cd ~/carla/PythonAPI/carla/dist

# 3. Create a new virtual environment using Python 3.7
python3.7 -m venv carla_venv_37

# 4. Activate the virtual environment
source carla_venv_37/bin/activate

# 5. Install the CARLA Python client wheel (compatible with Python 3.7) note that this is inside the  ~/carla/PythonAPI/carla/dist
pip install carla-0.9.15-cp37-cp37m-manylinux_2_27_x86_64.whl

#  6. this is needed for some carla packages to be installed
cd ~/carla/PythonAPI/examples

source ../carla/dist/carla_venv_37/bin/activate

pip install -r requirement.txt

