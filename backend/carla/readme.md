## This only works on ubuntu

## Run installCarla.sh first.

which contains:

```bash
curl -L -o CARLA_0.9.15.tar.gz https://tiny.carla.org/carla-0-9-15-linux
tar -xvzf CARLA_0.9.15.tar.gz
```

## Might be a good idea to run them on ur home dir instead of here inside the project

## After it is installed, you can run

```bash

#  note that should run the installCarla.sh b4 running this.
./CarlaUE4.sh -windowed -ResX=1280 -ResY=720
#  lower resolution for not laggy
# ./CarlaUE4.sh -quality-level=Low -windowed -ResX=800 -ResY=600
```

## inside the folder where you installed the carla. CarlaUE4.sh is from Carla official within their zipped file.

## Then you can run the

```bash
./installPyReqnRunController.sh
```

## which will do all needed step like install py 3.7, create venv, install requirement.txt inside venv.

## Then u can just run

```bash
./runControlelr.sh
```

## to see the car and controll the car. Note that

```bash

#  note that should run the installCarla.sh b4 running this.
./CarlaUE4.sh -windowed -ResX=1280 -ResY=720
#  lower resolution for not laggy
# ./CarlaUE4.sh -quality-level=Low -windowed -ResX=800 -ResY=600
```

## must be running b4 you run the controller.

## This is just how to configure carla, still need to find out how to import audio files and things.

## Adjust the directory based on where u install carla accordingly.
